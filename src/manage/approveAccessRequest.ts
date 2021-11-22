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
import { GC_CONSENT_STATUS_EXPLICITLY_GIVEN } from "../constants";
import { getBaseAccessRequestVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { AccessBaseOptions } from "../type/AccessBaseOptions";
import { initializeGrantParameters } from "../util/initializeGrantParameters";

export type ApproveAccessRequestOverrides = {
  requestor: WebId;
  access: Partial<Access>;
  resources: Array<UrlString>;
  requestorInboxIri?: UrlString;
  purpose?: Array<UrlString>;
  issuanceDate?: Date;
  expirationDate?: Date;
};

/**
 * Approve an access request. The content of the approved access request is provided
 * as a Verifiable Credential which properties may be overriden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable Credential.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 */
export async function approveAccessRequest(
  resourceOwner: WebId,
  // If the VC is specified, all the overrides become optional
  requestVc: VerifiableCredential | URL | UrlString,
  requestOverride?: Partial<ApproveAccessRequestOverrides>,
  options?: AccessBaseOptions
): Promise<VerifiableCredential>;
/**
 * Approve an access request. The content of the approved access request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Access Request if provided.
 * @param requestOverride Claims constructing the Access Grant.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 */
export async function approveAccessRequest(
  resourceOwner: WebId,
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: ApproveAccessRequestOverrides,
  options?: AccessBaseOptions
): Promise<VerifiableCredential>;
export async function approveAccessRequest(
  resourceOwner: WebId,
  requestVc?: VerifiableCredential | URL | UrlString,
  requestOverride?: Partial<ApproveAccessRequestOverrides>,
  options: AccessBaseOptions = {}
): Promise<VerifiableCredential> {
  const requestCredential =
    typeof requestVc !== "undefined"
      ? await getBaseAccessRequestVerifiableCredential(requestVc, options)
      : requestVc;

  if (requestCredential !== undefined && !isAccessRequest(requestCredential)) {
    throw new Error(
      `Unexpected VC provided for approval: ${JSON.stringify(requestVc)}`
    );
  }

  const internalOptions = initializeGrantParameters(
    requestCredential,
    requestOverride
  );

  const requestBody = getGrantBody({
    resourceOwner,
    access: internalOptions.access,
    requestor: internalOptions.requestor,
    resources: internalOptions.resources,
    requestorInboxUrl: internalOptions.requestorInboxIri,
    purpose: internalOptions.purpose,
    issuanceDate: internalOptions.issuanceDate,
    expirationDate: internalOptions.expirationDate,
    status: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
  });
  return issueAccessOrConsentVc(resourceOwner, requestBody, options);
}

export default approveAccessRequest;
export type { UrlString, VerifiableCredential };

/**
 * @hidden alias for [[approveAccessRequest]]
 * @deprecated
 */
const approveAccessRequestWithConsent = approveAccessRequest;
export { approveAccessRequestWithConsent };
