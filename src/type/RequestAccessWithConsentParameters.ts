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

import type { UrlString } from "@inrupt/solid-client";
import type { RequestAccessParameters } from "./RequestAccessParameters";

/**
 * Required parameters to request access to one or more Resources.
 *
 * - `requestor`: WebID of the Agent requesting access to the given Resources.
 * - `resourceOwner`: WebID of an Agent controlling access to the given Resources.
 * - `access`: Level access to request on the given Resource.
 *             See {@link https://docs.inrupt.com/developer-tools/api/javascript/solid-client/interfaces/access_universal.access.html}.
 * - `resources`: Array of URLs of the Resources to which access is requested.
 * - `purpose`: URL representing what the requested access will be used for.
 * - `requestorInboxUrl`: (Optional.) URL that a consent receipt may be posted to.
 * - `issuanceDate`: (Optional, set to the current time if left out.) Point in time from which the access should be granted.
 * - `expirationDate`: (Optional.) Point in time until when the access is needed.
 */
// TODO: Find out about the overlap with BaseConsentParameters
export type RequestAccessWithConsentParameters = RequestAccessParameters & {
  purpose: Array<UrlString>;
  issuanceDate?: Date;
  expirationDate?: Date;
};
