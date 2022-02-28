/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { UrlString } from "@inrupt/solid-client";
import {
  BaseConsentGrantBody,
  BaseConsentRequestBody,
  BaseGrantBody,
  BaseRequestBody,
} from "../type/AccessVerifiableCredential";
import { ACCESS_GRANT_CONTEXT } from "../constants";
import { ResourceAccessMode } from "../type/ResourceAccessMode";

export const mockAccessRequestVc = (
  options?: Partial<{
    resources: UrlString[];
    modes: ResourceAccessMode[];
  }>
): VerifiableCredential & BaseRequestBody => {
  return {
    "@context": ACCESS_GRANT_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent: {
        forPersonalData: options?.resources ?? ["https://some.resource"],
        hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
        mode: options?.modes ?? ["http://www.w3.org/ns/auth/acl#Read"],
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "2022-02-22",
    issuer: "https://some.issuer",
    proof: {
      created: "some ISO date",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: ["SolidAccessRequest"],
  };
};

export const mockAccessGrantVc = (): VerifiableCredential & BaseGrantBody => {
  return {
    "@context": ACCESS_GRANT_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.resource.owner",
      providedConsent: {
        forPersonalData: ["https://some.resource"],
        hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
        isProvidedTo: "https://some.requestor",
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "1965-08-28",
    issuer: "https://some.issuer",
    proof: {
      created: "2021-10-05",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: ["SolidAccessRequest"],
  };
};

export const mockConsentRequestVc = (): VerifiableCredential &
  BaseConsentRequestBody => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestVc = mockAccessRequestVc() as any as VerifiableCredential &
    BaseConsentRequestBody;
  requestVc.credentialSubject.hasConsent.forPurpose = ["https://some.purpose"];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};

export const mockConsentGrantVc = (): VerifiableCredential &
  BaseConsentGrantBody => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestVc = mockAccessGrantVc() as any as VerifiableCredential &
    BaseConsentGrantBody;
  requestVc.credentialSubject.providedConsent.forPurpose = [
    "https://some.purpose",
  ];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};
