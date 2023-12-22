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

import { jest, it, describe, expect, beforeAll } from "@jest/globals";

import { mockSolidDatasetFrom } from "@inrupt/solid-client";
import type * as VcClient from "@inrupt/solid-client-vc";
import type * as SolidClient from "@inrupt/solid-client";
import {
  mockAccessApiEndpoint,
  MOCKED_ACCESS_ISSUER,
} from "../request/request.mock";
import {
  approveAccessRequest,
  normalizeAccessGrant,
} from "./approveAccessRequest";
import {
  mockAccessGrantVc,
  mockAccessRequestVc,
  mockConsentGrantVc,
  mockConsentRequestVc,
} from "../util/access.mock";

jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual(
    "@inrupt/solid-client",
  ) as typeof SolidClient;
  solidClientModule.getSolidDataset =
    jest.fn<(typeof SolidClient)["getSolidDataset"]>();
  solidClientModule.getWellKnownSolid =
    jest.fn<(typeof SolidClient)["getWellKnownSolid"]>();
  solidClientModule.acp_ess_2 = {
    ...solidClientModule.acp_ess_2,
    getResourceInfoWithAcr:
      jest.fn<(typeof SolidClient)["acp_ess_2"]["getResourceInfoWithAcr"]>(),
    hasAccessibleAcr: jest.fn<
      (typeof SolidClient)["acp_ess_2"]["hasAccessibleAcr"]
    >() as any,
    saveAcrFor: jest.fn<
      (typeof SolidClient)["acp_ess_2"]["saveAcrFor"]
    >() as any,
    setVcAccess: jest.fn<(typeof SolidClient)["acp_ess_2"]["setVcAccess"]>(),
  };
  return solidClientModule;
});

jest.mock("@inrupt/solid-client-vc", () => {
  const {
    verifiableCredentialToDataset,
    getCredentialSubject,
    getIssuanceDate,
    getIssuer,
    getExpirationDate,
    getId,
    getVerifiableCredential,
  } = jest.requireActual("@inrupt/solid-client-vc") as jest.Mocked<
    typeof VcClient
  >;
  return {
    verifiableCredentialToDataset,
    getCredentialSubject,
    getIssuanceDate,
    getIssuer,
    getExpirationDate,
    getId,
    issueVerifiableCredential: jest.fn(),
    getVerifiableCredential,
  };
});

const mockAcpClient = (
  options?: Partial<{
    hasAccessibleAcr: boolean;
    initialResource: SolidClient.WithServerResourceInfo & SolidClient.WithAcp;
    updatedResource: SolidClient.WithAccessibleAcr;
  }>,
) => {
  const solidClientModule = jest.requireMock(
    "@inrupt/solid-client",
  ) as jest.Mocked<typeof SolidClient>;
  solidClientModule.acp_ess_2.hasAccessibleAcr.mockReturnValueOnce(
    options?.hasAccessibleAcr ?? true,
  );

  if (options?.updatedResource) {
    solidClientModule.acp_ess_2.setVcAccess.mockReturnValueOnce(
      options?.updatedResource,
    );
  }

  if (options?.initialResource) {
    solidClientModule.acp_ess_2.getResourceInfoWithAcr.mockResolvedValueOnce(
      options?.initialResource,
    );
  }

  solidClientModule.acp_ess_2.saveAcrFor = jest.fn<
    typeof SolidClient.acp_ess_2.saveAcrFor
  >() as any;
  return solidClientModule;
};

const mockedInitialResource = mockSolidDatasetFrom(
  "https://some.resource",
) as unknown as SolidClient.WithServerResourceInfo & SolidClient.WithAcp;
const mockedUpdatedResource = mockSolidDatasetFrom(
  "https://some.acr",
) as unknown as SolidClient.WithAccessibleAcr;

const mockedClientModule = jest.requireMock(
  "@inrupt/solid-client",
) as jest.Mocked<typeof SolidClient>;
const spiedAcrLookup = jest.spyOn(
  mockedClientModule.acp_ess_2,
  "getResourceInfoWithAcr",
);
const spiedAcrUpdate = jest.spyOn(mockedClientModule.acp_ess_2, "setVcAccess");

describe("approveAccessRequest", () => {
  let accessRequestVc: Awaited<ReturnType<typeof mockAccessRequestVc>>;
  let accessGrantVc: Awaited<ReturnType<typeof mockAccessGrantVc>>;
  let consentRequestVc: Awaited<ReturnType<typeof mockConsentRequestVc>>;
  let consentGrantVc: Awaited<ReturnType<typeof mockConsentGrantVc>>;

  beforeAll(async () => {
    accessRequestVc = await mockAccessRequestVc();
    accessGrantVc = await mockAccessGrantVc();
    consentRequestVc = await mockConsentRequestVc();
    consentGrantVc = await mockConsentGrantVc();
  });

  // FIXME: This test must run before the other tests mocking the ACP client.
  // This means that some mocked isn't cleared properly between tests.
  it("updates the target resources' ACR appropriately", async () => {
    mockAcpClient({
      initialResource: mockedInitialResource,
      updatedResource: mockedUpdatedResource,
    });
    mockAccessApiEndpoint();

    const spiedAcrSave = jest.spyOn(mockedClientModule.acp_ess_2, "saveAcrFor");
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as typeof VcClient,
      "issueVerifiableCredential",
    );
    mockedIssue.mockResolvedValueOnce(accessGrantVc);

    await approveAccessRequest(
      await mockAccessRequestVc({
        modes: [
          "http://www.w3.org/ns/auth/acl#Write",
          "http://www.w3.org/ns/auth/acl#Read",
        ],
        resources: ["https://some.custom.resource"],
      }),
      undefined,
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );
    // The resource's IRI is picked up from the access grant.
    expect(spiedAcrLookup).toHaveBeenCalledWith(
      "https://some.custom.resource",
      expect.anything(),
    );
    // The resources' ACR is updated with the modes from the grant.
    expect(spiedAcrUpdate).toHaveBeenCalledWith(
      mockedInitialResource,
      {
        read: true,
        write: true,
        append: false,
      },
      { inherit: true },
    );

    // The resources' ACR is written back.
    expect(spiedAcrSave).toHaveBeenCalledWith(
      mockedUpdatedResource,
      expect.anything(),
    );
  });

  it("throws if the resource's ACR cannot be accessed by the current user", async () => {
    mockAcpClient({ hasAccessibleAcr: false });
    mockAccessApiEndpoint();
    await expect(approveAccessRequest(accessRequestVc)).rejects.toThrow(
      "The current user does not have access to the resource's Access Control Resource",
    );
  });

  it("throws if the provided VC isn't a solid access request VC", async () => {
    mockAccessApiEndpoint();
    await expect(
      approveAccessRequest(
        await mockAccessRequestVc(undefined, (object) => ({
          ...object,
          type: ["NotASolidAccessRequest"],
        })),
      ),
    ).rejects.toThrow(
      "An error occurred when type checking the VC: Not of type [http://www.w3.org/ns/solid/vc#SolidAccessRequest].",
    );
  });

  it("throws if the provided VC isn't an access request", async () => {
    mockAccessApiEndpoint();
    await expect(
      approveAccessRequest(
        await mockAccessRequestVc(undefined, (object) => ({
          ...object,
          credentialSubject: {
            ...object.credentialSubject,
            hasConsent: {
              ...object.hasConsent,
              hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
            },
          },
        })),
      ),
    ).rejects.toThrow(
      "An error occurred when type checking the VC: status not [https://w3id.org/GConsent#ConsentStatusRequested].",
    );
  });

  it("uses the provided access endpoint, if any", async () => {
    mockAcpClient();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(accessRequestVc, undefined, {
      accessEndpoint: "https://some.consent-endpoint.override/",
      fetch: jest.fn<typeof fetch>(),
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      "https://some.consent-endpoint.override/issue",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("uses the provided fetch, if any", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedFetch = jest.fn<typeof fetch>();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(accessRequestVc, undefined, {
      fetch: mockedFetch,
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        fetch: mockedFetch,
        normalize: normalizeAccessGrant,
        returnLegacyJsonld: undefined,
      },
    );
  });

  it("issues a proper access grant from a request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const mockedIssue = jest.spyOn(mockedVcModule, "issueVerifiableCredential");
    mockedIssue.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(accessRequestVc, undefined, {
      fetch: jest.fn<typeof fetch>(),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: accessRequestVc.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            accessRequestVc.credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: accessRequestVc.credentialSubject.id,
          forPurpose: [],
        },
        inbox: accessRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
      }),
      expect.anything(),
    );
  });

  it("issues a proper access grant from a given request VC IRI", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as typeof VcClient,
      "issueVerifiableCredential",
    );
    mockedIssue.mockResolvedValueOnce(accessGrantVc);
    const mockedFetch = jest.fn<typeof fetch>();
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(consentRequestVc)),
    );
    await approveAccessRequest("https://some.credential", undefined, {
      fetch: mockedFetch,
    });

    expect(mockedIssue).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: accessRequestVc.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            accessRequestVc.credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: accessRequestVc.credentialSubject.id,
          forPurpose: accessRequestVc.credentialSubject.hasConsent
            .forPurpose ?? ["https://some.purpose"],
        },
        inbox: accessRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
      }),
      expect.anything(),
    );
  });

  it("accepts the returned VC using the abbreviated status instead of the fully qualified IRI", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const mockedIssue = jest.spyOn(mockedVcModule, "issueVerifiableCredential");
    const mockedVc = accessGrantVc;
    mockedVc.credentialSubject.providedConsent.hasStatus =
      "ConsentStatusExplicitlyGiven";
    mockedIssue.mockResolvedValueOnce(mockedVc);
    await expect(
      approveAccessRequest(accessRequestVc, undefined, {
        fetch: jest.fn<typeof fetch>(),
        updateAcr: false,
      }),
    ).resolves.not.toThrow();
  });

  it("Throws if the returned VC is not an access grant from a VC IRI", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as typeof VcClient,
      "issueVerifiableCredential",
    );
    mockedIssue.mockResolvedValueOnce(accessRequestVc);
    const mockedFetch = jest.fn<typeof fetch>();
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(consentRequestVc)),
    );

    await expect(
      approveAccessRequest("https://some.credential", undefined, {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow();
  });

  it("issues a proper access grant from a given request VC with purpose", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(await mockAccessGrantVc());
    await approveAccessRequest(consentRequestVc, undefined, {
      fetch: jest.fn<typeof fetch>(),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: consentGrantVc.credentialSubject.providedConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            consentGrantVc.credentialSubject.providedConsent.forPersonalData,
          isProvidedTo: consentRequestVc.credentialSubject.id,
          forPurpose:
            consentGrantVc.credentialSubject.providedConsent.forPurpose,
        },
        inbox: consentGrantVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
      }),
      expect.anything(),
    );
  });

  it("issues a proper access grant from a partially overridden request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const mockedIssue = jest.spyOn(mockedVcModule, "issueVerifiableCredential");
    mockedIssue.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      consentRequestVc,
      {
        resources: ["https://some-custom.resource"],
        purpose: ["https://some-custom.purpose"],
      },
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: consentRequestVc.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData: ["https://some-custom.resource"],
          isProvidedTo: consentRequestVc.credentialSubject.id,
          forPurpose: ["https://some-custom.purpose"],
        },
        inbox: consentRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
      }),
      expect.anything(),
    );
  });

  it("allows overriding the 'inherit' parameter of the provided request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      await mockAccessRequestVc({ inherit: false }),
      {
        inherit: true,
      },
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );
    expect(spiedIssueRequest.mock.lastCall?.[1]).toMatchObject({
      providedConsent: {
        inherit: true,
      },
    });
  });

  it("issues a proper access grant from a totally overridden request VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      consentRequestVc,
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
        fetch: jest.fn<typeof fetch>(),
      },
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
      expect.anything(),
    );
  });

  it("issues a proper access grant from a request override alone", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
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
        fetch: jest.fn<typeof fetch>(),
      },
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
      expect.anything(),
    );
  });

  it("issues a proper access grant overriding only the issuance of the provided VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      consentRequestVc,
      {
        issuanceDate: new Date(2021, 8, 15),
      },
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: consentGrantVc.credentialSubject.providedConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            consentGrantVc.credentialSubject.providedConsent.forPersonalData,
          isProvidedTo: consentRequestVc.credentialSubject.id,
          forPurpose:
            consentGrantVc.credentialSubject.providedConsent.forPurpose,
        },
        inbox: consentRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
        expirationDate: consentRequestVc.expirationDate,
        issuanceDate: new Date(2021, 8, 15).toISOString(),
      }),
      expect.anything(),
    );
  });

  it("issues a proper access grant overriding only the expiration of the provided VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      consentRequestVc,
      {
        expirationDate: new Date(2021, 8, 16),
      },
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: consentRequestVc.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            consentRequestVc.credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: consentRequestVc.credentialSubject.id,
          forPurpose: consentRequestVc.credentialSubject.hasConsent.forPurpose,
        },
        inbox: consentRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
        issuanceDate: consentRequestVc.issuanceDate,
        expirationDate: new Date(2021, 8, 16).toISOString(),
      }),
      expect.anything(),
    );
  });

  it("issues a proper access grant nullifying only the expiration of the provided VC", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      consentRequestVc,
      {
        expirationDate: null,
      },
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: consentRequestVc.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            consentRequestVc.credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: consentRequestVc.credentialSubject.id,
          forPurpose: consentRequestVc.credentialSubject.hasConsent.forPurpose,
        },
        inbox: consentRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
        issuanceDate: consentRequestVc.issuanceDate,
        // The expiration date should have been overridden.
        expirationDate: undefined,
      }),
      expect.anything(),
    );
  });

  it("issues a proper access grant with undefined expiration date", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    spiedIssueRequest.mockResolvedValueOnce(accessGrantVc);
    await approveAccessRequest(
      {
        ...consentRequestVc,
        expirationDate: undefined,
      },
      undefined,
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: consentRequestVc.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          forPersonalData:
            consentRequestVc.credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: consentRequestVc.credentialSubject.id,
          forPurpose: consentRequestVc.credentialSubject.hasConsent.forPurpose,
        },
        inbox: consentRequestVc.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessGrant"],
        issuanceDate: consentRequestVc.issuanceDate,
      }),
      expect.anything(),
    );
  });

  it("normalizes equivalent JSON-LD VCs", async () => {
    mockAcpClient();
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock(
      "@inrupt/solid-client-vc",
    ) as typeof VcClient;
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const normalizedAccessGrant = accessGrantVc;
    // The server returns an equivalent JSON-LD with a different frame:
    spiedIssueRequest.mockImplementation(
      async (_, _1, _2, options) =>
        (
          (options as any)?.normalize ??
          ((e: VcClient.VerifiableCredentialBase) => e)
        )({
          ...normalizedAccessGrant,
          credentialSubject: {
            ...normalizedAccessGrant.credentialSubject,
            providedConsent: {
              ...normalizedAccessGrant.credentialSubject.providedConsent,
              // The 1-value array is replaced by the literal value.
              forPersonalData:
                normalizedAccessGrant.credentialSubject.providedConsent
                  .forPersonalData[0],
              mode: normalizedAccessGrant.credentialSubject.providedConsent
                .mode[0],
              inherit: "true",
            },
          },
        }) as VcClient.VerifiableCredential,
    );
    await expect(
      approveAccessRequest(accessRequestVc, undefined, {
        fetch: jest.fn<typeof fetch>(),
      }),
    ).resolves.toStrictEqual(normalizedAccessGrant);
  });

  it("updates the target resources' ACR if the updateAcr flag is ommitted from the options", async () => {
    mockAcpClient({
      initialResource: mockedInitialResource,
      updatedResource: mockedUpdatedResource,
    });
    mockAccessApiEndpoint();

    const spiedAcrSave = jest.spyOn(mockedClientModule.acp_ess_2, "saveAcrFor");
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as typeof VcClient,
      "issueVerifiableCredential",
    );
    mockedIssue.mockResolvedValueOnce(accessGrantVc);

    await approveAccessRequest(
      await mockAccessRequestVc({
        modes: [
          "http://www.w3.org/ns/auth/acl#Write",
          "http://www.w3.org/ns/auth/acl#Read",
        ],
        resources: ["https://some.custom.resource"],
      }),
      undefined,
      {
        fetch: jest.fn<typeof fetch>(),
      },
    );
    // The resource's IRI is picked up from the access grant.
    expect(spiedAcrLookup).toHaveBeenCalledWith(
      "https://some.custom.resource",
      expect.anything(),
    );
    // // The resources' ACR is updated with the modes from the grant.
    expect(spiedAcrUpdate).toHaveBeenCalledWith(
      mockedInitialResource,
      {
        read: true,
        write: true,
        append: false,
      },
      { inherit: true },
    );
    // The resources' ACR is written back.
    expect(spiedAcrSave).toHaveBeenCalled();
  });

  it("updates the target resources' ACR if the updateACR flag is set to true", async () => {
    mockAcpClient({
      initialResource: mockedInitialResource,
      updatedResource: mockedUpdatedResource,
    });
    mockAccessApiEndpoint();

    const spiedAcrSave = jest.spyOn(mockedClientModule.acp_ess_2, "saveAcrFor");
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as typeof VcClient,
      "issueVerifiableCredential",
    );

    mockedIssue.mockResolvedValueOnce(accessGrantVc);

    await approveAccessRequest(
      await mockAccessRequestVc({
        modes: [
          "http://www.w3.org/ns/auth/acl#Write",
          "http://www.w3.org/ns/auth/acl#Read",
        ],
        resources: ["https://some.custom.resource"],
      }),
      undefined,
      {
        fetch: jest.fn<typeof fetch>(),
        updateAcr: true,
      },
    );

    // The resource's IRI is picked up from the access grant.
    expect(spiedAcrLookup).toHaveBeenCalledWith(
      "https://some.custom.resource",
      expect.anything(),
    );
    // The resources' ACR is updated with the modes from the grant.
    expect(spiedAcrUpdate).toHaveBeenCalledWith(
      mockedInitialResource,
      {
        read: true,
        write: true,
        append: false,
      },
      { inherit: true },
    );

    // The resources' ACR is written back.
    expect(spiedAcrSave).toHaveBeenCalled();
  });

  it("does not update the target resources' ACR if the updateACR flag is set to false", async () => {
    mockAcpClient({
      initialResource: mockedInitialResource,
      updatedResource: mockedUpdatedResource,
    });
    mockAccessApiEndpoint();

    const spiedAcrSave = jest.spyOn(mockedClientModule.acp_ess_2, "saveAcrFor");
    const mockedIssue = jest.spyOn(
      jest.requireMock("@inrupt/solid-client-vc") as typeof VcClient,
      "issueVerifiableCredential",
    );
    mockedIssue.mockResolvedValueOnce(accessGrantVc);

    await approveAccessRequest(
      await mockAccessRequestVc({
        modes: [
          "http://www.w3.org/ns/auth/acl#Write",
          "http://www.w3.org/ns/auth/acl#Read",
        ],
        resources: ["https://some.custom.resource"],
      }),
      undefined,
      {
        fetch: jest.fn<typeof fetch>(),
        updateAcr: false,
      },
    );

    expect(spiedAcrLookup).toHaveBeenCalledTimes(0);
    expect(spiedAcrUpdate).toHaveBeenCalledTimes(0);
    expect(spiedAcrSave).toHaveBeenCalledTimes(0);
  });
});
