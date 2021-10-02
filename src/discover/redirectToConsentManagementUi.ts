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

import { UrlString } from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { getBaseAccessVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { getSessionFetch } from "../util/getSessionFetch";
import { getConsentManagementUiFromWellKnown } from "./getConsentManagementUi";

const REQUEST_VC_URL_PARAM_NAME = "requestVcUrl";
const REDIRECT_URL_PARAM_NAME = "redirectUrl";

/**
 * Redirects the application to a resource owner's preferred consent management
 * UI.
 *
 * @param accessRequestVc The VC containing the Access Request to a resource.
 * @param redirectUrl The URL where the user should be redirected back after having granted access.
 * @param options If you are in a NodeJS environment, you must specify a callback to handle the redirection.
 */
export async function redirectToConsentManagementUi(
  accessRequestVc: VerifiableCredential | UrlString | URL,
  redirectUrl: UrlString | URL,
  options?: {
    redirectCallback?: (url: string) => unknown;
  }
): Promise<void> {
  // TODO: should a fetch be provided to have authenticated VC lookup ?
  const requestVc = await getBaseAccessVerifiableCredential(
    accessRequestVc,
    {}
  );
  const consentManagementUi = await getConsentManagementUiFromWellKnown(
    requestVc.credentialSubject.hasConsent.forPersonalData[0],
    { fetch: await getSessionFetch({}) }
  );
  if (consentManagementUi === undefined) {
    throw new Error(
      `Cannot discover consent management UI URL for [${requestVc.credentialSubject.id}]`
    );
  }
  const targetIri = new URL(consentManagementUi);
  targetIri.searchParams.append(
    REQUEST_VC_URL_PARAM_NAME,
    encodeURI(requestVc.id)
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
