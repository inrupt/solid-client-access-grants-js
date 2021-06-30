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
import { Response } from "cross-fetch";
import {
  buildThing,
  getSolidDataset,
  mockSolidDatasetFrom,
  setThing,
} from "@inrupt/solid-client";
import { requestAccess, requestAccessWithConsent } from "./consent";
import {
  getConsentEndpointForWebId,
  getConsentRequestBody,
} from "./consent.internal";
import { SOLID_VC_ISSUER } from "./constants";

const MOCK_REQUESTOR_IRI = "https://some.pod/profile#me";
const MOCK_REQUESTEE_IRI = "https://some.pod/profile#you";

jest.mock("./consent.internal.ts", () => {
  const internalConsentModule = jest.requireActual(
    "./consent.internal.ts"
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
  return solidClientModule;
});
jest.mock("@inrupt/solid-client-authn-browser");

describe("getConsentRequestBody", () => {
  it("can generate a minimal consent request body", () => {
    const consentRequestBody = getConsentRequestBody({
      access: { append: true },
      requestor: MOCK_REQUESTOR_IRI,
      resources: ["https://some.pod/resource"],
    });

    expect(consentRequestBody).toStrictEqual({
      credential: {
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
        },
        type: [
          "VerifiableCredential",
          "SolidCredential",
          "SolidConsentRequest",
        ],
      },
    });
  });

  it("can generate a full consent request body", () => {
    const consentRequestBody = getConsentRequestBody({
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
      purpose: "https://some.vocab/purpose#save-the-world",
      requestorInboxUrl: "https://some.pod/inbox/",
    });

    expect(consentRequestBody).toStrictEqual({
      credential: {
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
        type: [
          "VerifiableCredential",
          "SolidCredential",
          "SolidConsentRequest",
        ],
      },
    });
  });
});

describe("requestAccess", () => {
  it("sends a proper access request", async () => {
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
    const fetchFn = jest.fn(() =>
      Promise.resolve(new Response('["Signed request VC"]'))
    );

    await requestAccess(
      {
        access: { read: true },
        requestor: MOCK_REQUESTOR_IRI,
        requestee: MOCK_REQUESTEE_IRI,
        resources: ["https://some.pod/resource"],
      },
      { fetch: fetchFn }
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith("https://some.pod/issue", {
      method: "POST",
      body: `{"credential":{"@context":["https://www.w3.org/2018/credentials/v1","https://consent.pod.inrupt.com/credentials/v1"],"type":["VerifiableCredential","SolidCredential","SolidConsentRequest"],"credentialSubject":{"id":"${MOCK_REQUESTOR_IRI}","hasConsent":{"mode":["Read"],"hasStatus":"ConsentStatusRequested","forPersonalData":["https://some.pod/resource"]}}}}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;
    scab.fetch.mockResolvedValueOnce(new Response('["Signed request VC"]'));

    await requestAccess({
      access: { read: true },
      requestor: MOCK_REQUESTOR_IRI,
      requestee: MOCK_REQUESTEE_IRI,
      resources: ["https://some.pod/resource"],
    });

    expect(scab.fetch).toHaveBeenCalledTimes(1);
    expect(scab.fetch).toHaveBeenCalledWith("https://some.pod/issue", {
      method: "POST",
      body: `{"credential":{"@context":["https://www.w3.org/2018/credentials/v1","https://consent.pod.inrupt.com/credentials/v1"],"type":["VerifiableCredential","SolidCredential","SolidConsentRequest"],"credentialSubject":{"id":"${MOCK_REQUESTOR_IRI}","hasConsent":{"mode":["Read"],"hasStatus":"ConsentStatusRequested","forPersonalData":["https://some.pod/resource"]}}}}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });
});

describe("requestAccessWithConsent", () => {
  it("sends a proper access request", async () => {
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
    const fetchFn = jest.fn(() =>
      Promise.resolve(new Response('["Signed request VC"]'))
    );

    await requestAccessWithConsent(
      {
        access: { read: true },
        requestor: MOCK_REQUESTOR_IRI,
        requestee: MOCK_REQUESTEE_IRI,
        resources: ["https://some.pod/resource"],
        purpose: "https://some.vocab/purpose#save-the-world",
        issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
        expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
        requestorInboxUrl: "https://some.pod/inbox/",
      },
      { fetch: fetchFn }
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith("https://some.pod/issue", {
      method: "POST",
      body: `{"credential":{"@context":["https://www.w3.org/2018/credentials/v1","https://consent.pod.inrupt.com/credentials/v1"],"type":["VerifiableCredential","SolidCredential","SolidConsentRequest"],"credentialSubject":{"id":"${MOCK_REQUESTOR_IRI}","hasConsent":{"mode":["Read"],"hasStatus":"ConsentStatusRequested","forPersonalData":["https://some.pod/resource"],"forPurpose":["https://some.vocab/purpose#save-the-world"]},"inbox":"https://some.pod/inbox/"},"issuanceDate":"1955-06-08T13:37:42.042Z","expirationDate":"1990-11-12T13:37:42.042Z"}}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  it("initialises an issuance date when none is passed", async () => {
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
    const fetchFn = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(
      () => Promise.resolve(new Response('["Signed request VC"]'))
    );

    await requestAccessWithConsent(
      {
        access: { read: true },
        requestor: MOCK_REQUESTOR_IRI,
        requestee: MOCK_REQUESTEE_IRI,
        resources: ["https://some.pod/resource"],
        purpose: "https://some.vocab/purpose#save-the-world",
        issuanceDate: undefined,
      },
      { fetch: fetchFn }
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const consentRequestBody = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fetchFn.mock.calls[0][1]!.body as string
    );
    expect(consentRequestBody.credential).toHaveProperty("issuanceDate");
    expect(typeof consentRequestBody.credential.issuanceDate).toBe("string");
  });

  it("falls back to @inrupt/solid-client-authn-browser if no fetch function was passed", async () => {
    mocked(getConsentEndpointForWebId).mockResolvedValueOnce(
      "https://some.pod/issue"
    );
    // TypeScript can't infer the type of mock modules imported via Jest;
    // skip type checking for those:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scab = jest.requireMock("@inrupt/solid-client-authn-browser") as any;
    scab.fetch.mockResolvedValueOnce(new Response('["Signed request VC"]'));

    await requestAccessWithConsent({
      access: { read: true },
      requestor: MOCK_REQUESTOR_IRI,
      requestee: MOCK_REQUESTEE_IRI,
      resources: ["https://some.pod/resource"],
      purpose: "https://some.vocab/purpose#save-the-world",
      issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
      expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
      requestorInboxUrl: "https://some.pod/inbox/",
    });

    expect(scab.fetch).toHaveBeenCalledTimes(1);
    expect(scab.fetch).toHaveBeenCalledWith("https://some.pod/issue", {
      method: "POST",
      body: `{"credential":{"@context":["https://www.w3.org/2018/credentials/v1","https://consent.pod.inrupt.com/credentials/v1"],"type":["VerifiableCredential","SolidCredential","SolidConsentRequest"],"credentialSubject":{"id":"${MOCK_REQUESTOR_IRI}","hasConsent":{"mode":["Read"],"hasStatus":"ConsentStatusRequested","forPersonalData":["https://some.pod/resource"],"forPurpose":["https://some.vocab/purpose#save-the-world"]},"inbox":"https://some.pod/inbox/"},"issuanceDate":"1955-06-08T13:37:42.042Z","expirationDate":"1990-11-12T13:37:42.042Z"}}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });
});

describe("getConsentEndpointForWebId", () => {
  it("can find the consent endpoint for a given WebID", async () => {
    const mockProfile = buildThing({ url: MOCK_REQUESTEE_IRI })
      .addIri(SOLID_VC_ISSUER, "https://some.pod/issue")
      .build();
    let mockProfileDoc = mockSolidDatasetFrom(MOCK_REQUESTEE_IRI);
    mockProfileDoc = setThing(mockProfileDoc, mockProfile);
    mocked(getSolidDataset).mockResolvedValueOnce(mockProfileDoc);
    const fetchFn = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ issuer: "https://some.issuer" }))
      )
    );

    const consentEndpoint = await getConsentEndpointForWebId(
      MOCK_REQUESTEE_IRI,
      fetchFn
    );

    expect(consentEndpoint).toBe("https://some.issuer");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://some.pod/.well-known/vc-configuration"
    );
  });

  it("throws an error if the given WebID does not list a VC issuer", async () => {
    const mockProfile = buildThing({ url: MOCK_REQUESTEE_IRI })
      .addIri(
        "https://arbitrary.vocab/not-vc-issuer",
        "https://arbitrary.pod/not-issue"
      )
      .build();
    let mockProfileDoc = mockSolidDatasetFrom(MOCK_REQUESTEE_IRI);
    mockProfileDoc = setThing(mockProfileDoc, mockProfile);
    mocked(getSolidDataset).mockResolvedValueOnce(mockProfileDoc);

    await expect(() =>
      getConsentEndpointForWebId(MOCK_REQUESTEE_IRI, jest.fn())
    ).rejects.toThrow(
      `The WebID [${MOCK_REQUESTEE_IRI}] does not list VS Issuers.`
    );
  });

  it("throws an error if there is no profile at the given WebID", async () => {
    const mockProfileDoc = mockSolidDatasetFrom(MOCK_REQUESTEE_IRI);
    mocked(getSolidDataset).mockResolvedValueOnce(mockProfileDoc);

    await expect(() =>
      getConsentEndpointForWebId(MOCK_REQUESTEE_IRI, jest.fn())
    ).rejects.toThrow(`No profile found at the WebID [${MOCK_REQUESTEE_IRI}].`);
  });

  it("throws an error if the VC issuer does not list a consent endpoint", async () => {
    const mockProfile = buildThing({ url: MOCK_REQUESTEE_IRI })
      .addIri(SOLID_VC_ISSUER, "https://some.pod/issue")
      .build();
    let mockProfileDoc = mockSolidDatasetFrom(MOCK_REQUESTEE_IRI);
    mockProfileDoc = setThing(mockProfileDoc, mockProfile);
    mocked(getSolidDataset).mockResolvedValueOnce(mockProfileDoc);
    const fetchFn = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ not_an_issuer: "https://arbitrary-not.issuer" })
        )
      )
    );

    await expect(() =>
      getConsentEndpointForWebId(MOCK_REQUESTEE_IRI, fetchFn)
    ).rejects.toThrow(
      `The Issuer at [https://some.pod/issue] did not list a Consent Issuer URL.`
    );
  });
});
