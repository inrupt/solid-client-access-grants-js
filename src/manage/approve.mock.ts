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
import { jest } from "@jest/globals";
import {
  mockWellKnownNoConsent,
  mockWellKnownWithConsent,
} from "../request/request.mock";
import {
  BaseAccessBody,
  BaseConsentBody,
} from "../type/AccessVerifiableCredential";
import { CONSENT_CONTEXT } from "../constants";

export const mockConsentEndpoint = (withConsent = true): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getWellKnownSolid.mockResolvedValue(
    (withConsent
      ? mockWellKnownWithConsent()
      : mockWellKnownNoConsent()) as never
  );
};

export const mockAccessRequestVc = (): VerifiableCredential &
  BaseAccessBody => {
  return {
    "@context": CONSENT_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent: {
        forPersonalData: ["https://some.resource"],
        hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
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

export const mockAccessGrantVc = (): VerifiableCredential & BaseAccessBody => {
  return {
    "@context": CONSENT_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.resource.owner",
      hasConsent: {
        forPersonalData: ["https://some.resource"],
        hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
        isProvidedTo: "https://some.requestor",
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

export const mockConsentRequestVc = (): VerifiableCredential &
  BaseConsentBody => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestVc = mockAccessRequestVc() as any as VerifiableCredential &
    BaseConsentBody;
  requestVc.credentialSubject.hasConsent.forPurpose = ["https://some.purpose"];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};
