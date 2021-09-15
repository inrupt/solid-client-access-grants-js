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
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { jest, it, describe, expect } from "@jest/globals";
// This ESLint plugin seems to not be able to resolve subpackage imports:
// eslint-disable-next-line import/no-unresolved
import { mocked } from "ts-jest/utils";
import {
  AccessGrantBody,
  ConsentGrantBody,
  getConsentEndpointForResource,
} from "../consent.internal";
import {
  MOCKED_CONSENT_ENDPOINT,
  mockWellKnownNoConsent,
  mockWellKnownWithConsent,
} from "../request/request.mock";
import {
  approveAccessRequest,
  approveAccessRequestWithConsent,
} from "./approve";

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

const mockConsentEndpoint = (withConsent = true) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getWellKnownSolid.mockResolvedValue(
    (withConsent
      ? mockWellKnownWithConsent()
      : mockWellKnownNoConsent()) as never
  );
};

jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("@inrupt/solid-client-vc");

const mockAccessRequestVc = (): VerifiableCredential => {
  return {
    "@context": ["https://some.context"],
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent: {
        forPersonalData: ["https://some.resource"],
        hasStatus: "ConsentStatusRequested",
        mode: ["Read"],
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "some ISO date",
    issuer: "https://some.issuer",
    proof: {
      created: "some ISO date",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: ["SolidConsentRequest"],
  };
};

const mockConsentRequestVc = (): VerifiableCredential => {
  const requestVc = mockAccessRequestVc();
  (
    requestVc.credentialSubject as ConsentGrantBody["credentialSubject"]
  ).hasConsent.forPurpose = ["https://some.purpose"];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};

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
  it("throws if the provided VC isn't an access request", async () => {
    mockConsentEndpoint();
    await expect(
      approveAccessRequest({
        "@context": "https://some.context",
        id: "https://some.credential",
        credentialSubject: {
          id: "https://some.requestor",
          someClaim: "some value",
        },
        issuanceDate: "some ISO date",
        issuer: "https://some.issuer",
        proof: {
          created: "some ISO date",
          proofPurpose: "some proof purpose",
          proofValue: "some proof",
          type: "some proof type",
          verificationMethod: "some method",
        },
        type: ["Some credential type"],
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
      "https://some.consent-endpoint.override/",
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
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        hasConsent: {
          mode: (mockAccessRequestVc() as unknown as AccessGrantBody)
            .credentialSubject.hasConsent.mode,
          hasStatus: "ConsentStatusExplicitlyGiven",
          forPersonalData: (mockAccessRequestVc() as unknown as AccessGrantBody)
            .credentialSubject.hasConsent.forPersonalData,
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
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      "https://some-custom.requestor",
      expect.objectContaining({
        hasConsent: {
          mode: ["Append"],
          hasStatus: "ConsentStatusExplicitlyGiven",
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
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        hasConsent: {
          mode: (mockAccessRequestVc() as unknown as AccessGrantBody)
            .credentialSubject.hasConsent.mode,
          hasStatus: "ConsentStatusExplicitlyGiven",
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

  it("throws if the provided VC isn't an access request", async () => {
    mockConsentEndpoint();
    await expect(
      approveAccessRequestWithConsent({
        "@context": "https://some.context",
        id: "https://some.credential",
        credentialSubject: {
          id: "https://some.requestor",
          someClaim: "some value",
        },
        issuanceDate: "some ISO date",
        issuer: "https://some.issuer",
        proof: {
          created: "some ISO date",
          proofPurpose: "some proof purpose",
          proofValue: "some proof",
          type: "some proof type",
          verificationMethod: "some method",
        },
        type: ["Some credential type"],
      })
    ).rejects.toThrow(/Unexpected VC.*credentialSubject/);
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
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      "https://some-custom.requestor",
      expect.objectContaining({
        hasConsent: {
          mode: ["Append"],
          hasStatus: "ConsentStatusExplicitlyGiven",
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
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        hasConsent: {
          mode: (mockConsentRequestVc() as unknown as ConsentGrantBody)
            .credentialSubject.hasConsent.mode,
          hasStatus: "ConsentStatusExplicitlyGiven",
          forPersonalData: (
            mockConsentRequestVc() as unknown as ConsentGrantBody
          ).credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose: (mockConsentRequestVc() as unknown as ConsentGrantBody)
            .credentialSubject.hasConsent.forPurpose,
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
      `${MOCKED_CONSENT_ENDPOINT}/issue`,
      mockConsentRequestVc().credentialSubject.id,
      expect.objectContaining({
        hasConsent: {
          mode: (mockConsentRequestVc() as unknown as ConsentGrantBody)
            .credentialSubject.hasConsent.mode,
          hasStatus: "ConsentStatusExplicitlyGiven",
          forPersonalData: (
            mockConsentRequestVc() as unknown as ConsentGrantBody
          ).credentialSubject.hasConsent.forPersonalData,
          isProvidedTo: mockConsentRequestVc().credentialSubject.id,
          forPurpose: (mockConsentRequestVc() as unknown as ConsentGrantBody)
            .credentialSubject.hasConsent.forPurpose,
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
});
