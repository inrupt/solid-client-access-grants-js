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
import { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { initializeGrantParameters } from "../util/initializeGrantParameters";

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
  requestVc: VerifiableCredential | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
  }>,
  options?: ConsentApiBaseOptions
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
  requestOverride: {
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri?: UrlString;
  },
  options?: ConsentApiBaseOptions
): Promise<VerifiableCredential>;
export async function approveAccessRequest(
  resourceOwner: WebId,
  requestVc?: VerifiableCredential | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
  }>,
  options: ConsentApiBaseOptions = {}
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
    status: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
  });
  return issueAccessOrConsentVc(
    internalOptions.requestor,
    requestBody,
    options
  );
}

export default approveAccessRequest;
export type { ConsentApiBaseOptions, UrlString, VerifiableCredential };
