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

/* eslint-disable no-shadow */
import { jest, it, describe, expect } from "@jest/globals";
import { MOCKED_CONSENT_ISSUER } from "../request/request.mock";
import { approveAccessRequestWithConsent } from "./approveAccessRequestWithConsent";
import { approveAccessRequest } from "./approveAccessRequest";
import {
  mockAccessRequestVc,
  mockConsentEndpoint,
  mockConsentGrantVc,
  mockConsentRequestVc,
} from "./approve.mock";

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

describe("approveAccessRequest", () => {
  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mockConsentEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => unknown;
      },
      "issueVerifiableCredential"
    );
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;

    await approveAccessRequest(mockAccessRequestVc());

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

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("throws if the provided VC isn't a solid consent request VC", async () => {
    mockConsentEndpoint();
    await expect(
      approveAccessRequest({
        ...mockAccessRequestVc(),
        type: ["NotASolidConsentRequest"],
      })
    ).rejects.toThrow(
      "An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential."
    );
  });

  it("throws if the provided VC isn't an access request", async () => {
    mockConsentEndpoint();
    const accessRequest = mockAccessRequestVc();
    await expect(
      approveAccessRequest({
        ...accessRequest,
        credentialSubject: {
          ...accessRequest.credentialSubject,
          hasConsent: {
            ...accessRequest.credentialSubject.hasConsent,
            hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          },
        },
      })
    ).rejects.toThrow(/Unexpected VC.*credentialSubject/);
  });

  it("uses the provided consent endpoint, if any", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(mockAccessRequestVc(), undefined, {
      consentEndpoint: "https://some.consent-endpoint.override/",
      fetch: jest.fn(),
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      "https://some.consent-endpoint.override/".concat("issue"),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("uses the provided fetch, if any", async () => {
    mockConsentEndpoint();
    const mockedFetch = jest.fn(global.fetch);
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(mockAccessRequestVc(), undefined, {
      fetch: mockedFetch,
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { fetch: mockedFetch }
    );
  });

  it("issues a proper access grant from a request VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(mockAccessRequestVc(), undefined, {
      fetch: jest.fn(global.fetch),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockAccessRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockAccessRequestVc().credentialSubject.id,
        },
        inbox: mockAccessRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a fully custom input", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(
      undefined,
      {
        access: { append: true },
        requestor: "https://some-custom.requestor",
        resources: ["https://some-custom.resource"],
        requestorInboxIri: "https://some-custom.inbox",
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      "https://some-custom.requestor",
      expect.objectContaining({
        providedConsent: {
          mode: ["http://www.w3.org/ns/auth/acl#Append"],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData: ["https://some-custom.resource"],
          isProvidedTo: "https://some-custom.requestor",
        },
        inbox: "https://some-custom.inbox",
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a partially overriden request VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(
      mockAccessRequestVc(),
      {
        resources: ["https://some-custom.resource"],
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockAccessRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData: ["https://some-custom.resource"],
          isProvidedTo: mockAccessRequestVc().credentialSubject.id,
        },
        inbox: mockAccessRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a given request VC IRI", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockAccessRequestVc()))
      );
    await approveAccessRequest("https://some.credential", undefined, {
      fetch: mockedFetch,
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockAccessRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockAccessRequestVc().credentialSubject.id,
        },
        inbox: mockAccessRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });
});

describe("approveAccessRequestWithConsent", () => {
  mockConsentEndpoint();
  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => unknown;
      },
      "issueVerifiableCredential"
    );
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;

    await approveAccessRequestWithConsent(mockConsentRequestVc());

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

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("throws if the provided VC isn't a VC of type Solid Consent request", async () => {
    mockConsentEndpoint();
    await expect(
      approveAccessRequestWithConsent({
        ...mockConsentRequestVc(),
        type: ["NotASolidConsentRequest"],
      })
    ).rejects.toThrow(
      "An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential."
    );
  });

  it("throws if the provided VC isn't an access request", async () => {
    mockConsentEndpoint();
    const accessRequestWithConsent = mockConsentRequestVc();
    await expect(
      approveAccessRequestWithConsent({
        ...accessRequestWithConsent,
        credentialSubject: {
          ...accessRequestWithConsent.credentialSubject,
          hasConsent: {
            ...accessRequestWithConsent.credentialSubject.hasConsent,
            hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          },
        },
      })
    ).rejects.toThrow(/Unexpected VC.*credentialSubject/);
  });

  it("issues a proper consent grant from a given request VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(mockConsentRequestVc(), undefined, {
      fetch: jest.fn(global.fetch),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockConsentGrantVc().credentialSubject.providedConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockConsentGrantVc().credentialSubject.providedConsent
              .forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose:
            mockConsentGrantVc().credentialSubject.providedConsent.forPurpose,
        },
        inbox: mockConsentGrantVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a proper consent grant from a totally overriden request VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      mockConsentRequestVc(),
      {
        access: { append: true },
        expirationDate: new Date(2021, 9, 14),
        issuanceDate: new Date(2021, 9, 15),
        purpose: ["https://some-custom.purpose"],
        requestor: "https://some-custom.requestor",
        resources: ["https://some-custom.resource"],
        requestorInboxIri: "https://some-custom.inbox",
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      "https://some-custom.requestor",
      expect.objectContaining({
        providedConsent: {
          mode: ["http://www.w3.org/ns/auth/acl#Append"],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData: ["https://some-custom.resource"],
          isProvidedTo: "https://some-custom.requestor",
          forPurpose: ["https://some-custom.purpose"],
        },
        inbox: "https://some-custom.inbox",
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a proper consent grant from a request override alone", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      undefined,
      {
        access: { append: true },
        expirationDate: new Date(2021, 9, 14),
        issuanceDate: new Date(2021, 9, 15),
        purpose: ["https://some-custom.purpose"],
        requestor: "https://some-custom.requestor",
        resources: ["https://some-custom.resource"],
        requestorInboxIri: "https://some-custom.inbox",
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      "https://some-custom.requestor",
      expect.objectContaining({
        providedConsent: {
          mode: ["http://www.w3.org/ns/auth/acl#Append"],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData: ["https://some-custom.resource"],
          isProvidedTo: "https://some-custom.requestor",
          forPurpose: ["https://some-custom.purpose"],
        },
        inbox: "https://some-custom.inbox",
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a consent grant overriding only the issuance of the provided VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      mockConsentRequestVc(),
      {
        issuanceDate: new Date(2021, 8, 15),
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockConsentGrantVc().credentialSubject.providedConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockConsentGrantVc().credentialSubject.providedConsent
              .forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose:
            mockConsentGrantVc().credentialSubject.providedConsent.forPurpose,
        },
        inbox: mockConsentRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
        expirationDate: mockConsentRequestVc().expirationDate,
        issuanceDate: new Date(2021, 8, 15).toISOString(),
      }),
      expect.anything()
    );
  });

  it("issues a consent grant overriding only the expiration of the provided VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      mockConsentRequestVc(),
      {
        expirationDate: new Date(2021, 8, 16),
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockConsentRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockConsentRequestVc().credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose:
            mockConsentRequestVc().credentialSubject.hasConsent.forPurpose,
        },
        inbox: mockConsentRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
        issuanceDate: mockConsentRequestVc().issuanceDate,
        expirationDate: new Date(2021, 8, 16).toISOString(),
      }),
      expect.anything()
    );
  });

  it("issues a consent grant with undefined expiration date", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      {
        ...mockConsentRequestVc(),
        expirationDate: undefined,
      },
      undefined,
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockConsentRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockConsentRequestVc().credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose:
            mockConsentRequestVc().credentialSubject.hasConsent.forPurpose,
        },
        inbox: mockConsentRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
        issuanceDate: mockConsentRequestVc().issuanceDate,
      }),
      expect.anything()
    );
  });

  it("issues a proper consent grant from a given request VC IRI", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockConsentRequestVc()))
      );
    await approveAccessRequestWithConsent(
      new URL("https://some.credential"),
      undefined,
      {
        fetch: mockedFetch,
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        providedConsent: {
          mode: mockConsentRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            mockConsentRequestVc().credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose:
            mockConsentRequestVc().credentialSubject.hasConsent.forPurpose,
        },
        inbox: mockConsentRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });
});
