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
/* eslint-disable no-param-reassign */
import type { UrlString } from "@inrupt/solid-client";
import {
  verifiableCredentialToDataset,
  type VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { gc } from "../../common/constants";
import type { ResourceAccessMode } from "../../type/ResourceAccessMode";
import {
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_REQUEST,
  MOCK_CONTEXT,
} from "../constants";
import { normalizeAccessGrant } from "../manage/approveAccessRequest";
import { normalizeAccessRequest } from "../request/issueAccessRequest";
import type { AccessGrant } from "../type/AccessGrant";
import type { AccessRequest } from "../type/AccessRequest";

type RequestVcOptions = Partial<{
  resources: UrlString[];
  modes: ResourceAccessMode[];
  resourceOwner: string | null;
  inherit: boolean;
  purpose: UrlString[];
}>;

export const mockAccessRequestVcObject = (options?: RequestVcOptions) => {
  const hasConsent = {
    forPersonalData: options?.resources ?? ["https://some.resource"],
    hasStatus: gc.ConsentStatusRequested.value,
    mode: options?.modes ?? ["http://www.w3.org/ns/auth/acl#Read"],
    isConsentForDataSubject: "https://some.pod/profile#you" as
      | string
      | undefined,
  };

  if (options?.resourceOwner === null) {
    delete hasConsent.isConsentForDataSubject;
  } else if (options?.resourceOwner) {
    hasConsent.isConsentForDataSubject = options.resourceOwner;
  }

  // We want to be able to mutate the record so we cannot set as a const
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asObject: Record<string, any> = {
    "@context": MOCK_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent,
      inbox: "https://some.inbox",
    },
    issuanceDate: "2022-02-22T00:00:00.000Z",
    expirationDate: "2022-02-23T00:00:00.000Z",
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

  return asObject;
};

export const mockAccessRequestVc = async (
  options?: RequestVcOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modify?: (asObject: Record<string, any>) => void,
): Promise<AccessRequest> => {
  const asObject = mockAccessRequestVcObject(options) as VerifiableCredential;
  const modifiedObject = modify?.(asObject) ?? asObject;

  return (await verifiableCredentialToDataset(
    normalizeAccessRequest(modifiedObject),
    {
      baseIRI: modifiedObject.id,
      includeVcProperties: true,
    },
  )) as unknown as AccessRequest;
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
    purposes: string[];
  }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modify?: (asObject: Record<string, any>) => void,
): Promise<AccessGrant> => {
  const asObject = mockAccessGrantObject(options);
  modify?.(asObject);

  return (await verifiableCredentialToDataset(normalizeAccessGrant(asObject), {
    baseIRI: asObject.id,
    includeVcProperties: true,
  })) as unknown as AccessGrant;
};

export const mockConsentRequestVc = async (
  options?: RequestVcOptions,
): Promise<AccessRequest> => {
  const requestVc = await mockAccessRequestVc(options, (object) => {
    object.credentialSubject.hasConsent.forPurpose = ["https://some.purpose"];
    object.expirationDate = new Date(2021, 8, 14).toISOString();
    object.issuanceDate = new Date(2021, 8, 13).toISOString();
  });
  return requestVc;
};

export const mockConsentGrantVc = async (
  options?: Partial<{
    issuer: string;
    subjectId: string;
    inherit: boolean;
    resources: string[];
  }>,
): Promise<AccessGrant> => {
  const requestVc = await mockAccessGrantVc(options, (object) => {
    object.credentialSubject.providedConsent.forPurpose = [
      "https://some.purpose",
    ];
    object.expirationDate = new Date(2021, 8, 14).toISOString();
    object.issuanceDate = new Date(2021, 8, 13).toISOString();
  });
  return requestVc;
};
