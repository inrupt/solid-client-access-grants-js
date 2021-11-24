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

// This rule complains about testing promises as described in the Jest docs:
// https://jestjs.io/docs/asynchronous#promises
/* eslint jest/no-conditional-expect: 0 */

// Also disabling this to make my fetch mocking easy.
/* eslint @typescript-eslint/no-explicit-any: 0 */

// This rule complains about the `@jest/globals` variables overriding global vars:
// eslint-disable-next-line no-shadow
import { jest, describe, it, expect } from "@jest/globals";
import { fetch as crossFetch } from "cross-fetch";

import {
  parseUMAAuthTicket,
  parseUMAAuthIri,
  getUmaConfiguration,
  exchangeTicketForAccessToken,
  boundFetch,
  fetchWithVc,
} from "./index";

jest.mock("cross-fetch");

const MOCK_VC = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://consent.pod.inrupt.com/credentials/v1",
  ],
  id: "https://example.com/id",
  issuer: "https://example.com/issuer",
  type: ["VerifiableCredential", "SolidCredential", "SolidAccessGrant"],
  issuanceDate: "2021-05-26T16:40:03",
  expirationDate: "2021-06-09T16:40:03",
  credentialSubject: {
    id: "https://pod.inrupt.com/alice/profile/card#me",
    providedConsent: {
      mode: ["http://www.w3.org/ns/auth/acl#Read"],
      hasStatus: "ConsentStatusExplicitlyGiven",
      forPersonalData: "https://pod.inrupt.com/alice/private/data",
      forPurpose: "https://example.com/SomeSpecificPurpose",
      isProvidedToPerson: "https://pod.inrupt.com/bob/profile/card#me",
    },
  },
  proof: {
    created: "2021-05-26T16:40:03.009Z",
    proofPurpose: "assertionMethod",
    proofValue: "eqp8h_kL1DwJCpn65z-d1Arnysx6b11...jb8j0MxUCc1uDQ",
    type: "Ed25519Signature2020",
    verificationMethod: "https://consent.pod.inrupt.com/key/396f686b",
  },
};

describe("parseUMAAuthTicket", () => {
  it("parses and returns the ticket from a string", () => {
    const header =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    const ticket = parseUMAAuthTicket(header);

    expect(ticket).toEqual("some_value");
  });

  it("returns null if no value is found", () => {
    const header = 'UMA realm="test" as_uri="https://fake.url"';

    const ticket = parseUMAAuthTicket(header);
    expect(ticket).toBeNull();
  });
});

describe("parseUMAAuthIri", () => {
  it("parses and returns the as_uri from a string", () => {
    const header =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    const ticket = parseUMAAuthIri(header);
    expect(ticket).toEqual("https://fake.url");
  });

  it("returns null if no value is found", () => {
    const header = 'UMA realm="test" ticket="some_value"';

    const ticket = parseUMAAuthIri(header);
    expect(ticket).toBeNull();
  });
});

describe("getUmaConfiguration", () => {
  it("fetches an iri by appending the .well-known path", async () => {
    const iri = "https://fake.url";
    const expectedIri = "https://fake.url/.well-known/uma2-configuration";

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      json: jest.fn(),
    } as any);

    await getUmaConfiguration(iri);
    expect(crossFetch).toHaveBeenCalledWith(expectedIri);
  });
});

describe("exchangeTicketForAccessToken", () => {
  it("posts to the token endpoint and parses the resulting access token", async () => {
    const tokenEndpoint = "https://fake.url/token";
    const authTicket = "auth-ticket";

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      json: jest.fn().mockReturnValueOnce({
        access_token: "some_access_token",
      }),
    } as any);

    const token = await exchangeTicketForAccessToken(
      tokenEndpoint,
      MOCK_VC,
      authTicket
    );

    expect(token).toEqual("some_access_token");
    expect(crossFetch).toHaveBeenCalledWith(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claim_token: JSON.stringify(MOCK_VC),
        claim_token_type: "https://www.w3.org/TR/vc-data-model/#json-ld",
        grant_type: "urn:ietf:params:oauth:grant-type:uma-ticket",
        ticket: authTicket,
      }),
    });
  });

  it("returns null if no body is returned", async () => {
    const tokenEndpoint = "https://fake.url/token";
    const authTicket = "auth-ticket";

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      json: jest.fn().mockReturnValueOnce(null),
    } as any);

    const token = await exchangeTicketForAccessToken(
      tokenEndpoint,
      MOCK_VC,
      authTicket
    );

    expect(token).toBeNull();
  });

  it("returns null if no access token is returned", async () => {
    const tokenEndpoint = "https://fake.url/token";
    const authTicket = "auth-ticket";

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      json: jest.fn().mockReturnValueOnce({}),
    } as any);

    const token = await exchangeTicketForAccessToken(
      tokenEndpoint,
      MOCK_VC,
      authTicket
    );

    expect(token).toBeNull();
  });
});

describe("boundFetch", () => {
  it("returns a fetch function which adds the access token to requests", async () => {
    const accessToken = "access-token";
    const fetchFn = boundFetch(accessToken);

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      json: jest.fn().mockReturnValueOnce({}),
    } as any);

    await fetchFn("https://fake.url");

    expect(crossFetch).toHaveBeenCalledWith("https://fake.url", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  });

  it("merges initalization options in the fetch fn", async () => {
    const accessToken = "access-token";
    const fetchFn = boundFetch(accessToken);

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      json: jest.fn().mockReturnValueOnce({}),
    } as any);

    await fetchFn("https://fake.url", {
      method: "POST",
      headers: {
        "x-some-header": "some-value",
      },
    });

    expect(crossFetch).toHaveBeenCalledWith("https://fake.url", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-some-header": "some-value",
      },
    });
  });
});

describe("fetchWithVc", () => {
  // These tests may be fairly brittle due to the nature of the mocked calls.
  it("throws an error if no www-authentication header is found", async () => {
    const resourceIri = "https://fake.url/some-resource";

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      headers: {
        get: jest.fn().mockReturnValueOnce(null),
      },
    } as any);

    await expect(
      fetchWithVc(resourceIri, MOCK_VC, {
        fetch: crossFetch,
      })
    ).rejects.toThrow("No www-authentication header found");
  });

  it("throws an error if www-authentication header does not contain a ticket", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader = 'UMA realm="test" as_uri="https://fake.url"';

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      headers: {
        get: jest.fn().mockReturnValueOnce(mockHeader),
      },
    } as any);

    await expect(
      fetchWithVc(resourceIri, MOCK_VC, {
        fetch: crossFetch,
      })
    ).rejects.toThrow('did not include "ticket"');
  });

  it("throws an error if www-authentication header does not contain an uma endpoint iri", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader = 'UMA realm="test" ticket="some_value"';

    (
      crossFetch as jest.MockedFunction<typeof crossFetch>
    ).mockResolvedValueOnce({
      headers: {
        get: jest.fn().mockReturnValueOnce(mockHeader),
      },
    } as any);

    await expect(
      fetchWithVc(resourceIri, MOCK_VC, {
        fetch: crossFetch,
      })
    ).rejects.toThrow('did not include "as_uri"');
  });

  it("gets uma configuration from the iri in the auth header", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    (crossFetch as jest.MockedFunction<typeof crossFetch>)
      .mockResolvedValueOnce({
        // first request is for headers
        headers: {
          get: jest.fn().mockReturnValueOnce(mockHeader),
        },
      } as any)
      .mockResolvedValueOnce({
        // second request is for config
        json: jest.fn().mockReturnValueOnce({
          token_endpoint: "https://fake.url/token-endpoint",
        }),
      } as any)
      .mockResolvedValueOnce({
        // third request is for the token
        json: jest.fn().mockReturnValueOnce({
          access_token: "access-token",
        }),
      } as any);

    await fetchWithVc(resourceIri, MOCK_VC, {
      fetch: crossFetch,
    });

    expect(crossFetch).toHaveBeenCalledWith(
      "https://fake.url/.well-known/uma2-configuration"
    );
  });

  it("throws an error if an access token isn't returned", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    (crossFetch as jest.MockedFunction<typeof crossFetch>)
      .mockResolvedValueOnce({
        // first request is for headers
        headers: {
          get: jest.fn().mockReturnValueOnce(mockHeader),
        },
      } as any)
      .mockResolvedValueOnce({
        // second request is for config
        json: jest.fn().mockReturnValueOnce({
          token_endpoint: "https://fake.url/token-endpoint",
        }),
      } as any)
      .mockResolvedValueOnce({
        // third request is for the token
        json: jest.fn().mockReturnValueOnce({}),
      } as any);

    await expect(
      fetchWithVc(resourceIri, MOCK_VC, {
        fetch: crossFetch,
      })
    ).rejects.toThrow("No access token was returned");
  });
});
