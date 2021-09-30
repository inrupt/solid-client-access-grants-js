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

import { Access, UrlString, WebId } from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import {
  getGrantBody,
  issueAccessOrConsentVc,
} from "../util/issueAccessOrConsentVc";
import { isAccessRequest } from "../guard/isAccessRequest";
import { isConsentRequest } from "../guard/isConsentRequest";
import { GC_CONSENT_STATUS_EXPLICITLY_GIVEN } from "../constants";
import { getBaseAccessVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { initializeGrantParameters } from "../util/initializeGrantParameters";

/**
 * Approve a consent request. The content of the approved consent request is provided
 * as a Verifiable Credential which properties may be overriden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Consent Request. If
 * not conform to a Consent Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable Credential.
 * @param options Optional properties to customise the consent grant behaviour.
 * @returns A Verifiable Credential representing the granted consent.
 * @since 0.0.1
 */
export async function approveAccessRequestWithConsent(
  // If the VC is specified, all the overrides become optional
  requestVc: VerifiableCredential | URL | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  }>,
  options?: ConsentApiBaseOptions
): Promise<VerifiableCredential>;
/**
 * Approve a consent request. The content of the approved consent request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Consent Request if provided.
 * @param requestOverride Claims constructing the Consent Grant.
 * @param options Optional properties to customise the consent grant behaviour.
 * @returns A Verifiable Credential representing the granted consent.
 * @since 0.0.1
 */
export async function approveAccessRequestWithConsent(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: {
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  },
  options?: ConsentApiBaseOptions
): Promise<VerifiableCredential>;
export async function approveAccessRequestWithConsent(
  requestVc?: VerifiableCredential | URL | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    purpose: Array<UrlString>;
    requestorInboxIri: UrlString;
    issuanceDate: Date;
    expirationDate: Date;
  }>,
  options: ConsentApiBaseOptions = {}
): Promise<VerifiableCredential> {
  const requestCredential =
    typeof requestVc !== "undefined"
      ? await getBaseAccessVerifiableCredential(requestVc, options)
      : requestVc;

  if (
    requestCredential !== undefined &&
    !(isAccessRequest(requestCredential) && isConsentRequest(requestCredential))
  ) {
    throw new Error(
      `Unexpected VC provided for approval: ${JSON.stringify(requestVc)}`
    );
  }
  const initialisedOptions = initializeGrantParameters(
    requestCredential,
    requestOverride
  );
  const requestBody = getGrantBody({
    access: initialisedOptions.access,
    requestor: initialisedOptions.requestor,
    resources: initialisedOptions.resources,
    requestorInboxUrl: initialisedOptions.requestorInboxIri,
    status: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
    purpose: initialisedOptions.purpose,
    issuanceDate: initialisedOptions.issuanceDate,
    expirationDate: initialisedOptions.expirationDate,
  });
  return issueAccessOrConsentVc(
    initialisedOptions.requestor,
    requestBody,
    options
  );
}

export default approveAccessRequestWithConsent;
export type { ConsentApiBaseOptions, UrlString, VerifiableCredential };
