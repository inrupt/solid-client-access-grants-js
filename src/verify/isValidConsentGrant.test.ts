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

import { isVerifiableCredential } from "@inrupt/solid-client-vc";
// This rule complains about the `@jest/globals` variables overriding global vars:
// eslint-disable-next-line no-shadow
import { jest, describe, it, expect } from "@jest/globals";
// This ESLint plugin seems to not be able to resolve subpackage imports:
// eslint-disable-next-line import/no-unresolved
import { mocked } from "ts-jest/utils";
import {
  mockWellKnownNoConsent,
  mockWellKnownWithConsent,
} from "../request/request.mock";
import { isValidConsentGrant } from "./isValidConsentGrant";

jest.mock("@inrupt/solid-client", () => {
  // TypeScript can't infer the type of modules imported via Jest;
  // skip type checking for those:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});
jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("@inrupt/solid-client-vc");

const mockConsentEndpoint = (withConsent = true) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getWellKnownSolid.mockResolvedValue(
    (withConsent
      ? mockWellKnownWithConsent()
      : mockWellKnownNoConsent()) as never
  );
};

describe("isValidConsentGrant", () => {
  const MOCK_CONSENT_GRANT = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://consent.pod.inrupt.com/credentials/v1",
    ],
    id: "https://example.com/id",
    issuer: "https://example.com/issuer",
    type: ["VerifiableCredential", "SolidCredential", "SolidConsentGrant"],
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
  const MOCK_CONSENT_ENDPOINT = "https://consent.example.com";
  const MOCK_VERIFY_RESPONSE = { checks: [], warning: [], errors: [] };

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    try {
      await isValidConsentGrant(MOCK_CONSENT_GRANT, {
        fetch: mockedFetch,
        consentEndpoint: MOCK_CONSENT_ENDPOINT,
      });
      // eslint-disable-next-line no-empty
    } catch (_e) {}

    expect(mockedFetch).toHaveBeenCalled();
  });

  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mockConsentEndpoint();
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;
    try {
      await isValidConsentGrant(MOCK_CONSENT_GRANT);
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(scab.fetch).toHaveBeenCalled();
  });

  it("sends the given vc to the verify endpoint", async () => {
    const mockedFetch = jest.fn().mockReturnValue({
      ok: true,
      status: 200,
      json: jest.fn().mockReturnValueOnce(MOCK_VERIFY_RESPONSE),
    }) as typeof fetch;

    await isValidConsentGrant(MOCK_CONSENT_GRANT, {
      fetch: mockedFetch,
      consentEndpoint: MOCK_CONSENT_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ verifiableCredential: MOCK_CONSENT_GRANT }),
      })
    );
  });

  it("retrieves the vc if a url was passed", async () => {
    const mockedFetch = jest.fn().mockReturnValue({
      ok: true,
      status: 200,
      json: jest.fn().mockReturnValueOnce(MOCK_VERIFY_RESPONSE),
    });
    mockedFetch.mockReturnValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockReturnValueOnce(MOCK_CONSENT_GRANT),
    });
    mocked(isVerifiableCredential).mockReturnValueOnce(true);

    await isValidConsentGrant("https://example.com/someVc", {
      fetch: mockedFetch as typeof fetch,
      consentEndpoint: MOCK_CONSENT_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalledWith("https://example.com/someVc");
  });

  it("throws if the passed url returns a non-vc", async () => {
    const mockedFetch = jest.fn().mockReturnValue({
      ok: true,
      status: 200,
      json: jest.fn().mockReturnValueOnce({ someField: "Not a credential" }),
    });
    mocked(isVerifiableCredential).mockReturnValueOnce(false);

    await expect(
      isValidConsentGrant("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        consentEndpoint: MOCK_CONSENT_ENDPOINT,
      })
    ).rejects.toThrow(
      "The request to [https://example.com/someVc] returned an unexpected response:"
    );
  });

  it("gets consent endpoint using credentialSubject.id if no consentEndpoint was passed", async () => {
    mockConsentEndpoint();
    const getConsentApiEndpoint = jest.requireActual(
      "../discover/getConsentApiEndpoint"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    const spiedConsentEndpointLookup = jest.spyOn(
      getConsentApiEndpoint,
      "getConsentApiEndpoint"
    );
    const mockedFetch = jest.fn().mockReturnValue({
      ok: true,
      status: 200,
      json: jest.fn().mockReturnValueOnce(MOCK_VERIFY_RESPONSE),
    });

    await isValidConsentGrant(MOCK_CONSENT_GRANT, {
      fetch: mockedFetch as typeof fetch,
    });

    expect(spiedConsentEndpointLookup).toHaveBeenCalledWith(
      MOCK_CONSENT_GRANT.credentialSubject.id,
      expect.anything()
    );
  });
});
