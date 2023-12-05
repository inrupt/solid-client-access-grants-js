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
import type { DatasetWithId } from "@inrupt/solid-client-vc";
import { getAccessGrant } from "../manage";
import { GRANT_VC_URL_PARAM_NAME } from "../manage/redirectToRequestor";
import type { AccessGrant } from "../type/AccessGrant";

/**
 * Get the Access Grant out of the incoming redirect from the Access Management app.
 *
 * @param redirectUrl The URL the user has been redirected to from the access
 * management app.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Grant
 * @since 0.5.0
 */
export async function getAccessGrantFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options: { fetch?: typeof fetch; returnLegacyJsonld: false },
): Promise<DatasetWithId>;
/**
 * Get the Access Grant out of the incoming redirect from the Access Management app.
 *
 * @param redirectUrl The URL the user has been redirected to from the access
 * management app.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Grant
 * @since 0.5.0
 * @deprecated Use RDFJS API
 */
export async function getAccessGrantFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: true },
): Promise<AccessGrant>;
/**
 * Get the Access Grant out of the incoming redirect from the Access Management app.
 *
 * @param redirectUrl The URL the user has been redirected to from the access
 * management app.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Grant
 * @since 0.5.0
 * @deprecated Use RDFJS API
 */
export async function getAccessGrantFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: boolean },
): Promise<DatasetWithId>;
export async function getAccessGrantFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options: { fetch?: typeof fetch; returnLegacyJsonld?: boolean } = {},
): Promise<DatasetWithId> {
  const redirectUrlObj =
    typeof redirectUrl === "string" ? new URL(redirectUrl) : redirectUrl;

  const accessGrantIri = redirectUrlObj.searchParams.get(
    GRANT_VC_URL_PARAM_NAME,
  );
  if (accessGrantIri === null) {
    throw new Error(
      `The provided redirect URL [${redirectUrl}] is missing the expected [${GRANT_VC_URL_PARAM_NAME}] query parameter`,
    );
  }

  return getAccessGrant(accessGrantIri, options);
}

export default getAccessGrantFromRedirectUrl;
