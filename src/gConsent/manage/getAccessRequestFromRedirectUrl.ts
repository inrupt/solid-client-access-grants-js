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
import {
  REDIRECT_URL_PARAM_NAME,
  REQUEST_VC_URL_PARAM_NAME,
} from "../discover/redirectToAccessManagementUi";
import type { AccessRequest } from "../type/AccessRequest";
import getAccessRequest from "./getAccessRequest";

function getSearchParam(url: URL, param: string) {
  const value = url.searchParams.get(param);
  if (value === null) {
    throw new Error(
      `The provided redirect URL [${url.toString()}] is missing the expected [${param}] query parameter`,
    );
  }
  return value;
}

/**
 * Get the Access Request out of the incoming redirect from the Access Management app.
 *
 * @param redirectUrl The URL the user has been redirected to from the access
 * management app.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request, and the URL to which the corresponding grant should
 * be sent when redirecting the resource owner back to the requestor.
 * @since 0.5.0
 */
export async function getAccessRequestFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options: { fetch?: typeof fetch; returnLegacyJsonld: false },
): Promise<{
  accessRequest: DatasetWithId;
  requestorRedirectUrl: UrlString;
}>;
/**
 * Get the Access Request out of the incoming redirect from the Access Management app.
 *
 * @param redirectUrl The URL the user has been redirected to from the access
 * management app.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request, and the URL to which the corresponding grant should
 * be sent when redirecting the resource owner back to the requestor.
 * @since 0.5.0
 * @deprecated Use RDFJS API
 */
export async function getAccessRequestFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: true },
): Promise<{
  accessRequest: AccessRequest;
  requestorRedirectUrl: UrlString;
}>;
/**
 * Get the Access Request out of the incoming redirect from the Access Management app.
 *
 * @param redirectUrl The URL the user has been redirected to from the access
 * management app.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request, and the URL to which the corresponding grant should
 * be sent when redirecting the resource owner back to the requestor.
 * @since 0.5.0
 */
export async function getAccessRequestFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: boolean },
): Promise<{
  accessRequest: DatasetWithId;
  requestorRedirectUrl: UrlString;
}>;
export async function getAccessRequestFromRedirectUrl(
  redirectUrl: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: boolean },
): Promise<{
  accessRequest: DatasetWithId;
  requestorRedirectUrl: UrlString;
}> {
  const redirectUrlObj =
    typeof redirectUrl === "string" ? new URL(redirectUrl) : redirectUrl;

  // Get the URL where the requestor expects the user to be redirected with
  // the grant.
  const requestorRedirectUrl = getSearchParam(
    redirectUrlObj,
    REDIRECT_URL_PARAM_NAME,
  );

  // Get the Access Request IRI.
  const accessRequestIri = getSearchParam(
    redirectUrlObj,
    REQUEST_VC_URL_PARAM_NAME,
  );

  return {
    accessRequest: await getAccessRequest(accessRequestIri, options),
    requestorRedirectUrl,
  };
}

export default getAccessRequestFromRedirectUrl;
