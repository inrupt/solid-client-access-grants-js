/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line no-shadow
import { describe, it, jest, expect } from "@jest/globals";
import { getVerifiableCredential } from "@inrupt/solid-client-vc";
import { getRequestFromRedirectUrl } from "./getRequestFromRedirectUrl";
import { mockAccessGrantVc } from "./approveAccessRequest.mock";
import { getSessionFetch } from "../util/getSessionFetch";

jest.mock("../util/getSessionFetch");
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

describe("getRequestFromRedirectUrl", () => {
  it("throws if the requestVcUrl query parameter is missing", async () => {
    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url")
    );

    await expect(getRequestFromRedirectUrl(redirectUrl.href)).rejects.toThrow(
      /https:\/\/redirect.url.*requestVcUrl/
    );
  });

  it("throws if the redirectUrl query parameter is missing", async () => {
    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.append(
      "requestVcUrl",
      encodeURI("https://some.vc")
    );

    await expect(getRequestFromRedirectUrl(redirectUrl.href)).rejects.toThrow(
      /https:\/\/redirect.url.*redirectUrl/
    );
  });

  it("uses the default fetch if none is provided", async () => {
    const mockedFetch = jest.fn(fetch);
    const embeddedFetch = jest.requireMock(
      "../util/getSessionFetch"
    ) as jest.Mocked<{ getSessionFetch: typeof getSessionFetch }>;
    embeddedFetch.getSessionFetch.mockResolvedValueOnce(mockedFetch);

    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(mockAccessGrantVc());

    const redirectedToUrl = new URL("https://redirect.url");
    redirectedToUrl.searchParams.append(
      "requestVcUrl",
      encodeURI("https://some.vc")
    );
    redirectedToUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url")
    );

    await getRequestFromRedirectUrl(redirectedToUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
      }
    );
  });

  it("uses the provided fetch if any", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(mockAccessGrantVc());

    const redirectedToUrl = new URL("https://redirect.url");
    redirectedToUrl.searchParams.append(
      "requestVcUrl",
      encodeURI("https://some.vc")
    );
    redirectedToUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url")
    );

    const mockedFetch = jest.fn(fetch);
    await getRequestFromRedirectUrl(redirectedToUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
      }
    );
  });

  it("returns the fetched VC and the redirect URL", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(mockAccessGrantVc());

    const redirectedToUrl = new URL("https://redirect.url");
    redirectedToUrl.searchParams.append(
      "requestVcUrl",
      encodeURI("https://some.vc")
    );
    redirectedToUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url")
    );

    const { accessRequest, redirectUrl } = await getRequestFromRedirectUrl(
      redirectedToUrl.href
    );
    expect(accessRequest).toStrictEqual(mockAccessGrantVc());
    expect(redirectUrl).toBe("https://requestor.redirect.url");
  });

  it("supports the legacy approach of providing the VC as a value", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.append(
      "requestVc",
      encodeURIComponent(JSON.stringify(mockAccessGrantVc()))
    );
    redirectUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url")
    );

    const { accessRequest } = await getRequestFromRedirectUrl(redirectUrl.href);
    expect(accessRequest).toStrictEqual(mockAccessGrantVc());
    // When the VC is passed as a value, nothing needs to be dereferenced.
    expect(vcModule.getVerifiableCredential).not.toHaveBeenCalled();
  });

  it("throws if the legacy provided value is not a VC", async () => {
    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.append(
      "requestVc",
      encodeURIComponent(JSON.stringify({ someJson: "but not a VC" }))
    );
    redirectUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url")
    );

    await expect(getRequestFromRedirectUrl(redirectUrl.href)).rejects.toThrow();
  });
});
