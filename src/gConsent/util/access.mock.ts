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

import { type VerifiableCredential } from "@inrupt/solid-client-vc";
import type { UrlString } from "@inrupt/solid-client";
import type { DatasetCore, Quad } from "@rdfjs/types";
import type {
  BaseGrantBody,
  BaseRequestBody,
} from "../type/AccessVerifiableCredential";
import {
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_REQUEST,
  GC_CONSENT_STATUS_REQUESTED,
  MOCK_CONTEXT,
} from "../constants";
import type { ResourceAccessMode } from "../../type/ResourceAccessMode";
import type { AccessGrant } from "../type/AccessGrant";
import type { AccessRequest } from "../type/AccessRequest";
import { normalizeAccessRequest } from "../request/issueAccessRequest";
import { isAccessRequest } from "../guard/isAccessRequest";
import { normalizeAccessGrant } from "../manage/approveAccessRequest";
import { isAccessGrant } from "../guard/isAccessGrant";
import { getVerifiableCredentialFromResponse } from "../../parsing";

type RequestVcOptions = Partial<{
  resources: UrlString[];
  modes: ResourceAccessMode[];
  resourceOwner: string | null;
  inherit: boolean;
  purpose: UrlString[];
}>

export const mockAccessRequestVcObject = (
  options?: RequestVcOptions
) => {
  const hasConsent = {
    forPersonalData: options?.resources ?? ["https://some.resource"],
    hasStatus: GC_CONSENT_STATUS_REQUESTED,
    mode: options?.modes ?? ["http://www.w3.org/ns/auth/acl#Read"],
    isConsentForDataSubject: "https://some.pod/profile#you" as
      | string
      | undefined,
  };

  if (options?.resourceOwner === null) {
    delete hasConsent.isConsentForDataSubject;
  } else if (options?.resourceOwner) {
    hasConsent.isConsentForDataSubject = options?.resourceOwner;
  }

  const asObject: Record<string, any> = {
    "@context": MOCK_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent,
      inbox: "https://some.inbox",
    },
    issuanceDate: "2022-02-22T00:00:00.000Z",
    issuer: "https://some.issuer",
    proof: {
      created: "2022-06-08T15:28:51.810Z",
      proofPurpose: "https://example.org/some/proof/purpose",
      proofValue: "some proof",
      type: "Ed25519Signature2020",
      verificationMethod: "https://example.org/some/verification/method",
    },
    type: [CREDENTIAL_TYPE_ACCESS_REQUEST, "VerifiableCredential"],
  };

  if (typeof options?.inherit === "boolean") {
    asObject.inherit = options.inherit;
    asObject.credentialSubject.hasConsent.inherit = options.inherit;
  }

  if (options?.purpose) {
    asObject.credentialSubject.hasConsent.forPurpose = options.purpose;
  }

  return asObject
}

export const mockAccessRequestVc = async (
  options?: RequestVcOptions,
  framingOptions?: {
    // This should only be used for testing /issue calls
    expandModeUri?: boolean;
    skipValidation?: boolean;
  },
): Promise<AccessRequest & DatasetCore<Quad, Quad>> => {
  const asObject = mockAccessRequestVcObject(options);

  const asString = JSON.stringify(asObject, null, 2);
  const asResponse = new Response(asString, {
    headers: new Headers([["content-type", "application/ld+json"]]),
  });

  let accessRequest: VerifiableCredential & DatasetCore;
  let nonNormalizedResponse: any;
  try {
    nonNormalizedResponse = await getVerifiableCredentialFromResponse(
      asResponse,
      asObject.id,
    );
    accessRequest = normalizeAccessRequest(nonNormalizedResponse);
  } catch (e) {
    throw new Error(
      `Error [${e}] for [${asString}] with nonNormalizedResponse [${nonNormalizedResponse}]`,
    );
  }

  if (framingOptions?.skipValidation) {
    return accessRequest as unknown as AccessRequest & DatasetCore;
  }

  if (!isAccessRequest(accessRequest)) {
    throw new Error(
      `${JSON.stringify(
        accessRequest,
        null,
        2,
      )} is not an Access Request. Trying to reframe [${asString}] [${JSON.stringify(
        framingOptions,
      )}]`,
    );
  }

  if (framingOptions?.expandModeUri) {
    accessRequest.credentialSubject.hasConsent.mode =
      accessRequest.credentialSubject.hasConsent.mode.map(
        (mode) => `http://www.w3.org/ns/auth/acl#${mode}`,
      );
  }

  return accessRequest;
};

export const mockAccessGrantObject = (
  options?: Partial<{
    issuer: string;
    subjectId: string;
    inherit: boolean;
    resources: string[];
  }>,
) => ({
  "@context": MOCK_CONTEXT,
  id: "https://some.credential",
  credentialSubject: {
    id: options?.subjectId ?? "https://some.resource.owner",
    providedConsent: {
      forPersonalData: options?.resources ?? ["https://some.resource"],
      hasStatus: "ConsentStatusExplicitlyGiven",
      mode: ["http://www.w3.org/ns/auth/acl#Read"],
      isProvidedTo: "https://some.requestor",
      inherit: options?.inherit ?? true,
    },
    inbox: "https://some.inbox",
  },
  issuanceDate: "1965-08-28T00:00:00.000Z",
  issuer: options?.issuer ?? "https://some.issuer",
  proof: {
    created: "2021-10-05T00:00:00.000Z",
    proofPurpose: "https://example.org/some/proof/purpose",
    proofValue: "some proof",
    type: "Ed25519Signature2020",
    verificationMethod: "https://example.org/some/verification/method",
  },
  // FIXME: Confirm we need the vc type here
  type: [CREDENTIAL_TYPE_ACCESS_GRANT, "VerifiableCredential"],
});

export const mockAccessGrantVc = async (
  options?: Partial<{
    issuer: string;
    subjectId: string;
    inherit: boolean;
    resources: string[];
  }>,
  framingOptions?: {
    // This should only be used for testing /issue calls
    expandModeUri?: boolean;
  },
): Promise<AccessGrant & DatasetCore<Quad, Quad>> => {
  const asObject = mockAccessGrantObject(options);

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

  if (framingOptions?.expandModeUri) {
    // @ts-ignore
    accessGrant.credentialSubject?.providedConsent?.mode = // @ts-ignore
      accessGrant.credentialSubject?.providedConsent?.mode.map(
        (mode: string) => `http://www.w3.org/ns/auth/acl#${mode}`,
      );
  }

  // FIXME type casting is bad
  return accessGrant as unknown as AccessGrant & DatasetCore<Quad, Quad>;
};

export const mockConsentRequestVc = async (
  options?: RequestVcOptions,
  framingOptions?: {
    // This should only be used for testing /issue calls
    expandModeUri?: boolean;
  },
): Promise<
  VerifiableCredential & BaseRequestBody & DatasetCore<Quad, Quad>
> => {
  const requestVc = await mockAccessRequestVc(options, framingOptions);
  requestVc.credentialSubject.hasConsent.forPurpose = ["https://some.purpose"];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};

export const mockConsentGrantVc = async (
  options?: Partial<{
    issuer: string;
    subjectId: string;
    inherit: boolean;
    resources: string[];
  }>,
  framingOptions?: {
    // This should only be used for testing /issue calls
    expandModeUri?: boolean;
  },
): Promise<VerifiableCredential & BaseGrantBody & DatasetCore<Quad, Quad>> => {
  const requestVc = await mockAccessGrantVc(options, framingOptions);
  requestVc.credentialSubject.providedConsent.forPurpose = [
    "https://some.purpose",
  ];
  requestVc.expirationDate = new Date(2021, 8, 14).toISOString();
  requestVc.issuanceDate = new Date(2021, 8, 13).toISOString();
  return requestVc;
};
