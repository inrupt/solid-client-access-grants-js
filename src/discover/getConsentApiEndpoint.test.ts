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
import { jest, describe, it, expect } from "@jest/globals";
import {
  MOCKED_CONSENT_ISSUER,
  MOCK_REQUESTEE_IRI,
  mockConsentEndpoint,
} from "../request/request.mock";
import { getConsentApiEndpoint } from "./getConsentApiEndpoint";

jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("cross-fetch");

describe("getConsentApiEndpoint", () => {
  it("can find the consent endpoint for a given resource", async () => {
    mockConsentEndpoint();
    const consentEndpoint = await getConsentApiEndpoint(MOCK_REQUESTEE_IRI);
    expect(consentEndpoint).toBe(MOCKED_CONSENT_ISSUER);
  });

  it("throws an error if the unauthenticated fetch does not fail", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response("", {
        status: 200,
        statusText: "Ok",
      })
    );
    const crossFetchModule = jest.requireMock("cross-fetch") as {
      fetch: typeof global.fetch;
    };
    crossFetchModule.fetch = mockedFetch;
    await expect(getConsentApiEndpoint(MOCK_REQUESTEE_IRI)).rejects.toThrow(
      "Expected a 401 error with a WWW-Authenticate header, got a [200: Ok] response lacking the WWW-Authenticate header"
    );
  });

  it("throws if the authentication scheme is unexpected", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response("", {
        status: 401,
        headers: {
          "WWW-Authenticate": `someScheme aParam="Some value"`,
        },
      })
    );
    const crossFetchModule = jest.requireMock("cross-fetch") as {
      fetch: typeof global.fetch;
    };
    crossFetchModule.fetch = mockedFetch;
    await expect(getConsentApiEndpoint(MOCK_REQUESTEE_IRI)).rejects.toThrow(
      "Unsupported authorization scheme: [someScheme]"
    );
  });

  it("throws an error if the well-known document does not list a consent endpoint", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response("", {
          status: 401,
          headers: {
            "WWW-Authenticate": `UMA realm="Solid Pod", as_uri="https://uma.inrupt.com", ticket="some UMA ticket`,
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            some_property: "some value",
          })
        )
      );
    const crossFetchModule = jest.requireMock("cross-fetch") as {
      fetch: typeof global.fetch;
    };
    crossFetchModule.fetch = mockedFetch;
    await expect(getConsentApiEndpoint(MOCK_REQUESTEE_IRI)).rejects.toThrow(
      /No access issuer listed for property \[verifiable_credential_issuer\] in.*some_property.*some value/
    );
  });
});
