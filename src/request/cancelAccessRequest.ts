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
import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import { revokeAccess } from "./revokeAccess";
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";

/**
 * Cancel a request for access to data (with explicit or implicit consent) before
 * the person being asked for consent has replied.
 * This is equivalent to revoking a consent grant.
 *
 * @param accessRequest The access request, either in the form of a VC URL or a full-fledged VC.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A void promise
 * @since Unreleased
 */
// eslint-disable-next-line import/prefer-default-export
export async function cancelAccessRequest(
  accessRequest: VerifiableCredential | URL | UrlString,
  options: ConsentApiBaseOptions = {}
): Promise<void> {
  return revokeAccess(accessRequest, options);
}
