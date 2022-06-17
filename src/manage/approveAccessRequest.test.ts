//
// Copyright 2022 Inrupt Inc.
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

/* eslint-disable no-shadow */
import { mockSolidDatasetFrom } from "@inrupt/solid-client";
import { jest, it, describe, expect } from "@jest/globals";
import type { issueVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  mockAccessApiEndpoint,
  MOCKED_ACCESS_ISSUER,
} from "../request/request.mock";
import { approveAccessRequest } from "./approveAccessRequest";
import {
  mockAccessGrantVc,
  mockAccessRequestVc,
  mockConsentGrantVc,
  mockConsentRequestVc,
} from "../util/access.mock";

jest.mock("@inrupt/solid-client", () => {
  // TypeScript can't infer the type of modules imported via Jest;
  // skip type checking for those:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  solidClientModule.acp_v4 = {
    getResourceInfoWithAcr: jest.fn(),
    hasAccessibleAcr: jest.fn(),
    saveAcrFor: jest.fn(),
    setVcAccess: jest.fn(),
  };
  return solidClientModule;
});

jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("@inrupt/solid-client-vc");
jest.mock("cross-fetch");

const mockAcpClient = (
  options?: Partial<{
    hasAccessibleAcr: boolean;
    initialResource: unknown;
    updatedResource: unknown;
  }>
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireMock("@inrupt/solid-client") as any;
  solidClientModule.acp_v4.hasAccessibleAcr.mockReturnValueOnce(
    options?.hasAccessibleAcr ?? true
  );

  solidClientModule.acp_v4.setVcAccess.mockReturnValueOnce(
    options?.updatedResource ?? {}
  );
  solidClientModule.acp_v4.getResourceInfoWithAcr.mockResolvedValueOnce(
    options?.initialResource ?? {}
  );
  solidClientModule.acp_v4.saveAcrFor = jest.fn();
  return solidClientModule;
};

describe("approveAccessRequest", () => {
  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    const mockedAcpClient = mockAcpClient();
    const crossFetchModule = jest.requireMock("cross-fetch") as {
      fetch: typeof global.fetch;
    };
    crossFetchModule.fetch = mockAccessApiEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;

    await approveAccessRequest(mockAccessRequestVc());

    expect(mockedAcpClient.acp_v4.saveAcrFor).toHaveBeenCalledWith(
      expect.anything(),
      {
        fetch: scab.fetch,
      }
    );
    expect(mockedIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        fetch: scab.fetch,
      }
    );
  });

  // FIXME: This test must run before the other tests mocking the ACP client.
  // This means that some mocked isn't cleared properly between tests.
  it("updates the target resources' ACR appropriately", async () => {
    const mockedInitialResource = mockSolidDatasetFrom("https://some.resource");
    const mockedUpdatedResource = mockSolidDatasetFrom("https://some.acr");
    mockAcpClient({
      initialResource: mockedInitialResource,
      updatedResource: mockedUpdatedResource,
    });
    mockAccessApiEndpoint();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedClientModule = jest.requireMock("@inrupt/solid-client") as any;
    const spiedAcrLookup = jest.spyOn(
      mockedClientModule.acp_v4,
      "getResourceInfoWithAcr"
    );
    const spiedAcrUpdate = jest.spyOn(mockedClientModule.acp_v4, "setVcAccess");
    const spiedAcrSave = jest.spyOn(mockedClientModule.acp_v4, "saveAcrFor");
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());

    await approveAccessRequest(
      mockAccessRequestVc({
        modes: [
          "http://www.w3.org/ns/auth/acl#Write",
          "http://www.w3.org/ns/auth/acl#Read",
        ],
        resources: ["https://some.custom.resource"],
      }),
      undefined,
      {
        fetch: jest.fn(global.fetch),
      }
    );
    // Thehe resource's IRI is picked up from the access grant.
    expect(spiedAcrLookup).toHaveBeenCalledWith(
      "https://some.custom.resource",
      expect.anything()
    );
    // The resources' ACR is updated with the modes from the grant.
    expect(spiedAcrUpdate).toHaveBeenCalledWith(mockedInitialResource, {
      read: true,
      write: true,
      append: false,
    });
    // The resources' ACR is written back.
    expect(spiedAcrSave).toHaveBeenCalledWith(
      mockedUpdatedResource,
      expect.anything()
    );
  });

  it("throws if the resource's ACR cannot be accessed by the current user", async () => {
    mockAcpClient({ hasAccessibleAcr: false });
    mockAccessApiEndpoint();
    await expect(approveAccessRequest(mockAccessRequestVc())).rejects.toThrow(
      "The current user does not have access to the resource's Access Control Resource"
    );
  });

  it("throws if the provided VC isn't a solid access request VC", async () => {
    mockAccessApiEndpoint();
    await expect(
      approveAccessRequest({
        ...mockAccessRequestVc(),
        type: ["NotASolidAccessRequest"],
      })
    ).rejects.toThrow(
      "An error occurred when type checking the VC, it is not a BaseAccessVerifiableCredential."
    );
  });

  it("throws if the provided VC isn't an access request", async () => {
    mockAccessApiEndpoint();
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

  it("uses the provided access endpoint, if any", async () => {
    mockAcpClient();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(mockAccessRequestVc(), undefined, {
      accessEndpoint: "https://some.consent-endpoint.override/",
      fetch: jest.fn(),
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      "https://some.consent-endpoint.override/issue",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("uses the provided fetch, if any", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedFetch = jest.fn(global.fetch);
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(mockAccessRequestVc(), undefined, {
      fetch: mockedFetch,
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { fetch: mockedFetch }
    );
  });

  it("issues a proper access grant from a request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(mockAccessRequestVc(), undefined, {
      fetch: jest.fn(global.fetch),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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

  it("issues a proper access grant from a given request VC IRI", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    const mockedFetch = jest.fn(global.fetch);
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockConsentRequestVc()))
    );
    await approveAccessRequest("https://some.credential", undefined, {
      fetch: mockedFetch,
    });

    expect(mockedIssue).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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

  it("Throws if the returned VC is not an access grant from a VC IRI", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessRequestVc());
    const mockedFetch = jest.fn(global.fetch);
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockConsentRequestVc()))
    );

    await expect(
      approveAccessRequest("https://some.credential", undefined, {
        fetch: mockedFetch,
      })
    ).rejects.toThrow();
  });

  it("issues a proper access grant from a given request VC with purpose", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(mockConsentRequestVc(), undefined, {
      fetch: jest.fn(global.fetch),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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

  it("issues a proper access grant from a partially overridden request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
      mockConsentRequestVc(),
      {
        resources: ["https://some-custom.resource"],
        purpose: ["https://some-custom.purpose"],
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: mockConsentRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData: ["https://some-custom.resource"],
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose: ["https://some-custom.purpose"],
        },
        inbox: mockConsentRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
      }),
      expect.anything()
    );
  });

  it("issues a proper access grant from a totally overridden request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
      mockConsentRequestVc(),
      {
        access: { append: true },
        expirationDate: new Date(2021, 9, 14),
        issuanceDate: new Date(2021, 9, 15),
        purpose: ["https://some-custom.purpose"],
        requestor: "https://some-custom.requestor",
        resources: ["https://some-custom.resource"],
        requestorInboxUrl: "https://some-custom.inbox",
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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

  it("issues a proper access grant from a request override alone", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
      undefined,
      {
        access: { append: true },
        expirationDate: new Date(2021, 9, 14),
        issuanceDate: new Date(2021, 9, 15),
        purpose: ["https://some-custom.purpose"],
        requestor: "https://some-custom.requestor",
        resources: ["https://some-custom.resource"],
        requestorInboxUrl: "https://some-custom.inbox",
      },
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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

  it("issues a proper access grant overriding only the issuance of the provided VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
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

  it("issues a proper access grant overriding only the expiration of the provided VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
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

  it("issues a proper access grant with undefined expiration date", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
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

  it("issues a proper access grant from a request VC using the deprecated signature", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessGrantVc());
    await approveAccessRequest(
      "https://some.resource.owner",
      mockAccessRequestVc(),
      undefined,
      {
        fetch: jest.fn(global.fetch),
      }
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
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

  it("throws if the returned VC is not an Access Grant using the deprecated signature", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: typeof issueVerifiableCredential;
      },
      "issueVerifiableCredential"
    );
    mockedIssue.mockResolvedValueOnce(mockAccessRequestVc());
    await expect(
      approveAccessRequest(
        "https://some.resource.owner",
        mockAccessRequestVc(),
        undefined,
        {
          fetch: jest.fn(global.fetch),
        }
      )
    ).rejects.toThrow();
  });
});
