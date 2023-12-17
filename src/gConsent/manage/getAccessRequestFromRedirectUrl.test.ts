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

import type { getVerifiableCredential } from "@inrupt/solid-client-vc";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { isomorphic } from "rdf-isomorphic";
import type { getSessionFetch } from "../../common/util/getSessionFetch";
import { normalizeAccessRequest } from "../request/issueAccessRequest";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";
import { getAccessRequestFromRedirectUrl } from "./getAccessRequestFromRedirectUrl";

jest.mock("../../common/util/getSessionFetch");
jest.mock("@inrupt/solid-client-vc", () => {
  const vcModule = jest.requireActual("@inrupt/solid-client-vc") as any;
  return {
    ...vcModule,
    getVerifiableCredential: jest.fn(),
  };
});

describe("getAccessRequestFromRedirectUrl", () => {
  let mockedFetch: jest.MockedFunction<typeof fetch>;
  let embeddedFetch: jest.Mocked<{ getSessionFetch: typeof getSessionFetch }>;
  let vcModule: jest.Mocked<{
    getVerifiableCredential: typeof getVerifiableCredential;
  }>;
  let redirectedToUrl: URL;
  let accessRequestVc: Awaited<ReturnType<typeof mockAccessRequestVc>>;
  let accessGrantVc: Awaited<ReturnType<typeof mockAccessGrantVc>>;

  beforeEach(async () => {
    mockedFetch = jest.fn(fetch);
    embeddedFetch = jest.requireMock("../../common/util/getSessionFetch");
    embeddedFetch.getSessionFetch.mockResolvedValueOnce(mockedFetch);
    vcModule = jest.requireMock("@inrupt/solid-client-vc");
    accessRequestVc = await mockAccessRequestVc();
    accessGrantVc = await mockAccessGrantVc();
    vcModule.getVerifiableCredential.mockResolvedValue(accessRequestVc);

    redirectedToUrl = new URL("https://redirect.url");
    redirectedToUrl.searchParams.append(
      "requestVcUrl",
      encodeURI("https://some.vc"),
    );
    redirectedToUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url"),
    );
  });

  it("throws if the requestVcUrl query parameter is missing", async () => {
    redirectedToUrl.searchParams.delete("requestVcUrl");
    await expect(
      getAccessRequestFromRedirectUrl(redirectedToUrl.href),
    ).rejects.toThrow(/https:\/\/redirect.url.*requestVcUrl/);
    await expect(
      getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(/https:\/\/redirect.url.*requestVcUrl/);
  });

  it("throws if the redirectUrl query parameter is missing", async () => {
    redirectedToUrl.searchParams.delete("redirectUrl");
    await expect(
      getAccessRequestFromRedirectUrl(redirectedToUrl.href),
    ).rejects.toThrow(/https:\/\/redirect.url.*redirectUrl/);
    await expect(
      getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(/https:\/\/redirect.url.*redirectUrl/);
  });

  it("uses the default fetch if none is provided", async () => {
    await getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
        normalize: normalizeAccessRequest,
      },
    );
  });

  it("uses the default fetch if none is provided [returnLegacyJsonld: false]", async () => {
    await getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
      fetch: mockedFetch,
      returnLegacyJsonld: false,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
        returnLegacyJsonld: false,
      },
    );
  });

  it("uses the provided fetch if any", async () => {
    await getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
        normalize: normalizeAccessRequest,
      },
    );
  });

  it("uses the provided fetch if any [returnLegacyJsonld: false]", async () => {
    await getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
      fetch: mockedFetch,
      returnLegacyJsonld: false,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
        returnLegacyJsonld: false,
      },
    );
  });

  it("returns the fetched VC and the redirect URL", async () => {
    // Check that both URL strings and objects are supported.
    const accessRequestFromString = await getAccessRequestFromRedirectUrl(
      redirectedToUrl.href,
    );
    const accessRequestFromUrl =
      await getAccessRequestFromRedirectUrl(redirectedToUrl);

    expect(accessRequestFromString.accessRequest).toStrictEqual(
      accessRequestFromUrl.accessRequest,
    );
    expect(accessRequestFromString.requestorRedirectUrl).toBe(
      accessRequestFromUrl.requestorRedirectUrl,
    );

    const { accessRequest, requestorRedirectUrl } = accessRequestFromUrl;

    expect(accessRequest).toStrictEqual(accessRequestVc);
    expect(requestorRedirectUrl).toBe("https://requestor.redirect.url");
  });

  it("returns the fetched VC and the redirect URL  [returnLegacyJsonld: false]", async () => {
    // Check that both URL strings and objects are supported.
    const accessRequestFromString = await getAccessRequestFromRedirectUrl(
      redirectedToUrl.href,
    );
    const accessRequestFromUrl = await getAccessRequestFromRedirectUrl(
      redirectedToUrl,
      {
        returnLegacyJsonld: false,
      },
    );

    expect(accessRequestFromString.accessRequest).toStrictEqual(
      accessRequestFromUrl.accessRequest,
    );
    expect(accessRequestFromString.requestorRedirectUrl).toBe(
      accessRequestFromUrl.requestorRedirectUrl,
    );

    const { accessRequest, requestorRedirectUrl } = accessRequestFromUrl;

    expect(accessRequest).toStrictEqual(accessRequestVc);
    expect(requestorRedirectUrl).toBe("https://requestor.redirect.url");
  });

  it("throws if the fetched VC is not an Access Request", async () => {
    vcModule.getVerifiableCredential.mockResolvedValueOnce(accessGrantVc);
    await expect(
      getAccessRequestFromRedirectUrl(redirectedToUrl.href),
    ).rejects.toThrow();
  });

  it("throws if the fetched VC is not an Access Request [returnLegacyJsonld: false]", async () => {
    vcModule.getVerifiableCredential.mockResolvedValueOnce(accessGrantVc);
    await expect(
      getAccessRequestFromRedirectUrl(redirectedToUrl.href, {
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
    vcModule.getVerifiableCredential.mockImplementation(async (_, opts) =>
      opts && "normalize" in opts && opts.normalize
        ? opts.normalize(vc)
        : (vc as any),
    );
    expect(
      (await getAccessRequestFromRedirectUrl(redirectedToUrl)).accessRequest,
    ).toStrictEqual(accessRequestVc);
    expect(
      isomorphic(
        [
          ...(await getAccessRequestFromRedirectUrl(redirectedToUrl))
            .accessRequest,
        ],
        [
          ...(
            await getAccessRequestFromRedirectUrl(redirectedToUrl, {
              returnLegacyJsonld: false,
            })
          ).accessRequest,
        ],
      ),
    ).toBe(true);
  });
});
