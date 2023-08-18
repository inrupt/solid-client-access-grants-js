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
import { getRequestBody, issueAccessVc } from "../util/issueAccessVc";
import { GC_CONSENT_STATUS_REQUESTED } from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type {
  DeprecatedAccessRequestParameters,
  IssueAccessRequestParameters,
} from "../type/IssueAccessRequestParameters";
import type { AccessRequest } from "../type/AccessRequest";
import { isAccessRequest } from "../guard/isAccessRequest";

/**
 * Internal function. This is a stopgap until we have proper JSON-LD parsing.
 * It enforces the shape of the JSON returned by the issuer service, which may
 * vary while still serializing the same data.
 *
 * In particular, this transforms some literals into a one-value array.
 *
 * @hidden
 * @param accessRequest The grant returned by the VC issuer
 * @returns An equivalent JSON-LD document framed according to our typing.
 */
export function normalizeAccessRequest<T extends VerifiableCredential>(
  accessRequest: T,
): T {
  // Proper type checking is performed after normalization, so casting here is fine.
  const normalized = { ...accessRequest } as unknown as AccessRequest;
  if (!Array.isArray(normalized.credentialSubject.hasConsent.mode)) {
    normalized.credentialSubject.hasConsent.mode = [
      normalized.credentialSubject.hasConsent.mode,
    ];
  }
  if (!Array.isArray(normalized.credentialSubject.hasConsent.forPersonalData)) {
    normalized.credentialSubject.hasConsent.forPersonalData = [
      normalized.credentialSubject.hasConsent.forPersonalData,
    ];
  }
  if (typeof normalized.credentialSubject.hasConsent.inherit === "string") {
    // Literals are also interpreted based on the JSON-LD context, so a "true" value
    // could map to a "true"^^xsd:boolean, which is a boolean.
    normalized.credentialSubject.hasConsent.inherit =
      normalized.credentialSubject.hasConsent.inherit === "true";
  }
  // Cast back to the original type
  return normalized as unknown as T;
}

/**
 * Request access to a given Resource.
 *
 * @param params Access to request.
 * @param options Optional properties to customize the access request behavior.
 * @returns A signed Verifiable Credential representing the access request.
 * @since 0.4.0
 */
async function issueAccessRequest(
  params: IssueAccessRequestParameters,
  options?: AccessBaseOptions,
): Promise<AccessRequest>;
/**
 * @deprecated Please remove the `requestor` parameter.
 */
async function issueAccessRequest(
  params: DeprecatedAccessRequestParameters,
  options?: AccessBaseOptions,
): Promise<AccessRequest>;
async function issueAccessRequest(
  params: IssueAccessRequestParameters,
  options: AccessBaseOptions = {},
): Promise<AccessRequest> {
  const requestBody = getRequestBody({
    ...params,
    status: GC_CONSENT_STATUS_REQUESTED,
  });
  const accessRequest = normalizeAccessRequest(
    await issueAccessVc(requestBody, options),
  );
  if (!isAccessRequest(accessRequest)) {
    throw new Error(
      `${JSON.stringify(accessRequest)} is not an Access Request`,
    );
  }

  return accessRequest;
}

export default issueAccessRequest;
export { issueAccessRequest };
export type { IssueAccessRequestParameters, VerifiableCredential };
