//
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
 * Request access to a given Resource.
 *
 * @param params Access to request.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A signed Verifiable Credential representing the access request.
 * @since 0.4.0
 */
async function issueAccessRequest(
  params: IssueAccessRequestParameters,
  options?: AccessBaseOptions
): Promise<AccessRequest>;
/**
 * @deprecated Please remove the `requestor` parameter.
 */
async function issueAccessRequest(
  params: DeprecatedAccessRequestParameters,
  options?: AccessBaseOptions
): Promise<AccessRequest>;
async function issueAccessRequest(
  params: IssueAccessRequestParameters,
  options: AccessBaseOptions = {}
): Promise<AccessRequest> {
  const requestBody = getRequestBody({
    ...params,
    status: GC_CONSENT_STATUS_REQUESTED,
  });
  const accessRequest = await issueAccessVc(requestBody, options);
  if (!isAccessRequest(accessRequest)) {
    throw new Error(
      `${JSON.stringify(accessRequest)} is not an Access Request`
    );
  }

  return accessRequest;
}

export default issueAccessRequest;
export { issueAccessRequest };
export type { IssueAccessRequestParameters, VerifiableCredential };
