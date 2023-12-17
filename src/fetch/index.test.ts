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

import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import type {
  VerifiableCredential,
  VerifiableCredentialBase,
} from "@inrupt/solid-client-vc";
import { verifiableCredentialToDataset } from "@inrupt/solid-client-vc";

import base64url from "base64url";
import {
  parseUMAAuthTicket,
  parseUMAAuthIri,
  getUmaConfiguration,
  exchangeTicketForAccessToken,
  boundFetch,
  fetchWithVc,
} from "./index";

const MOCK_VC_BASE = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://vc.inrupt.com/credentials/v1",
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

const mockFetch = (response: Response) => {
  return jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);
};

describe("parseUMAAuthTicket", () => {
  it("parses and returns the ticket from a string", () => {
    const header =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    const ticket = parseUMAAuthTicket(header);

    expect(ticket).toBe("some_value");
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
    expect(ticket).toBe("https://fake.url");
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

    const mockedFetch = mockFetch(new Response(JSON.stringify({})));

    await getUmaConfiguration(iri);
    expect(mockedFetch).toHaveBeenCalledWith(expectedIri);
  });

  it("throws if parsing the response as JSON fails", async () => {
    const iri = "https://fake.url";
    const expectedIri = "https://fake.url/.well-known/uma2-configuration";

    mockFetch(new Response("Not a JSON document."));

    await expect(getUmaConfiguration(iri)).rejects.toThrow(
      `Parsing the UMA configuration found at ${expectedIri} failed`,
    );
  });
});

describe("exchangeTicketForAccessToken", () => {
  let MOCK_VC: VerifiableCredential;
  beforeAll(async () => {
    MOCK_VC = await verifiableCredentialToDataset<VerifiableCredentialBase>(
      MOCK_VC_BASE,
      {
        baseIRI: MOCK_VC_BASE.id,
        includeVcProperties: true,
      },
    );
  });

  it("posts to the token endpoint and parses the resulting access token", async () => {
    const tokenEndpoint = "https://fake.url/token";
    const authTicket = "auth-ticket";

    const mockedFetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "some_access_token",
          }),
        ),
    );

    const token = await exchangeTicketForAccessToken(
      tokenEndpoint,
      MOCK_VC,
      authTicket,
      mockedFetch,
    );

    expect(token).toBe("some_access_token");
    expect(mockedFetch).toHaveBeenCalledWith(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        claim_token: base64url.encode(
          JSON.stringify({
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://schema.inrupt.com/credentials/v1.jsonld",
            ],
            type: ["VerifiablePresentation"],
            verifiableCredential: [MOCK_VC],
          }),
        ),
        claim_token_format: "https://www.w3.org/TR/vc-data-model/#json-ld",
        grant_type: "urn:ietf:params:oauth:grant-type:uma-ticket",
        ticket: authTicket,
      }).toString(),
    });
  });

  it("returns null if no body is returned", async () => {
    const tokenEndpoint = "https://fake.url/token";
    const authTicket = "auth-ticket";

    const token = await exchangeTicketForAccessToken(
      tokenEndpoint,
      MOCK_VC,
      authTicket,
      async () => new Response(),
    );

    expect(token).toBeNull();
  });

  it("returns null if no access token is returned", async () => {
    const tokenEndpoint = "https://fake.url/token";
    const authTicket = "auth-ticket";

    const token = await exchangeTicketForAccessToken(
      tokenEndpoint,
      MOCK_VC,
      authTicket,
      async () => new Response(JSON.stringify({})),
    );

    expect(token).toBeNull();
  });
});

describe("boundFetch", () => {
  it("returns a fetch function which adds the access token to requests", async () => {
    const accessToken = "access-token";
    const fetchFn = boundFetch(accessToken);

    const mockedFetch = mockFetch(new Response(JSON.stringify({})));

    await fetchFn("https://fake.url");

    expect(mockedFetch).toHaveBeenCalledWith("https://fake.url", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  });

  it("merges initalization options in the fetch fn", async () => {
    const accessToken = "access-token";
    const fetchFn = boundFetch(accessToken);

    const mockedFetch = mockFetch(new Response(JSON.stringify({})));

    await fetchFn("https://fake.url", {
      method: "POST",
      headers: {
        "x-some-header": "some-value",
      },
    });

    expect(mockedFetch).toHaveBeenCalledWith("https://fake.url", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-some-header": "some-value",
      },
    });
  });
});

describe("fetchWithVc", () => {
  let MOCK_VC: VerifiableCredential;
  beforeAll(async () => {
    MOCK_VC = await verifiableCredentialToDataset<VerifiableCredentialBase>(
      MOCK_VC_BASE,
      {
        baseIRI: MOCK_VC_BASE.id,
        includeVcProperties: true,
      },
    );
  });

  // These tests may be fairly brittle due to the nature of the mocked calls.
  it("throws an error if no www-authentication header is found", async () => {
    const resourceIri = "https://fake.url/some-resource";

    mockFetch(new Response());

    await expect(fetchWithVc(resourceIri, MOCK_VC)).rejects.toThrow(
      "No www-authentication header found",
    );
  });

  it("throws an error if www-authentication header does not contain a ticket", async () => {
    const resourceIri = "https://fake.url/some-resource";

    mockFetch(
      new Response(undefined, {
        headers: {
          "WWW-Authenticate": 'UMA realm="test" as_uri="https://fake.url"',
        },
      }),
    );

    await expect(fetchWithVc(resourceIri, MOCK_VC)).rejects.toThrow(
      'did not include "ticket"',
    );
  });

  it("throws an error if www-authentication header does not contain an uma endpoint iri", async () => {
    const resourceIri = "https://fake.url/some-resource";

    mockFetch(
      new Response(undefined, {
        headers: {
          "WWW-Authenticate": 'UMA realm="test" ticket="some_value"',
        },
      }),
    );

    await expect(fetchWithVc(resourceIri, MOCK_VC)).rejects.toThrow(
      'did not include "as_uri"',
    );
  });

  it("gets uma configuration from the iri in the auth header", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    jest
      .spyOn(globalThis, "fetch")
      // first request is for headers
      .mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            "WWW-Authenticate": mockHeader,
          },
        }),
      )
      // second request is for config
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token_endpoint: "https://fake.url/token-endpoint",
          }),
        ),
      )
      // third request is for the token
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access-token",
          }),
        ),
      );

    await fetchWithVc(resourceIri, MOCK_VC);

    expect(fetch).toHaveBeenCalledWith(
      "https://fake.url/.well-known/uma2-configuration",
    );
  });

  it("throws an error if an access token isn't returned", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';

    (fetch as jest.MockedFunction<typeof fetch>)
      // first request is for headers
      .mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            "WWW-Authenticate": mockHeader,
          },
        }),
      )
      // second request is for config
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token_endpoint: "https://fake.url/token-endpoint",
          }),
        ),
      )
      // third request is for the token. Note that the token is missing here.
      .mockResolvedValueOnce(new Response(JSON.stringify({})));

    await expect(fetchWithVc(resourceIri, MOCK_VC)).rejects.toThrow(
      "No access token was returned",
    );
  });

  it("uses the provided fetch (if any) for the token request", async () => {
    const resourceIri = "https://fake.url/some-resource";
    const mockHeader =
      'UMA realm="test" as_uri="https://fake.url" ticket="some_value"';
    // @inrupt/universal-fetch is necessarily called for unauthenticated calls.
    (fetch as jest.MockedFunction<typeof fetch>)
      // first request is for headers
      .mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            "WWW-Authenticate": mockHeader,
          },
        }),
      )
      // second request is for config
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token_endpoint: "https://fake.url/token-endpoint",
          }),
        ),
      );
    const mockedFetch = jest
      .fn(global.fetch)
      // third request is for the token
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access-token",
          }),
        ),
      );

    await fetchWithVc(resourceIri, MOCK_VC, { fetch: mockedFetch });

    expect(mockedFetch).toHaveBeenCalled();
  });
});
