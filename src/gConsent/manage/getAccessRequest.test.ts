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
import { fetch } from "@inrupt/universal-fetch";
import { getAccessRequest } from "./getAccessRequest";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";
import type { getSessionFetch } from "../../common/util/getSessionFetch";

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
    ).getVerifiableCredential.mockResolvedValueOnce(accessGrantVc);
    await expect(getAccessRequest("https://some.vc")).rejects.toThrow();
  });

  it("normalizes equivalent JSON-LD VCs", async () => {
    const normalizedAccessRequest = accessRequestVc;
    // The server returns an equivalent JSON-LD with a different frame:
    (
      VcModule as jest.Mocked<typeof VcModule>
    ).getVerifiableCredential.mockResolvedValueOnce({
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
    } as any);
    const accessRequest = await getAccessRequest("https://some.vc");
    expect(accessRequest).toStrictEqual(accessRequestVc);
  });
});
