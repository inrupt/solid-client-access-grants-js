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

import { describe, it, jest, expect, beforeAll } from "@jest/globals";
import type {
  VerifiableCredential,
  getVerifiableCredential,
} from "@inrupt/solid-client-vc";
import { getAccessGrantFromRedirectUrl } from "./getAccessGrantFromRedirectUrl";
import type { getSessionFetch } from "../../common/util/getSessionFetch";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";
import { normalizeAccessGrant } from "../manage/approveAccessRequest";

jest.mock("../../common/util/getSessionFetch");
jest.mock("@inrupt/solid-client-vc", () => {
  // TypeScript can't infer the type of modules imported via Jest;
  // skip type checking for those:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vcModule = jest.requireActual("@inrupt/solid-client-vc") as any;
  return {
    ...vcModule,
    getVerifiableCredential: jest.fn(),
  };
});

describe("getAccessGrantFromRedirectUrl", () => {
  let accessRequestVc: Awaited<ReturnType<typeof mockAccessRequestVc>>;
  let accessGrantVc: Awaited<ReturnType<typeof mockAccessGrantVc>>;

  beforeAll(async () => {
    accessRequestVc = await mockAccessRequestVc();
    accessGrantVc = await mockAccessGrantVc();
  });

  it("throws if the accessGrant query parameter is missing", async () => {
    await expect(
      getAccessGrantFromRedirectUrl("https://redirect.url"),
    ).rejects.toThrow(/https:\/\/redirect.url.*accessGrant/);
  });

  it("uses the default fetch if none is provided", async () => {
    const mockedFetch = jest.fn(fetch);
    const embeddedFetch = jest.requireMock(
      "../../common/util/getSessionFetch",
    ) as jest.Mocked<{ getSessionFetch: typeof getSessionFetch }>;
    embeddedFetch.getSessionFetch.mockResolvedValueOnce(mockedFetch);

    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(
      normalizeAccessGrant(accessGrantVc),
    );

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc"),
    );

    await getAccessGrantFromRedirectUrl(redirectUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
        normalize: normalizeAccessGrant,
      },
    );
  });

  it("uses the provided fetch if any", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(
      normalizeAccessGrant(accessGrantVc),
    );

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc"),
    );

    const mockedFetch = jest.fn(fetch);
    await getAccessGrantFromRedirectUrl(redirectUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
        normalize: normalizeAccessGrant,
      },
    );
  });

  it("returns the fetched VC", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(
      normalizeAccessGrant(accessGrantVc),
    );

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc"),
    );

    const fetchedVc = await getAccessGrantFromRedirectUrl(redirectUrl);
    expect(fetchedVc).toStrictEqual(accessGrantVc);
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: undefined,
        normalize: normalizeAccessGrant,
      },
    );
  });

  it("normalizes equivalent JSON-LD VCs", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    const normalizedAccessGrant = accessGrantVc;
    // The server returns an equivalent JSON-LD with a different frame:
    vcModule.getVerifiableCredential.mockResolvedValueOnce(
      normalizeAccessGrant({
        ...normalizedAccessGrant,
        credentialSubject: {
          ...normalizedAccessGrant.credentialSubject,
          providedConsent: {
            ...normalizedAccessGrant.credentialSubject.providedConsent,
            // The 1-value array is replaced by the literal value.
            forPersonalData:
              normalizedAccessGrant.credentialSubject.providedConsent
                .forPersonalData[0],
            mode: normalizedAccessGrant.credentialSubject.providedConsent
              .mode[0],
          },
        },
      }) as VerifiableCredential,
    );

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc"),
    );

    const fetchedVc = await getAccessGrantFromRedirectUrl(redirectUrl);
    expect(fetchedVc).toStrictEqual(accessGrantVc);
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: undefined,
        normalize: normalizeAccessGrant,
      },
    );
  });

  it("throws if the fetched VC is not an Access Grant", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(accessRequestVc);

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc"),
    );

    await expect(
      getAccessGrantFromRedirectUrl(redirectUrl.href),
    ).rejects.toThrow();

    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: undefined,
        normalize: normalizeAccessGrant,
      },
    );
  });
});
