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

import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import type { UrlString, WebId } from "@inrupt/solid-client";
import { CREDENTIAL_TYPE_ACCESS_DENIAL } from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getGrantBody, issueAccessVc } from "../util/issueAccessVc";
import { getBaseAccessRequestVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { initializeGrantParameters } from "../util/initializeGrantParameters";
import { normalizeAccessGrant } from "./approveAccessRequest";
import type { AccessGrant } from "../type/AccessGrant";
import { gc } from "../../common/constants";

// Merge back in denyAccessRequest after the deprecated signature has been removed.
// eslint-disable-next-line camelcase
async function internal_denyAccessRequest(
  vc: VerifiableCredential | URL | UrlString,
  options: AccessBaseOptions,
): Promise<VerifiableCredential> {
  const baseAccessVerifiableCredential =
    await getBaseAccessRequestVerifiableCredential(vc, options);

  const internalOptions = initializeGrantParameters(
    baseAccessVerifiableCredential,
  );
  const denialBody = getGrantBody({
    access: internalOptions.access,
    requestor: internalOptions.requestor,
    resources: internalOptions.resources,
    requestorInboxUrl: internalOptions.requestorInboxUrl,
    status: gc.ConsentStatusExplicitlyGiven.value,
    purpose: internalOptions.purpose,
    // denyAccessRequest doesn't take an override, so the expiration date
    // cannot be null.
    expirationDate: internalOptions.expirationDate as Date | undefined,
  });
  denialBody.type = [CREDENTIAL_TYPE_ACCESS_DENIAL];
  denialBody.credentialSubject.providedConsent.hasStatus =
    gc.ConsentStatusDenied.value;

  return issueAccessVc(denialBody, options);
}
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
  vc: VerifiableCredential | URL | UrlString,
  options?: AccessBaseOptions,
): Promise<AccessGrant>;
/**
 * @deprecated Please remove the `resourceOwner` parameter.
 */
async function denyAccessRequest(
  resourceOwner: WebId,
  vc: VerifiableCredential | URL | UrlString,
  options?: AccessBaseOptions,
): Promise<VerifiableCredential>;
async function denyAccessRequest(
  resourceOwnerOrVc: WebId | VerifiableCredential | URL | UrlString,
  vcOrOptions?: VerifiableCredential | URL | UrlString | AccessBaseOptions,
  options?: AccessBaseOptions,
): Promise<VerifiableCredential> {
  if (
    typeof options !== "undefined" ||
    (typeof resourceOwnerOrVc === "string" &&
      typeof vcOrOptions === "string") ||
    // FIXME: Understand why adding this typeof vcOrOptions === "object" && was necessary before
    // making a release. Without it we were passing undefined to isVerifiableCredential
    (typeof vcOrOptions === "object" && isVerifiableCredential(vcOrOptions))
  ) {
    // The deprecated signature is being used: ignore the first parameter
    return internal_denyAccessRequest(
      vcOrOptions as VerifiableCredential | URL | UrlString,
      options ?? {},
    ).then(normalizeAccessGrant);
  }
  return internal_denyAccessRequest(
    resourceOwnerOrVc,
    (vcOrOptions as AccessBaseOptions) ?? {},
  ).then(normalizeAccessGrant);
}

export { denyAccessRequest };
export default denyAccessRequest;
export type { VerifiableCredential, UrlString };
