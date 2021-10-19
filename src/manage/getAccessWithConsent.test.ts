// Copyright 2021 Inrupt Inc.
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

// eslint-disable-next-line no-shadow
import { jest, it, describe, expect } from "@jest/globals";
import { mockConsentEndpoint } from "../request/request.mock";
import { mockAccessGrantVc, mockConsentRequestVc } from "./approve.mock";
import { getAccessWithConsent } from "./getAccessWithConsent";

jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("cross-fetch");

describe("getAccessWithConsent", () => {
  it("defaults to the session fetch if none is provided", async () => {
    mockConsentEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockAccessGrantVc())));
    const fetchModule = jest.requireMock(
      "@inrupt/solid-client-authn-browser"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    fetchModule.fetch = mockedFetch;
    await getAccessWithConsent("https://some.vc.url");
    expect(mockedFetch).toHaveBeenCalledWith("https://some.vc.url");
  });

  it("uses the provided fetch if any", async () => {
    mockConsentEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockAccessGrantVc())));
    await getAccessWithConsent("https://some.vc.url", {
      fetch: mockedFetch,
    });
    expect(mockedFetch).toHaveBeenCalledWith("https://some.vc.url");
  });

  it("throws if resolving the IRI results in an HTTP error", async () => {
    mockConsentEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response("Not Found", { status: 404, statusText: "Not Found" })
      );
    await expect(
      getAccessWithConsent("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(
      /Could not resolve \[https:\/\/some.vc.url\].*404 Not Found/
    );
  });

  it("throws if the given IRI does not resolve to a Verifiable Credential", async () => {
    mockConsentEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response("{'someKey': 'someValue'}"));
    await expect(
      getAccessWithConsent("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(
      /Unexpected response.*\[https:\/\/some.vc.url\].*not a Verifiable Credential/
    );
  });

  it("throws if the given IRI does not resolve to a consent grant Verifiable Credential", async () => {
    mockConsentEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockConsentRequestVc()))
      );
    await expect(
      getAccessWithConsent("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(
      /Unexpected response.*\[https:\/\/some.vc.url\].*not an Access Grant/
    );
  });

  it("returns the consent grant with the given IRI", async () => {
    mockConsentEndpoint();
    const mockedAccessgrant = mockAccessGrantVc();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedAccessgrant)));
    const accessGrant = await getAccessWithConsent("https://some.vc.url", {
      fetch: mockedFetch,
    });
    expect(accessGrant).toEqual(mockedAccessgrant);
  });

  it("returns the consent grant with the given URL object", async () => {
    mockConsentEndpoint();
    const mockedAccessgrant = mockAccessGrantVc();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedAccessgrant)));
    const accessGrant = await getAccessWithConsent(
      new URL("https://some.vc.url"),
      {
        fetch: mockedFetch,
      }
    );
    expect(accessGrant).toEqual(mockedAccessgrant);
  });
});
