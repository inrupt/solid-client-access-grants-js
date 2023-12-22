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

import type { UrlString } from "@inrupt/solid-client";
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { gc, solidVc } from "../../common/constants";
import { CREDENTIAL_TYPE_ACCESS_DENIAL } from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type { AccessGrant } from "../type/AccessGrant";
import { initializeGrantParameters } from "../util/initializeGrantParameters";
import { getGrantBody, issueAccessVc } from "../util/issueAccessVc";
import { normalizeAccessGrant } from "./approveAccessRequest";
import { getBaseAccess } from "../util/getBaseAccessVerifiableCredential";

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
  vc: DatasetWithId | VerifiableCredential | URL | UrlString,
  options: AccessBaseOptions & {
    returnLegacyJsonld: false;
  },
): Promise<DatasetWithId>;
/**
 * Deny an access request. The content of the denied access request is provided
 * as a Verifiable Credential.
 *
 * @param vc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param options Optional properties to customise the access denial behaviour.
 * @returns A Verifiable Credential representing the denied access.
 * @since 0.0.1
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
async function denyAccessRequest(
  vc: DatasetWithId | VerifiableCredential | URL | UrlString,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: true;
  },
): Promise<AccessGrant>;
/**
 * Deny an access request. The content of the denied access request is provided
 * as a Verifiable Credential.
 *
 * @param vc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param options Optional properties to customise the access denial behaviour.
 * @returns A Verifiable Credential representing the denied access.
 * @since 0.0.1
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
async function denyAccessRequest(
  vc: DatasetWithId | VerifiableCredential | URL | UrlString,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
  },
): Promise<DatasetWithId>;
async function denyAccessRequest(
  vc: DatasetWithId | VerifiableCredential | URL | UrlString,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
  },
): Promise<DatasetWithId> {
  const baseVc: DatasetWithId = await getBaseAccess(
    vc,
    options ?? {},
    solidVc.SolidAccessRequest,
  );

  const internalOptions = initializeGrantParameters(baseVc);
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

  return issueAccessVc(denialBody, {
    ...options,
    normalize: normalizeAccessGrant,
  });
}

export { denyAccessRequest };
export default denyAccessRequest;
export type { UrlString, VerifiableCredential };
