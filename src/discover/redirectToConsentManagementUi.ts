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
import { getConsentManagementUi } from ".";
import { getBaseAccessRequestVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { getSessionFetch } from "../util/getSessionFetch";
import { getConsentManagementUiFromWellKnown } from "./getConsentManagementUi";

const REQUEST_VC_PARAM_NAME = "requestVc";
const REDIRECT_URL_PARAM_NAME = "redirectUrl";

async function discoverConsentManagementUi(options: {
  resourceUrl: UrlString;
  resourceOwner?: WebId;
  fallbackUi?: UrlString;
}): Promise<string | undefined> {
  const authFetch = await getSessionFetch({});
  let consentManagementUi;
  if (options.resourceOwner) {
    consentManagementUi = await getConsentManagementUi(options.resourceOwner, {
      fetch: authFetch,
    });
  } else {
    consentManagementUi = await getConsentManagementUiFromWellKnown(
      options.resourceUrl,
      { fetch: authFetch }
    );
  }
  return consentManagementUi ?? options.fallbackUi;
}

/**
 * Redirects the application to a resource owner's preferred consent management
 * UI.
 *
 * @param accessRequestVc The VC containing the Access Request to a resource.
 * @param redirectUrl The URL where the user should be redirected back after having granted access.
 * @param options If you are in a NodeJS environment, you must specify a callback to handle the redirection.
 * @since 0.1.0
 */
export async function redirectToConsentManagementUi(
  accessRequestVc: VerifiableCredential | UrlString | URL,
  redirectUrl: UrlString | URL,
  options?: {
    redirectCallback?: (url: string) => unknown;
    fetch?: typeof global.fetch;
    resourceOwner?: WebId;
    fallbackConsentManagementUi?: UrlString;
  }
): Promise<void> {
  const requestVc = await getBaseAccessRequestVerifiableCredential(
    accessRequestVc,
    { fetch: options?.fetch }
  );
  const consentManagementUi = await discoverConsentManagementUi({
    resourceUrl: requestVc.credentialSubject.hasConsent.forPersonalData[0],
    resourceOwner: options?.resourceOwner,
    fallbackUi: options?.fallbackConsentManagementUi,
  });
  if (consentManagementUi === undefined) {
    throw new Error(
      `Cannot discover consent management UI URL for [${
        requestVc.credentialSubject.hasConsent.forPersonalData[0]
      }]${
        options?.resourceOwner
          ? `, neither from [${options?.resourceOwner}]`
          : ""
      }`
    );
  }
  const targetIri = new URL(consentManagementUi);
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
