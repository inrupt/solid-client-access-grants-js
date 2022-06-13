//
// Copyright 2022 Inrupt Inc.
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

// eslint-disable-next-line no-shadow
import { describe, it, jest, expect } from "@jest/globals";
import { getVerifiableCredential } from "@inrupt/solid-client-vc";
import { getAccessGrantFromRedirectUrl } from "./getAccessGrantFromRedirectUrl";
import { getSessionFetch } from "../util/getSessionFetch";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";

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

describe("getAccessGrantFromRedirectUrl", () => {
  it("throws if the accessGrant query parameter is missing", async () => {
    await expect(
      getAccessGrantFromRedirectUrl("https://redirect.url")
    ).rejects.toThrow(/https:\/\/redirect.url.*accessGrant/);
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

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc")
    );

    await getAccessGrantFromRedirectUrl(redirectUrl.href, {
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

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc")
    );

    const mockedFetch = jest.fn(fetch);
    await getAccessGrantFromRedirectUrl(redirectUrl.href, {
      fetch: mockedFetch,
    });
    expect(vcModule.getVerifiableCredential).toHaveBeenCalledWith(
      "https://some.vc",
      {
        fetch: mockedFetch,
      }
    );
  });

  it("returns the fetched VC", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(mockAccessGrantVc());

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc")
    );

    const fetchedVc = await getAccessGrantFromRedirectUrl(redirectUrl.href);
    expect(fetchedVc).toStrictEqual(mockAccessGrantVc());
  });

  it("throws if the fetched VC is not an Access Grant", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    vcModule.getVerifiableCredential.mockResolvedValueOnce(
      mockAccessRequestVc()
    );

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrantUrl",
      encodeURI("https://some.vc")
    );

    await expect(
      getAccessGrantFromRedirectUrl(redirectUrl.href)
    ).rejects.toThrow();
  });

  it("supports the legacy approach where the VC is provided by value", async () => {
    const vcModule = jest.requireMock(
      "@inrupt/solid-client-vc"
    ) as jest.Mocked<{
      getVerifiableCredential: typeof getVerifiableCredential;
    }>;
    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrant",
      btoa(JSON.stringify(mockAccessGrantVc()))
    );

    const grantVc = await getAccessGrantFromRedirectUrl(redirectUrl.href);
    expect(grantVc).toStrictEqual(mockAccessGrantVc());
    // If the VC is provided as a value, no dereferencing should happen.
    expect(vcModule.getVerifiableCredential).not.toHaveBeenCalled();
  });

  it("throws if the legacy provided value is not a VC", async () => {
    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.set(
      "accessGrant",
      btoa(JSON.stringify({ someJson: "but not a VC" }))
    );

    await expect(
      getAccessGrantFromRedirectUrl(redirectUrl.href)
    ).rejects.toThrow();
  });
});
