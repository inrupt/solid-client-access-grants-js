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

import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import type { UrlString, WebId } from "@inrupt/solid-client";
import {
  CREDENTIAL_TYPE_ACCESS_DENIAL,
  GC_CONSENT_STATUS_DENIED,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
} from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getGrantBody, issueAccessVc } from "../util/issueAccessVc";
import { getBaseAccessRequestVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { initializeGrantParameters } from "../util/initializeGrantParameters";

/**
 * Deny an access request. The content of the denied access request is provided
 * as a Verifiable Credential.
 *
 * @param vc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param options Optional properties to customise the access denial behaviour.
 * @returns A Verifiable Credential representing the denied access.
 * @since 0.0.1
 */
async function denyAccessRequest(
  resourceOwner: WebId,
  vc: VerifiableCredential | URL | UrlString,
  options: AccessBaseOptions = {}
): Promise<VerifiableCredential> {
  const baseAccessVerifiableCredential =
    await getBaseAccessRequestVerifiableCredential(vc, options);

  const internalOptions = initializeGrantParameters(
    baseAccessVerifiableCredential
  );
  const denialBody = getGrantBody({
    resourceOwner,
    access: internalOptions.access,
    requestor: internalOptions.requestor,
    resources: internalOptions.resources,
    requestorInboxUrl: internalOptions.requestorInboxIri,
    status: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any; // FIXME
  denialBody.type = [CREDENTIAL_TYPE_ACCESS_DENIAL];
  denialBody.credentialSubject.providedConsent.hasStatus =
    GC_CONSENT_STATUS_DENIED;

  return issueAccessVc(resourceOwner, denialBody, options);
}

export { denyAccessRequest };
export default denyAccessRequest;
export type { VerifiableCredential, UrlString };
