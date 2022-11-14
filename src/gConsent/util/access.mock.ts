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

import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { UrlString } from "@inrupt/solid-client";
import {
  BaseGrantBody,
  BaseRequestBody,
} from "../type/AccessVerifiableCredential";
import {
  ACCESS_GRANT_CONTEXT_DEFAULT,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_REQUEST,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
  GC_CONSENT_STATUS_REQUESTED,
} from "../constants";
import { ResourceAccessMode } from "../../type/ResourceAccessMode";
import { AccessGrant } from "../type/AccessGrant";
import { AccessRequest } from "../type/AccessRequest";

export const mockAccessRequestVc = (
  options?: Partial<{
    resources: UrlString[];
    modes: ResourceAccessMode[];
    resourceOwner: string | null;
  }>
): AccessRequest => {
  return {
    "@context": ACCESS_GRANT_CONTEXT_DEFAULT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent: {
        forPersonalData: options?.resources ?? ["https://some.resource"],
        hasStatus: GC_CONSENT_STATUS_REQUESTED,
        mode: options?.modes ?? ["http://www.w3.org/ns/auth/acl#Read"],
        isConsentForDataSubject:
          options?.resourceOwner === null
            ? undefined
            : "https://some.pod/profile#you",
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "2022-02-22",
    issuer: "https://some.issuer",
    proof: {
      created: "2022-06-08T15:28:51.810Z",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: [CREDENTIAL_TYPE_ACCESS_REQUEST],
  };
};

export const mockAccessGrantVc = (
  issuer = "https://some.issuer",
  subjectId = "https://some.resource.owner"
): AccessGrant => {
  return {
    "@context": ACCESS_GRANT_CONTEXT_DEFAULT,
    id: "https://some.credential",
    credentialSubject: {
      id: subjectId,
      providedConsent: {
        forPersonalData: ["https://some.resource"],
        hasStatus: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
        isProvidedTo: "https://some.requestor",
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "1965-08-28",
    issuer,
    proof: {
      created: "2021-10-05",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: [CREDENTIAL_TYPE_ACCESS_GRANT],
  };
};

export const mockConsentRequestVc = (): VerifiableCredential &
  BaseRequestBody => {
  const requestVc = mockAccessRequestVc();
  requestVc.credentialSubject.hasConsent.forPurpose = ["https://some.purpose"];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};

export const mockConsentGrantVc = (): VerifiableCredential & BaseGrantBody => {
  const requestVc = mockAccessGrantVc();
  requestVc.credentialSubject.providedConsent.forPurpose = [
    "https://some.purpose",
  ];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};
