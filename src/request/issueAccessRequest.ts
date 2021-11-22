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

import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import {
  getRequestBody,
  issueAccessOrConsentVc,
} from "../util/issueAccessOrConsentVc";
import { GC_CONSENT_STATUS_REQUESTED } from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type { IssueAccessRequestParameters } from "../type/IssueAccessRequestParameters";

/**
 * Request access to a given Resource.
 *
 * @param params Access to request.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A signed Verifiable Credential representing the access request.
 * @since 0.0.1
 */
async function issueAccessRequest(
  params: IssueAccessRequestParameters,
  options: AccessBaseOptions = {}
): Promise<VerifiableCredential> {
  const consentRequest = getRequestBody({
    ...params,
    status: GC_CONSENT_STATUS_REQUESTED,
  });

  return issueAccessOrConsentVc(params.requestor, consentRequest, options);
}

export default issueAccessRequest;
export { issueAccessRequest };
export type { IssueAccessRequestParameters, VerifiableCredential };

/**
 * @hidden Deprecated alias of [[issueAccessRequest]]
 * @deprecated
 */
const requestAccess = issueAccessRequest;
export { requestAccess };

/**
 * @hidden Alias of [[issueAccessRequest]]
 * @deprecated
 */
const requestAccessWithConsent = issueAccessRequest;
export { requestAccessWithConsent };

/**
 * @hidden Deprecated alias of [[IssueAccessRequestParameters]], note that
 * whilst the types file does have a specific RequestAccessWithConsentParameters
 * type, it is not used here as it is compatible with just
 * IssueAccessRequestParameters.
 * @deprecated
 */
export type {
  IssueAccessRequestParameters as RequestAccessParameters,
  IssueAccessRequestParameters as RequestAccessWithConsentParameters,
};
