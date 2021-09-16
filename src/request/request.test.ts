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
// This ESLint plugin seems to not be able to resolve subpackage imports:
// eslint-disable-next-line import/no-unresolved
import { mocked } from "ts-jest/utils";
import {
  mockSolidDatasetFrom,
  getWellKnownSolid,
  getSolidDataset,
} from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  revokeVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { Response } from "cross-fetch";
import {
<<<<<<< HEAD
  cancelAccessRequest,
=======
  getConsentApiEndpoint,
>>>>>>> d475799 (Get preferred consent UI)
  isAccessRequest,
  requestAccess,
  requestAccessWithConsent,
} from "./request";
import {
  getConsentEndpointForWebId,
  getRequestBody,
} from "../consent.internal";
import {
  mockAccessGrant,
<<<<<<< HEAD
  mockedConsentEndpoint,
  MOCKED_CREDENTIAL_ID,
=======
  MOCKED_CONSENT_ISSUER,
  MOCKED_CONSENT_UI_IRI,
  mockWebIdWithUi,
>>>>>>> d475799 (Get preferred consent UI)
  mockWellKnownNoConsent,
  mockWellKnownWithConsent,
} from "./request.mock";

const MOCK_REQUESTOR_IRI = "https://some.pod/profile#me";
const MOCK_REQUESTOR_INBOX = "https://some.pod/consent/inbox";
const MOCK_REQUESTEE_IRI = "https://some.pod/profile#you";
const MOCK_ISSUER_IRI = "https://some-issuer.iri/";

jest.mock("../consent.internal.ts", () => {
  const internalConsentModule = jest.requireActual(
    "../consent.internal.ts"
    // TypeScript can't infer the type of modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;

  internalConsentModule.getConsentEndpointForWebId = jest.fn(
    internalConsentModule.getConsentEndpointForWebId
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

describe("requestAccess", () => {
  it("sends a proper access request", async () => {
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(MOCK_ISSUER_IRI);
    mockedIssue.mockResolvedValueOnce(
      mockAccessGrant(MOCK_ISSUER_IRI, MOCK_REQUESTOR_IRI, {
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
      `${MOCK_ISSUER_IRI}issue`,
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
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
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
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(MOCK_ISSUER_IRI);
    mockedIssue.mockResolvedValueOnce(
      mockAccessGrant(MOCK_ISSUER_IRI, MOCK_REQUESTOR_IRI, {
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
      `${MOCK_ISSUER_IRI}issue`,
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
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(MOCK_ISSUER_IRI);
    mockedIssue.mockResolvedValueOnce(
      mockAccessGrant(MOCK_ISSUER_IRI, MOCK_REQUESTOR_IRI, {
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
      `${MOCK_ISSUER_IRI}issue`,
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
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
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

describe("getConsentEndpointForWebId", () => {
  it("can find the consent endpoint for a given WebID", async () => {
    jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getWellKnownSolid: typeof getWellKnownSolid;
        },
        "getWellKnownSolid"
      )
      .mockResolvedValueOnce(mockWellKnownWithConsent());
    const consentEndpoint = await getConsentEndpointForWebId(
      MOCK_REQUESTEE_IRI,
      jest.fn()
    );
    expect(consentEndpoint).toBe(MOCKED_CONSENT_ISSUER);
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
      getConsentEndpointForWebId(MOCK_REQUESTEE_IRI, jest.fn())
    ).rejects.toThrow(/Cannot discover.*well-known document is empty/);
  });

  it("throws an error if the well-known document does not list a consent endpoint", async () => {
    jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getWellKnownSolid: typeof getWellKnownSolid;
        },
        "getWellKnownSolid"
      )
      .mockResolvedValueOnce(mockWellKnownNoConsent());
    await expect(
      getConsentEndpointForWebId(MOCK_REQUESTEE_IRI, jest.fn())
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

describe("cancelAccessRequest", () => {
  it("defaults to the authenticated fetch from solid-client-authn-browser", async () => {
    const sca = jest.requireMock("@inrupt/solid-client-authn-browser") as {
      fetch: typeof global.fetch;
    };
    sca.fetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            mockAccessGrant("https://some.issuer", "https://some.subject")
          )
        )
      );
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: typeof revokeVerifiableCredential;
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential"
    );
    await cancelAccessRequest("https://some.credential");
    expect(spiedRevoke).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        fetch: sca.fetch,
      }
    );
  });

  it("uses the provided fetch if any", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: typeof revokeVerifiableCredential;
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential"
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            mockAccessGrant("https://some.issuer", "https://some.subject")
          )
        )
      );
    await cancelAccessRequest("https://some.credential", {
      fetch: mockedFetch,
    });
    expect(spiedRevoke).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        fetch: mockedFetch,
      }
    );
  });

  it("looks up the VC if provided as an IRI", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: typeof revokeVerifiableCredential;
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential"
    );
    const mockedVc = mockAccessGrant(
      "https://some.issuer",
      "https://some.subject"
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValue(new Response(JSON.stringify(mockedVc)));
    await cancelAccessRequest(MOCKED_CREDENTIAL_ID, {
      fetch: mockedFetch,
    });
    expect(mockedFetch).toHaveBeenCalledWith(MOCKED_CREDENTIAL_ID);
    expect(spiedRevoke).toHaveBeenCalledWith(
      "https://some.issuer/issue",
      MOCKED_CREDENTIAL_ID,
      expect.anything()
    );
  });

  it("throws if dereferencing the credential ID fails", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(undefined, {
        status: 401,
        statusText: "Unauthorized",
      })
    );
    await expect(
      cancelAccessRequest("https://some.credential", { fetch: mockedFetch })
    ).rejects.toThrow(/\[https:\/\/some.credential\].*401.*Unauthorized/);
  });

  it("gets the VC identifier if provided as a full credential", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: typeof revokeVerifiableCredential;
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential"
    );
    const mockedFetch = jest.fn(global.fetch);
    await cancelAccessRequest(
      mockAccessGrant("https://some.issuer", "https://some.subject"),
      {
        fetch: mockedFetch,
      }
    );
    expect(spiedRevoke).toHaveBeenCalledWith(
      "https://some.issuer/issue",
      MOCKED_CREDENTIAL_ID,
      expect.anything()
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe("getConsentApiEndpoint", () => {
  it("defaults to the default session fetch if no fetch is provided", async () => {
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;
    const spiedGetDataset = jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getSolidDataset: typeof getSolidDataset;
        },
        "getSolidDataset"
      )
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid"));
    await getConsentApiEndpoint("https://some.webid");
    expect(spiedGetDataset).toHaveBeenCalledWith("https://some.webid", {
      fetch: scab.fetch,
    });
  });

  it("uses the provided fetch if any", async () => {
    const spiedGetDataset = jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getSolidDataset: typeof getSolidDataset;
        },
        "getSolidDataset"
      )
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid"));
    const mockedFetch = jest.fn(global.fetch);
    await getConsentApiEndpoint("https://some.webid", { fetch: mockedFetch });
    expect(spiedGetDataset).toHaveBeenCalledWith("https://some.webid", {
      fetch: mockedFetch,
    });
  });

  it("throws if the WebID document cannot be dereferenced", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest.spyOn(solidClient, "getSolidDataset").mockRejectedValue("Some error");
    await expect(getConsentApiEndpoint("https://some.webid")).rejects.toThrow(
      /some.webid.*Some error/
    );
  });

  it("throws if the WebID document does not contain the WebID", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(mockSolidDatasetFrom("https://some.webid"));
    await expect(getConsentApiEndpoint("https://some.webid")).rejects.toThrow(
      /some.webid.*WebID cannot be dereferenced/
    );
  });

  it("returns the IRI advertized by the user's profile when present", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid"));
    const spiedGetWellKnown = jest.spyOn(solidClient, "getWellKnownSolid");
    await expect(getConsentApiEndpoint("https://some.webid")).resolves.toBe(
      MOCKED_CONSENT_UI_IRI
    );
    // If the profile contains a preferred UI, the .well-known document should not be looked up.
    expect(spiedGetWellKnown).not.toHaveBeenCalled();
  });

  it("falls back to the IRI advertized by the user's Pod provider when present", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid", false));
    const spiedGetWellKnown = jest
      .spyOn(solidClient, "getWellKnownSolid")
      .mockResolvedValueOnce(mockWellKnownWithConsent());
    await expect(getConsentApiEndpoint("https://some.webid")).resolves.toBe(
      MOCKED_CONSENT_UI_IRI
    );
    expect(spiedGetWellKnown).toHaveBeenCalled();
  });

  it("returns undefined if the user's WebID does not link to a storage", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(
        mockWebIdWithUi("https://some.webid", false, false)
      );
    await expect(
      getConsentApiEndpoint("https://some.webid")
    ).resolves.toBeUndefined();
  });

  it("returns undefined if the host's well-known does not link to a recommanded consent UI", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid", false));
    const spiedGetWellKnown = jest
      .spyOn(solidClient, "getWellKnownSolid")
      .mockResolvedValueOnce(mockWellKnownWithConsent(false));
    await expect(
      getConsentApiEndpoint("https://some.webid")
    ).resolves.toBeUndefined();
    expect(spiedGetWellKnown).toHaveBeenCalled();
  });

  it("returns undefined if the host's well-known is empty", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid", false));
    const spiedGetWellKnown = jest
      .spyOn(solidClient, "getWellKnownSolid")
      .mockResolvedValueOnce(
        mockSolidDatasetFrom("https://some.server/.well-known/solid")
      );
    await expect(
      getConsentApiEndpoint("https://some.webid")
    ).resolves.toBeUndefined();
    expect(spiedGetWellKnown).toHaveBeenCalled();
  });
});
