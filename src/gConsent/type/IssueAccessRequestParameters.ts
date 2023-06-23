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

/**
 * @module interfaces
 */

import type { WebId } from "@inrupt/solid-client";
import type { InputAccessRequestParameters } from "./Parameter";

/**
 * Required parameters to request access to one or more Resources.
 *
 * - `requestor`: WebID of the Agent requesting access to the given Resources.
 * - `requestorInboxUrl`: (Optional.) URL that an access grant receipt may be posted to.
 * - `resourceOwner`: WebID of an Agent controlling access to the given Resources.
 * - `access`: Level access to request on the given Resource.
 *             See {@link https://docs.inrupt.com/developer-tools/api/javascript/solid-client/interfaces/access_universal.access.html}.
 * - `resources`: Array of URLs of the Resources to which access is requested.
 * - `purpose`: (Optional.) URL representing what the requested access will be used for.
 * - `issuanceDate`: (Optional, set to the current time if left out.) Point in time from which the access should be granted.
 * - `expirationDate`: (Optional.) Point in time until when the access is needed.
 * - `inherit`: (Optional.) If Access is targeted at a container, it will **not** apply
 *              recursively to contained resources if this is set to false. Defaults to
 *              `true`.
 *
 * @since 0.4.0
 */
// TODO: Find out about the overlap with BaseRequestParameters (differs in status and resource owner)
// This parameter if not present should be fetched from the profile according to the design document
// TODO: Get rid of BaseRequestParameters in favour of this
export type IssueAccessRequestParameters = InputAccessRequestParameters;

/**
 * @hidden
 */
export interface DeprecatedAccessRequestParameters
  extends IssueAccessRequestParameters {
  requestor: WebId;
}
