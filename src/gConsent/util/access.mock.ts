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

import {
  type VerifiableCredential,
  getVerifiableCredentialFromResponse,
} from "@inrupt/solid-client-vc";
import type { UrlString } from "@inrupt/solid-client";
import type { DatasetCore, Quad } from "@rdfjs/types";
import type {
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
import type { ResourceAccessMode } from "../../type/ResourceAccessMode";
import type { AccessGrant } from "../type/AccessGrant";
import type { AccessRequest } from "../type/AccessRequest";
import { normalizeAccessRequest } from "../request/issueAccessRequest";
import { isAccessRequest } from "../guard/isAccessRequest";
import { normalizeAccessGrant } from "../manage/approveAccessRequest";
import { isAccessGrant } from "../guard/isAccessGrant";
import { response } from "../../../mocks/data";

export const mockAccessRequestVc = async (
  options?: Partial<{
    resources: UrlString[];
    modes: ResourceAccessMode[];
    resourceOwner: string | null;
    inherit: boolean;
    purpose: UrlString[];
  }>,
): Promise<AccessRequest & DatasetCore<Quad, Quad>> => {
  const asObject: Record<string, any> = {
    "@context": ACCESS_GRANT_CONTEXT_DEFAULT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      // hasConsent: {
      //   forPersonalData: options?.resources ?? ["https://some.resource"],
      //   hasStatus: GC_CONSENT_STATUS_REQUESTED,
      //   mode: options?.modes ?? ["http://www.w3.org/ns/auth/acl#Read"],
      //   isConsentForDataSubject:
      //     options?.resourceOwner === null
      //       ? undefined
      //       : "https://some.pod/profile#you",
      // },
      // inbox: "https://some.inbox",
    },
    // issuanceDate: "2022-02-22",
    // issuer: "https://some.issuer",
    // proof: {
    //   created: "2022-06-08T15:28:51.810Z",
    //   proofPurpose: "some proof purpose",
    //   proofValue: "some proof",
    //   type: "some proof type",
    //   verificationMethod: "some method",
    // },
    type: ["VerifiableCredential"],
  };

  if (options?.inherit) {
    asObject.inherit = options.inherit;
    asObject.credentialSubject.hasConsent.inherit = options.inherit;
  }

  if (options?.purpose) {
    asObject.credentialSubject.hasConsent.forPurpose = options.purpose;
  }

  const asString = JSON.stringify(asObject);
  const asResponse = new Response(asString, {
    headers: new Headers([["content-type", "application/ld+json"]]),
  });
  console.log("mocking", asObject);
  const accessRequest = normalizeAccessRequest(
    await getVerifiableCredentialFromResponse(asResponse, asObject.id, {
      fetch: async (url, ...args) => {
        if (url.toString() in response) {
          return response[url.toString() as keyof typeof response]();
        }
        throw new Error(`Unexpected URL [${url}]`);
      },
    }),
  );

  if (!isAccessRequest(accessRequest)) {
    throw new Error(
      `${JSON.stringify(accessRequest)} is not an Access Request`,
    );
  }

  return accessRequest;
};

export const mockAccessGrantVc = async (
  options?: Partial<{
    issuer: string;
    subjectId: string;
    inherit: boolean;
    resources: string[];
  }>,
): Promise<AccessGrant & DatasetCore<Quad, Quad>> => {
  const asObject = {
    "@context": ACCESS_GRANT_CONTEXT_DEFAULT,
    id: "https://some.credential",
    credentialSubject: {
      id: options?.subjectId ?? "https://some.resource.owner",
      providedConsent: {
        forPersonalData: options?.resources ?? ["https://some.resource"],
        hasStatus: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
        isProvidedTo: "https://some.requestor",
        inherit: options?.inherit ?? true,
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "1965-08-28",
    issuer: options?.issuer ?? "https://some.issuer",
    proof: {
      created: "2021-10-05",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: [CREDENTIAL_TYPE_ACCESS_GRANT],
  };

  const asString = JSON.stringify(asObject);
  const asResponse = new Response(asString, {
    headers: new Headers([["content-type", "application/ld+json"]]),
  });
  const accessGrant = normalizeAccessGrant(
    await getVerifiableCredentialFromResponse(asResponse, asObject.id),
  );

  // FIXME the type casting ias bad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!isAccessGrant(accessGrant as any)) {
    throw new Error("Not an access grant");
  }

  // FIXME type casting is bad
  return accessGrant as unknown as AccessGrant & DatasetCore<Quad, Quad>;
};

export const mockConsentRequestVc = async (): Promise<
  VerifiableCredential & BaseRequestBody & DatasetCore<Quad, Quad>
> => {
  const requestVc = await mockAccessRequestVc();
  requestVc.credentialSubject.hasConsent.forPurpose = ["https://some.purpose"];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};

export const mockConsentGrantVc = async (): Promise<
  VerifiableCredential & BaseGrantBody & DatasetCore<Quad, Quad>
> => {
  const requestVc = await mockAccessGrantVc();
  requestVc.credentialSubject.providedConsent.forPurpose = [
    "https://some.purpose",
  ];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};
