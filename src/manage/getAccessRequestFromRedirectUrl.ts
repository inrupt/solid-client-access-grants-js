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

import { UrlString } from "@inrupt/solid-client";
import { getVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  REDIRECT_URL_PARAM_NAME,
  REQUEST_VC_URL_PARAM_NAME,
} from "../discover/redirectToAccessManagementUi";
import { isAccessRequest } from "../guard/isAccessRequest";
import type { AccessRequest } from "../type/AccessRequest";
import { getSessionFetch } from "../util/getSessionFetch";

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
  options: { fetch?: typeof fetch } = {}
): Promise<{
  accessRequest: AccessRequest;
  requestorRedirectUrl: UrlString;
}> {
  const redirectUrlObj =
    typeof redirectUrl === "string" ? new URL(redirectUrl) : redirectUrl;
  const authFetch = options.fetch ?? (await getSessionFetch(options));

  // Get the URL where the requestor expects the user to be redirected with
  // the grant.
  const requestorRedirectUrl = redirectUrlObj.searchParams.get(
    REDIRECT_URL_PARAM_NAME
  );
  if (requestorRedirectUrl === null) {
    throw new Error(
      `The provided redirect URL [${redirectUrl}] is missing the expected [${REDIRECT_URL_PARAM_NAME}] query parameter`
    );
  }

  // Get the Access Request IRI.
  const accessRequestIri = redirectUrlObj.searchParams.get(
    REQUEST_VC_URL_PARAM_NAME
  );
  if (accessRequestIri === null) {
    throw new Error(
      `The provided redirect URL [${redirectUrl}] is missing the expected [${REQUEST_VC_URL_PARAM_NAME}] query parameter`
    );
  }

  const accessRequest = await getVerifiableCredential(accessRequestIri, {
    fetch: authFetch,
  });

  if (!isAccessRequest(accessRequest)) {
    throw new Error(
      `${JSON.stringify(accessRequest)} is not an Access Request`
    );
  }
  return { accessRequest, requestorRedirectUrl };
}

export default getAccessRequestFromRedirectUrl;
