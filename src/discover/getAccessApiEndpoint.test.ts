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
  MOCKED_ACCESS_ISSUER,
  MOCK_REQUESTEE_IRI,
  mockAccessApiEndpoint,
} from "../request/request.mock";

import {
  getAccessApiEndpoint,
  getConsentApiEndpoint,
} from "./getAccessApiEndpoint";

jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("cross-fetch");

describe("getConsentApiEndpoint", () => {
  it("should be an alias of getAccessApiEndpoint", () => {
    expect(getConsentApiEndpoint).toBe(getAccessApiEndpoint);
  });
});

describe("getAccessApiEndpoint", () => {
  it("can find the access endpoint for a given resource", async () => {
    mockAccessApiEndpoint();
    const accessEndpoint = await getAccessApiEndpoint(MOCK_REQUESTEE_IRI);
    expect(accessEndpoint).toBe(MOCKED_ACCESS_ISSUER);
  });

  it("can find the access endpoint via the accessEndpoint option", async () => {
    mockAccessApiEndpoint();
    const accessEndpoint = await getAccessApiEndpoint(MOCK_REQUESTEE_IRI, {
      accessEndpoint: "https://access.inrupt.com",
    });
    expect(accessEndpoint).toBe("https://access.inrupt.com");
  });

  // Deprecated API:
  it("can find the access endpoint via the consentEndpoint option", async () => {
    mockAccessApiEndpoint();
    const accessEndpoint = await getAccessApiEndpoint(MOCK_REQUESTEE_IRI, {
      consentEndpoint: "https://access.inrupt.com",
    });
    expect(accessEndpoint).toBe("https://access.inrupt.com");
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
    await expect(getAccessApiEndpoint(MOCK_REQUESTEE_IRI)).rejects.toThrow(
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
    await expect(getAccessApiEndpoint(MOCK_REQUESTEE_IRI)).rejects.toThrow(
      "Unsupported authorization scheme: [someScheme]"
    );
  });

  it("throws an error if the well-known document does not list a access endpoint", async () => {
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
    await expect(getAccessApiEndpoint(MOCK_REQUESTEE_IRI)).rejects.toThrow(
      /No access issuer listed for property \[verifiable_credential_issuer\] in.*some_property.*some value/
    );
  });
});
