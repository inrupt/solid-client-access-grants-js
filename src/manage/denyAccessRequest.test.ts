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
import { denyAccessRequest } from "./denyAccessRequest";
import { mockAccessRequestVc, mockConsentEndpoint } from "./approve.mock";
import { MOCKED_CONSENT_ISSUER } from "../request/request.mock";

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

// TODO: Extract the fetch VC function and related tests
describe("denyAccessRequest", () => {
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

    await denyAccessRequest(mockAccessRequestVc());

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

  it("throws if the provided VC isn't a Solid consent request", async () => {
    mockConsentEndpoint();
    await expect(
      denyAccessRequest({
        ...mockAccessRequestVc(),
        type: ["NotASolidConsentRequest"],
      })
    ).rejects.toThrow(
      "An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential."
    );
  });

  it("throws if there is no well known consent endpoint", async () => {
    mockConsentEndpoint(false);
    await expect(denyAccessRequest(mockAccessRequestVc())).rejects.toThrow(
      "Cannot discover consent endpoint from [https://pod-provider.iri/resource/.well-known/solid]: the well-known document contains no value for property [http://inrupt.com/ns/ess#consentIssuer]."
    );
  });

  it("uses the provided consent endpoint, if any", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await denyAccessRequest(mockAccessRequestVc(), {
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
    await denyAccessRequest(mockAccessRequestVc(), {
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

  it("issues a proper denied access VC", async () => {
    mockConsentEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential"
    );
    await denyAccessRequest(mockAccessRequestVc(), {
      fetch: jest.fn(global.fetch),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        hasConsent: {
          mode: mockAccessRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData:
            mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData,
        },
        inbox: mockAccessRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("issues a proper denied access VC from a given access request VC IRI", async () => {
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
    await denyAccessRequest("https://some.credential", {
      fetch: mockedFetch,
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        id: mockAccessRequestVc().credentialSubject.id,
        hasConsent: {
          mode: mockAccessRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData:
            mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData,
        },
        inbox: mockAccessRequestVc().credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidConsentRequest"],
      }),
      expect.anything()
    );
  });

  it("can take a URL as VC IRI parameter", async () => {
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
    await denyAccessRequest(new URL("https://some.credential"), {
      fetch: mockedFetch,
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_CONSENT_ISSUER}/issue`,
      mockAccessRequestVc().credentialSubject.id,
      expect.objectContaining({
        id: mockAccessRequestVc().credentialSubject.id,
        hasConsent: {
          mode: mockAccessRequestVc().credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData:
            mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData,
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
