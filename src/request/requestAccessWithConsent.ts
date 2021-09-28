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
import {
  getRequestBody,
  issueAccessOrConsentVc,
} from "../util/issueAccessOrConsentVc";
import { CONSENT_STATUS_REQUESTED } from "../constants";
import { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { RequestAccessWithConsentParameters } from "../type/RequestAccessWithConsentParameters";

/**
 * Request access to a given Resource and proof that consent for a given use of that access was granted.
 *
 * @param params Access to request and constraints on how that access will be used.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A signed verifiable credential representing the access and consent request.
 */
async function requestAccessWithConsent(
  params: RequestAccessWithConsentParameters,
  options: ConsentApiBaseOptions = {}
): Promise<VerifiableCredential> {
  const consentRequest = getRequestBody({
    ...params,
    status: CONSENT_STATUS_REQUESTED,
  });
  return issueAccessOrConsentVc(params.requestor, consentRequest, options);
}

export { requestAccessWithConsent };
export default requestAccessWithConsent;
export type {
  ConsentApiBaseOptions,
  RequestAccessWithConsentParameters,
  VerifiableCredential,
};
