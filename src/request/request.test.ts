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

// This rule complains about the `@jest/globals` variables overriding global vars:
/* eslint-disable no-shadow */
import { jest, describe, it, expect } from "@jest/globals";
import { mockSolidDatasetFrom, getWellKnownSolid } from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { requestAccess, requestAccessWithConsent } from "./request";
import {
  getConsentEndpointForResource,
  getRequestBody,
  isAccessRequest,
} from "../consent.internal";
import {
  mockAccessGrant,
  MOCKED_CONSENT_ENDPOINT,
  mockWellKnownNoConsent,
  mockWellKnownWithConsent,
} from "./request.mock";

const MOCK_REQUESTOR_IRI = "https://some.pod/profile#me";
const MOCK_REQUESTOR_INBOX = "https://some.pod/consent/inbox";
const MOCK_REQUESTEE_IRI = "https://some.pod/profile#you";

jest.mock("../consent.internal.ts", () => {
  const internalConsentModule = jest.requireActual(
    "../consent.internal.ts"
    // TypeScript can't infer the type of modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;

  internalConsentModule.getConsentEndpointForResource = jest.fn(
    internalConsentModule.getConsentEndpointForResource
  );

  return internalConsentModule;
});
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

describe("getConsentRequestBody", () => {
  it("can generate a minimal consent request body", () => {
    const consentRequestBody = getRequestBody({
      access: { append: true },
      requestor: MOCK_REQUESTOR_IRI,
      resources: ["https://some.pod/resource"],
      status: "ConsentStatusRequested",
      requestorInboxUrl: MOCK_REQUESTOR_INBOX,
    });

    expect(consentRequestBody).toStrictEqual({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://consent.pod.inrupt.com/credentials/v1",
      ],
      credentialSubject: {
        hasConsent: {
          forPersonalData: ["https://some.pod/resource"],
          hasStatus: "ConsentStatusRequested",
          mode: ["Append"],
        },
        id: MOCK_REQUESTOR_IRI,
        inbox: MOCK_REQUESTOR_INBOX,
      },
      type: ["SolidConsentRequest"],
    });
  });

  it("can generate a full consent request body", () => {
    const consentRequestBody = getRequestBody({
      access: {
        read: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      },
      requestor: MOCK_REQUESTOR_IRI,
      resources: ["https://some.pod/resource"],
      issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
      expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
      purpose: ["https://some.vocab/purpose#save-the-world"],
      requestorInboxUrl: "https://some.pod/inbox/",
      status: "ConsentStatusRequested",
    });

    expect(consentRequestBody).toStrictEqual({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://consent.pod.inrupt.com/credentials/v1",
      ],
      credentialSubject: {
        hasConsent: {
          forPersonalData: ["https://some.pod/resource"],
          forPurpose: ["https://some.vocab/purpose#save-the-world"],
          hasStatus: "ConsentStatusRequested",
          mode: ["Read", "Write", "Control"],
        },
        id: MOCK_REQUESTOR_IRI,
        inbox: "https://some.pod/inbox/",
      },
      expirationDate: "1990-11-12T13:37:42.042Z",
      issuanceDate: "1955-06-08T13:37:42.042Z",
      type: ["SolidConsentRequest"],
    });
  });
});

const mockConsentEndpoint = (withConsent = true) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getWellKnownSolid.mockResolvedValue(
    (withConsent
      ? mockWellKnownWithConsent()
      : mockWellKnownNoConsent()) as never
  );
};

describe("requestAccess", () => {
  it("sends a proper access request", async () => {
    mockConsentEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(
      mockAccessGrant(MOCKED_CONSENT_ENDPOINT, MOCK_REQUESTOR_IRI, {
        someClaim: "some value",
      })
    );

    await requestAccess(
      {
        access: { read: true },
        requestor: MOCK_REQUESTOR_IRI,
        resourceOwner: MOCK_REQUESTEE_IRI,
        resources: ["https://some.pod/resource"],
        requestorInboxUrl: MOCK_REQUESTOR_INBOX,
      },
      {
        fetch: jest.fn(),
      }
    );

    expect(mockedIssue).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      MOCK_REQUESTOR_IRI,
      expect.objectContaining({
        id: MOCK_REQUESTOR_IRI,
        hasConsent: {
          mode: ["Read"],
          hasStatus: "ConsentStatusRequested",
          forPersonalData: ["https://some.pod/resource"],
        },
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mockConsentEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;

    await requestAccess({
      access: { read: true },
      requestor: MOCK_REQUESTOR_IRI,
      resourceOwner: MOCK_REQUESTEE_IRI,
      resources: ["https://some.pod/resource"],
      requestorInboxUrl: MOCK_REQUESTOR_INBOX,
    });

    expect(mockedIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        fetch: scab.fetch,
      }
    );
  });
});

describe("requestAccessWithConsent", () => {
  it("sends a proper access with consent request", async () => {
    mockConsentEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(
      mockAccessGrant(MOCKED_CONSENT_ENDPOINT, MOCK_REQUESTOR_IRI, {
        someClaim: "some value",
      })
    );

    await requestAccessWithConsent(
      {
        access: { read: true },
        requestor: MOCK_REQUESTOR_IRI,
        resourceOwner: MOCK_REQUESTEE_IRI,
        resources: ["https://some.pod/resource"],
        purpose: ["https://some.vocab/purpose#save-the-world"],
        issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
        expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
        requestorInboxUrl: "https://some.pod/inbox/",
      },
      {
        fetch: jest.fn(),
      }
    );

    expect(mockedIssue).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      MOCK_REQUESTOR_IRI,
      expect.objectContaining({
        id: MOCK_REQUESTOR_IRI,
        hasConsent: {
          mode: ["Read"],
          hasStatus: "ConsentStatusRequested",
          forPersonalData: ["https://some.pod/resource"],
          forPurpose: ["https://some.vocab/purpose#save-the-world"],
        },
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
        issuanceDate: "1955-06-08T13:37:42.042Z",
        expirationDate: "1990-11-12T13:37:42.042Z",
      }),
      expect.anything()
    );
  });

  it("supports access with consent request with no issuance or expiration set", async () => {
    mockConsentEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(
      mockAccessGrant(MOCKED_CONSENT_ENDPOINT, MOCK_REQUESTOR_IRI, {
        someClaim: "some value",
      })
    );

    await requestAccessWithConsent({
      access: { read: true },
      requestor: MOCK_REQUESTOR_IRI,
      resourceOwner: MOCK_REQUESTEE_IRI,
      resources: ["https://some.pod/resource"],
      purpose: ["https://some.vocab/purpose#save-the-world"],
      requestorInboxUrl: "https://some.pod/inbox/",
    });

    expect(mockedIssue).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      MOCK_REQUESTOR_IRI,
      expect.objectContaining({
        id: MOCK_REQUESTOR_IRI,
        hasConsent: {
          mode: ["Read"],
          hasStatus: "ConsentStatusRequested",
          forPersonalData: ["https://some.pod/resource"],
          forPurpose: ["https://some.vocab/purpose#save-the-world"],
        },
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mockConsentEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;

    await requestAccessWithConsent({
      access: { read: true },
      requestor: MOCK_REQUESTOR_IRI,
      resourceOwner: MOCK_REQUESTEE_IRI,
      resources: ["https://some.pod/resource"],
      purpose: ["https://some.vocab/purpose#save-the-world"],
      issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
      expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
      requestorInboxUrl: "https://some.pod/inbox/",
    });

    expect(mockedIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        fetch: scab.fetch,
      }
    );
  });
});

describe("getConsentEndpointForResource", () => {
  it("can find the consent endpoint for a given resource", async () => {
    mockConsentEndpoint();
    const consentEndpoint = await getConsentEndpointForResource(
      MOCK_REQUESTEE_IRI,
      jest.fn()
    );
    expect(consentEndpoint).toBe(MOCKED_CONSENT_ENDPOINT);
  });

  it("throws an error if the well-known document does not list any subject", async () => {
    jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getWellKnownSolid: typeof getWellKnownSolid;
        },
        "getWellKnownSolid"
      )
      .mockResolvedValueOnce(
        mockSolidDatasetFrom("https://some.resource/.well-known/solid")
      );
    await expect(
      getConsentEndpointForResource(MOCK_REQUESTEE_IRI, jest.fn())
    ).rejects.toThrow(/Cannot discover.*well-known document is empty/);
  });

  it("throws an error if the well-known document does not list a consent endpoint", async () => {
    mockConsentEndpoint(false);
    await expect(
      getConsentEndpointForResource(MOCK_REQUESTEE_IRI, jest.fn())
    ).rejects.toThrow(
      /Cannot discover.*no value for property \[http:\/\/inrupt.com\/ns\/ess#consentIssuer\]/
    );
  });
});

const mockCredentialProof = (): VerifiableCredential["proof"] => {
  return {
    created: "some date",
    proofPurpose: "some purpose",
    proofValue: "some value",
    type: "some type",
    verificationMethod: "some method",
  };
};

describe("isAccessRequest", () => {
  it("returns false if the credential subject is missing 'hasConsent'", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          inbox: "https://some.inbox",
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["SolidConsentRequest"],
      })
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'mode'", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          inbox: "https://some.inbox",
          hasConsent: {
            hasStatus: "ConsentStatusRequested",
            forPersonalData: ["https://some.resource"],
          },
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["SolidConsentRequest"],
      })
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'status'", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          inbox: "https://some.inbox",
          hasConsent: {
            mode: ["some mode"],
            forPersonalData: ["https://some.resource"],
          },
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["SolidConsentRequest"],
      })
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'forPersonalData'", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          inbox: "https://some.inbox",
          hasConsent: {
            mode: ["some mode"],
            hasStatus: "ConsentStatusRequested",
          },
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["SolidConsentRequest"],
      })
    ).toBe(false);
  });

  it("returns false if the credential subject is missing an inbox", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          hasConsent: {
            mode: ["some mode"],
            hasStatus: "ConsentStatusRequested",
            forPersonalData: ["https://some.resource"],
          },
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["SolidConsentRequest"],
      })
    ).toBe(false);
  });

  it("returns false if the credential type does not include 'SolidConsentRequest'", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          inbox: "https://some.inbox",
          hasConsent: {
            mode: ["some mode"],
            hasStatus: "ConsentStatusRequested",
            forPersonalData: ["https://some.resource"],
          },
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["Some other type"],
      })
    ).toBe(false);
  });

  it("returns true if the credential matches the expected shape", () => {
    expect(
      isAccessRequest({
        "@context": "https://some.context",
        credentialSubject: {
          id: "https://some.id",
          inbox: "https://some.inbox",
          hasConsent: {
            mode: ["some mode"],
            hasStatus: "ConsentStatusRequested",
            forPersonalData: ["https://some.resource"],
          },
        },
        id: "https://some.credential",
        proof: mockCredentialProof(),
        issuer: "https://some.issuer",
        issuanceDate: "some date",
        type: ["SolidConsentRequest"],
      })
    ).toBe(true);
  });
});
