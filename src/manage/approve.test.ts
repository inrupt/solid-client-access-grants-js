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
import {
  mockAccessApiEndpoint,
  MOCKED_ACCESS_ISSUER,
} from "../request/request.mock";
import { approveAccessRequestWithConsent } from "./approveAccessRequestWithConsent";
import { approveAccessRequest } from "./approveAccessRequest";
import {
  mockAccessRequestVc,
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
jest.mock("cross-fetch");

describe("approveAccessRequest", () => {
  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    const crossFetchModule = jest.requireMock("cross-fetch") as {
      fetch: typeof global.fetch;
    };
    crossFetchModule.fetch = mockAccessApiEndpoint();
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

    await approveAccessRequest(
      "https://some.resource/owner",
      mockAccessRequestVc()
    );

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

  it("throws if the provided VC isn't a solid consent request VC", async () => {
    mockAccessApiEndpoint();
    await expect(
      approveAccessRequest("https://some.resource/owner", {
        ...mockAccessRequestVc(),
        type: ["NotASolidAccessRequest"],
      })
    ).rejects.toThrow(
      "An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential."
    );
  });

  it("throws if the provided VC isn't an access request", async () => {
    mockAccessApiEndpoint();
    const accessRequest = mockAccessRequestVc();
    await expect(
      approveAccessRequest("https://some.resource/owner", {
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
    await approveAccessRequest(
      "https://some.resource/owner",
      mockAccessRequestVc(),
      undefined,
      {
        consentEndpoint: "https://some.consent-endpoint.override/",
        fetch: jest.fn(),
      }
    );
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      "https://some.consent-endpoint.override/".concat("issue"),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("uses the provided fetch, if any", async () => {
    mockAccessApiEndpoint();
    const mockedFetch = jest.fn(global.fetch);
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(
      "https://some.resource/owner",
      mockAccessRequestVc(),
      undefined,
      {
        fetch: mockedFetch,
      }
    );
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { fetch: mockedFetch }
    );
  });

  it("issues a proper access grant from a request VC", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(
      "https://some.resource/owner",
      mockAccessRequestVc(),
      undefined,
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a fully custom input", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(
      "https://some.resource/owner",
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
      `${MOCKED_ACCESS_ISSUER}/issue`,
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a partially overriden request VC", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequest(
      "https://some.resource/owner",
      mockAccessRequestVc(),
      {
        resources: ["https://some-custom.resource"],
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      mockConsentRequestVc().credentialSubject.id,
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a given request VC IRI", async () => {
    mockAccessApiEndpoint();
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
    await approveAccessRequest(
      "https://some.resource/owner",
      "https://some.credential",
      undefined,
      {
        fetch: mockedFetch,
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });
});

describe("approveAccessRequestWithConsent", () => {
  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mockAccessApiEndpoint();
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

    await approveAccessRequestWithConsent(
      "https://some.resource.owner/webid",
      mockConsentRequestVc()
    );

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

  it("throws if the provided VC isn't a VC of type Solid Consent request", async () => {
    mockAccessApiEndpoint();
    await expect(
      approveAccessRequestWithConsent("https://some.resource/owner", {
        ...mockConsentRequestVc(),
        type: ["NotASolidAccessRequest"],
      })
    ).rejects.toThrow(
      "An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential."
    );
  });

  it("throws if the provided VC isn't an access request", async () => {
    mockAccessApiEndpoint();
    const accessRequestWithConsent = mockConsentRequestVc();
    await expect(
      approveAccessRequestWithConsent("https://some.resource/owner", {
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
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      "https://some.resource/owner",
      mockConsentRequestVc(),
      undefined,
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a proper consent grant from a totally overriden request VC", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      "https://some.resource/owner",
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
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a proper consent grant from a request override alone", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      "https://some.resource/owner",
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
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a consent grant overriding only the issuance of the provided VC", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      "https://some.resource/owner",
      mockConsentRequestVc(),
      {
        issuanceDate: new Date(2021, 8, 15),
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
        expirationDate: mockConsentRequestVc().expirationDate,
        issuanceDate: new Date(2021, 8, 15).toISOString(),
      }),
      expect.anything()
    );
  });

  it("issues a consent grant overriding only the expiration of the provided VC", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      "https://some.resource/owner",
      mockConsentRequestVc(),
      {
        expirationDate: new Date(2021, 8, 16),
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
        issuanceDate: mockConsentRequestVc().issuanceDate,
        expirationDate: new Date(2021, 8, 16).toISOString(),
      }),
      expect.anything()
    );
  });

  it("issues a consent grant with undefined expiration date", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await approveAccessRequestWithConsent(
      "https://some.resource/owner",
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
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
        issuanceDate: mockConsentRequestVc().issuanceDate,
      }),
      expect.anything()
    );
  });

  it("issues a proper consent grant from a given request VC IRI", async () => {
    mockAccessApiEndpoint();
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
      "https://some.resource/owner",
      new URL("https://some.credential"),
      undefined,
      {
        fetch: mockedFetch,
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      "https://some.resource/owner",
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
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });
});
