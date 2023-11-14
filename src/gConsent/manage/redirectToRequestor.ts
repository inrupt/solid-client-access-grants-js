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
import { redirectWithParameters } from "../util/redirect";
import type { RedirectOptions } from "../../type/RedirectOptions";

export const GRANT_VC_URL_PARAM_NAME = "accessGrantUrl";
// The following is deprecated: passing VCs should only be done by IRI.
export const GRANT_VC_PARAM_NAME = "accessGrant";

/**
 * Redirect the user to the client which requested Access to a Resource. The Access
 * Grant is sent as part of the redirect.
 *
 * @param accessGrantVcId The ID of the Access Grant VC, which should be a URL
 * @param redirectUrl The URL where the client requesting access expects the
 * user to be redirected
 * @param options If you are in a NodeJS environment, you must specify a
 * callback to handle the redirection.
 * @returns A never resolving promise: the user is expected to be redirected away
 * from the page by this call, so no code should be expected to run in that context
 * after the redirect.
 * @since 0.5.0
 */
export async function redirectToRequestor(
  accessGrantVcId: UrlString | URL,
  redirectUrl: UrlString | URL,
  options: RedirectOptions = {},
): Promise<void> {
  return redirectWithParameters(
    redirectUrl.toString(),
    {
      [`${GRANT_VC_URL_PARAM_NAME}`]: encodeURI(accessGrantVcId.toString()),
    },
    options,
  );
}

export default redirectToRequestor;
