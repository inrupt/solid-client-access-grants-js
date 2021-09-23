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

import { VerifiableCredential } from "@inrupt/solid-client-vc";
import type { UrlString } from "@inrupt/solid-client";
import type { ConsentGrantBaseOptions } from "../constants";
import {
  CONSENT_CONTEXT,
  CONSENT_STATUS_DENIED,
  CONSENT_STATUS_EXPLICITLY_GIVEN,
  CONSENT_STATUS_REQUESTED,
  CREDENTIAL_TYPE,
} from "../constants";
import {
  BaseAccessBody,
  dereferenceVcIri,
  getDefaultSessionFetch,
  issueAccessOrConsentVc,
} from "../consent.internal";

export function isUnknownObject(
  x: unknown
): x is { [key in PropertyKey]: unknown } {
  return x !== null && typeof x === "object";
}

export const consentStatus = new Set([
  CONSENT_STATUS_DENIED,
  CONSENT_STATUS_EXPLICITLY_GIVEN,
  CONSENT_STATUS_REQUESTED,
] as const);

export type ConsentStatus = typeof consentStatus extends Set<infer T>
  ? T
  : never;

export function isConsentContext(x: unknown): x is typeof CONSENT_CONTEXT {
  return (
    Array.isArray(x) &&
    CONSENT_CONTEXT.map((y) => x.includes(y)).reduce(
      (previous, current) => previous && current
    )
  );
}

export function isConsentStatus(x: unknown): x is ConsentStatus {
  return typeof x === "string" && (consentStatus as Set<string>).has(x);
}

// TODO: Fix type checking
export function isBaseAccessVerifiableCredential(
  x: unknown
): x is BaseAccessBody {
  return (
    isUnknownObject(x) &&
    isConsentContext(x["@context"]) &&
    Array.isArray(x.type) &&
    x.type.includes(CREDENTIAL_TYPE) &&
    isUnknownObject(x.credentialSubject) &&
    typeof x.credentialSubject.id === "string" &&
    isUnknownObject(x.credentialSubject.hasConsent) &&
    // TODO: Add mode check
    "mode" in x.credentialSubject.hasConsent &&
    isConsentStatus(x.credentialSubject.hasConsent.hasStatus) &&
    // TODO: Add Array of string check
    Array.isArray(x.credentialSubject.hasConsent.forPersonalData) &&
    typeof x.credentialSubject.inbox === "string"
  );
}

async function getBaseAccessVerifiableCredential(
  vc: VerifiableCredential | URL | UrlString,
  options: ConsentGrantBaseOptions
): Promise<BaseAccessBody> {
  // TODO: Actually test the getDefaultSessionFetch() gets called by default (refactor)
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  const fetchedVerifiableCredential =
    typeof vc === "string" || vc instanceof URL
      ? await dereferenceVcIri(vc, fetcher)
      : vc;
  if (!isBaseAccessVerifiableCredential(fetchedVerifiableCredential)) {
    throw new Error(
      `An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential.`
    );
  }
  return fetchedVerifiableCredential;
}

/**
 * Deny an access request. The content of the denied access request is provided
 * as a Verifiable Credential.
 *
 * @param vc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param options Optional properties to customise the access denial behaviour.
 * @returns A Verifiable Credential representing the denied access.
 * @since Unreleased.
 */
export async function denyAccessRequest(
  vc: VerifiableCredential | URL | UrlString,
  options: ConsentGrantBaseOptions = {}
): Promise<VerifiableCredential> {
  const baseAccessVerifiableCredential =
    await getBaseAccessVerifiableCredential(vc, options);

  const deniedAccessOrConsentVc: BaseAccessBody = {
    ...baseAccessVerifiableCredential,
    credentialSubject: {
      ...baseAccessVerifiableCredential.credentialSubject,
      hasConsent: {
        ...baseAccessVerifiableCredential.credentialSubject.hasConsent,
        hasStatus: CONSENT_STATUS_DENIED,
      },
    },
  };

  return issueAccessOrConsentVc(
    deniedAccessOrConsentVc.credentialSubject.id,
    deniedAccessOrConsentVc,
    options
  );
}
