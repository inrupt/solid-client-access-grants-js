//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { describe, it, jest, expect, beforeEach } from "@jest/globals";
import * as VcModule from "@inrupt/solid-client-vc";
import { isomorphic } from "rdf-isomorphic";
import { getAccessRequest } from "./getAccessRequest";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";
import type { getSessionFetch } from "../../common/util/getSessionFetch";
import { normalizeAccessRequest } from "../request/issueAccessRequest";
import { toBeEqual, withoutDataset } from "../util/toBeEqual.mock";

jest.mock("../../common/util/getSessionFetch");
jest.mock("@inrupt/solid-client-vc", () => {
  const vcModule = jest.requireActual("@inrupt/solid-client-vc") as jest.Mocked<
    typeof VcModule
  >;
  return {
    ...vcModule,
    getVerifiableCredential: jest.fn(),
  };
});

describe("getAccessRequest", () => {
  let mockedFetch: jest.MockedFunction<typeof fetch>;
  let embeddedFetch: jest.Mocked<{ getSessionFetch: typeof getSessionFetch }>;
  let accessRequestVc: Awaited<ReturnType<typeof mockAccessRequestVc>>;
  let accessGrantVc: Awaited<ReturnType<typeof mockAccessGrantVc>>;

  beforeEach(async () => {
    mockedFetch = jest.fn(fetch);
    embeddedFetch = jest.requireMock("../../common/util/getSessionFetch");
    embeddedFetch.getSessionFetch.mockResolvedValueOnce(mockedFetch);
    accessRequestVc = await mockAccessRequestVc();
    accessGrantVc = await mockAccessGrantVc();
    (
      VcModule as jest.Mocked<typeof VcModule>
    ).getVerifiableCredential.mockResolvedValue(accessRequestVc);
  });

  it("uses the default fetch if none is provided", async () => {
    await getAccessRequest("https://some.vc");
    expect(
      (VcModule as jest.Mocked<typeof VcModule>).getVerifiableCredential,
    ).toHaveBeenCalledWith("https://some.vc", {
      fetch: mockedFetch,
      normalize: normalizeAccessRequest,
    });
  });

  it("uses the default fetch if none is provided [returnLegacyJsonld: false]", async () => {
    await getAccessRequest("https://some.vc", {
      returnLegacyJsonld: false,
    });
    expect(
      (VcModule as jest.Mocked<typeof VcModule>).getVerifiableCredential,
    ).toHaveBeenCalledWith("https://some.vc", {
      fetch: mockedFetch,
      returnLegacyJsonld: false,
    });
  });

  it("uses the provided fetch if any", async () => {
    await getAccessRequest("https://some.vc", {
      fetch: mockedFetch,
    });
    expect(
      (VcModule as jest.Mocked<typeof VcModule>).getVerifiableCredential,
    ).toHaveBeenCalledWith("https://some.vc", {
      fetch: mockedFetch,
      normalize: normalizeAccessRequest,
    });
  });

  it("uses the provided fetch if any [returnLegacyJsonld: false]", async () => {
    await getAccessRequest("https://some.vc", {
      fetch: mockedFetch,
      returnLegacyJsonld: false,
    });
    expect(
      (VcModule as jest.Mocked<typeof VcModule>).getVerifiableCredential,
    ).toHaveBeenCalledWith("https://some.vc", {
      fetch: mockedFetch,
      returnLegacyJsonld: false,
    });
  });

  it("returns the fetched VC and the redirect URL", async () => {
    // Check that both URL strings and objects are supported.
    const accessRequestFromString = await getAccessRequest("https://some.vc");
    const accessRequestFromUrl = await getAccessRequest(
      new URL("https://some.vc"),
    );

    expect(accessRequestFromString).toStrictEqual(accessRequestFromUrl);
    expect(accessRequestFromString).toStrictEqual(accessRequestVc);
  });

  it("throws if the fetched VC is not an Access Request", async () => {
    (
      VcModule as jest.Mocked<typeof VcModule>
    ).getVerifiableCredential.mockResolvedValue(accessGrantVc);
    await expect(getAccessRequest("https://some.vc")).rejects.toThrow();
    await expect(
      getAccessRequest("https://some.vc", {
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow();
  });

  it("normalizes equivalent JSON-LD VCs", async () => {
    const normalizedAccessRequest = accessRequestVc;
    const vc = {
      ...normalizedAccessRequest,
      credentialSubject: {
        ...normalizedAccessRequest.credentialSubject,
        hasConsent: {
          ...normalizedAccessRequest.credentialSubject.hasConsent,
          // The 1-value array is replaced by the literal value.
          forPersonalData:
            normalizedAccessRequest.credentialSubject.hasConsent
              .forPersonalData[0],
          mode: normalizedAccessRequest.credentialSubject.hasConsent.mode[0],
        },
      },
    };
    // The server returns an equivalent JSON-LD with a different frame:
    (
      VcModule as jest.Mocked<typeof VcModule>
    ).getVerifiableCredential.mockImplementation(
      async (_, opts) =>
        VcModule.verifiableCredentialToDataset<VcModule.VerifiableCredentialBase>(
          opts && "normalize" in opts && opts.normalize
            ? opts.normalize(
                withoutDataset(vc) as unknown as VcModule.VerifiableCredential,
              )
            : (withoutDataset(
                vc as unknown as VcModule.VerifiableCredential,
              ) as VcModule.VerifiableCredential),
          { includeVcProperties: opts?.returnLegacyJsonld !== false },
          // This is a lie because it will not contain VC properties when opts?.returnLegacyJsonld is false
          // but we need to do it to keep typescript happy with the current overloading we have
        ) as Promise<VcModule.VerifiableCredential>,
    );

    const accessRequest = await getAccessRequest("https://some.vc");
    const accessRequestNoProperties = await getAccessRequest(
      "https://some.vc",
      {
        returnLegacyJsonld: false,
      },
    );
    toBeEqual(accessRequest, accessRequestVc);
    expect(isomorphic([...accessRequest], [...accessRequestNoProperties])).toBe(
      true,
    );

    expect(accessRequest.credentialSubject.hasConsent.forPersonalData).toEqual([
      "https://some.resource",
    ]);

    // @ts-expect-error the credential subject should not be available on the new RDFJS API
    expect(accessRequestNoProperties.credentialSubject).toBeUndefined();
  });
});
