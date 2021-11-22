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

import { UrlString, WebId } from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { getBaseAccessRequestVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { getSessionFetch } from "../util/getSessionFetch";
import {
  getAccessManagementUi,
  getAccessManagementUiFromWellKnown,
} from "./getAccessManagementUi";

const REQUEST_VC_PARAM_NAME = "requestVc";
const REDIRECT_URL_PARAM_NAME = "redirectUrl";

/**
 * Optional parameters for the [[redirectToAccessManagementUi]] method:
 *
 * - `fetch?`: Pass in a function with a signature compatible with the WHATWG
 *   Fetch API, which will be used to make HTTP requests. Primarily useful when
 *   requests need to be authenticated. When
 *   `@inrupt/solid-client-authn-browser` is available and this property is not
 *   set, `fetch` will be imported from there. Otherwise, the HTTP requests will
 *   be unauthenticated.
 * - `redirectCallback?`: For use in a non-browser environment, this must be
 *   provided by the user in order to handle the redirect URL, since setting
 *   `window.location.href` is not an option.
 */
export type RedirectToAccessManagementUiOptions = {
  redirectCallback?: (url: string) => void;
  fetch?: typeof global.fetch;
  resourceOwner?: WebId;
  fallbackAccessManagementUi?: UrlString;
  /**
   * @hidden Replaced by [[fallbackAccessManagementUi]]
   * @deprecated
   */
  fallbackConsentManagementUi?: UrlString;
};

async function discoverAccessManagementUi(options: {
  resourceUrl: UrlString;
  resourceOwner?: WebId;
  fallbackUi?: UrlString;
}): Promise<string | undefined> {
  const authFetch = await getSessionFetch({});
  let accessManagementUi;
  if (options.resourceOwner) {
    accessManagementUi = await getAccessManagementUi(options.resourceOwner, {
      fetch: authFetch,
    });
  } else {
    accessManagementUi = await getAccessManagementUiFromWellKnown(
      options.resourceUrl,
      { fetch: authFetch }
    );
  }
  return accessManagementUi ?? options.fallbackUi;
}

/**
 * Redirects the application to a resource owner's preferred access management
 * UI.
 *
 * @param accessRequestVc The VC containing the Access Request to a resource.
 * @param redirectUrl The URL where the user should be redirected back after
 * having granted access.
 * @param options If you are in a NodeJS environment, you must specify a
 * callback to handle the redirection.
 * @since 0.1.0
 */
export async function redirectToAccessManagementUi(
  accessRequestVc: VerifiableCredential | UrlString | URL,
  redirectUrl: UrlString | URL,
  options: RedirectToAccessManagementUiOptions = {}
): Promise<void> {
  // The former fallbackConsentManagementUi option is deprecated:
  const fallbackUi =
    options.fallbackAccessManagementUi ?? options.fallbackConsentManagementUi;

  const requestVc = await getBaseAccessRequestVerifiableCredential(
    accessRequestVc,
    { fetch: options.fetch }
  );
  const accessManagementUi = await discoverAccessManagementUi({
    resourceUrl: requestVc.credentialSubject.hasConsent.forPersonalData[0],
    resourceOwner: options.resourceOwner,
    fallbackUi,
  });

  if (accessManagementUi === undefined) {
    throw new Error(
      `Cannot discover access management UI URL for [${
        requestVc.credentialSubject.hasConsent.forPersonalData[0]
      }]${
        options.resourceOwner ? `, neither from [${options.resourceOwner}]` : ""
      }`
    );
  }

  const targetIri = new URL(accessManagementUi);
  targetIri.searchParams.append(
    REQUEST_VC_PARAM_NAME,
    btoa(JSON.stringify(requestVc))
  );
  targetIri.searchParams.append(
    REDIRECT_URL_PARAM_NAME,
    encodeURI(typeof redirectUrl === "string" ? redirectUrl : redirectUrl.href)
  );

  if (options !== undefined && options.redirectCallback !== undefined) {
    options.redirectCallback(targetIri.href);
  } else {
    if (typeof window === "undefined") {
      throw new Error(
        "In a non-browser environment, a redirectCallback must be provided by the user."
      );
    }
    window.location.href = targetIri.href;
  }
}

/**
 * @hidden alias of [[redirectToAccessManagementUi]]
 * @deprecated
 */
const redirectToConsentManagementUi = redirectToAccessManagementUi;
export { redirectToConsentManagementUi };
