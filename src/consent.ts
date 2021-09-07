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

import { fetch as crossFetch } from "cross-fetch";
import { access, UrlString, WebId } from "@inrupt/solid-client";
import { issueVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  ConsentRequestBody,
  getConsentEndpointForWebId,
  getRequestBody,
} from "./consent.internal";

// Dynamically import solid-client-authn-browser so that this library doesn't have a hard
// dependency.
async function getDefaultSessionFetch(): Promise<typeof fetch> {
  try {
    const { fetch: fetchFn } = await import(
      "@inrupt/solid-client-authn-browser"
    );

    return fetchFn;
  } catch (e) {
    /* istanbul ignore next: @inrupt/solid-client-authn-browser is a devDependency, so this path is not hit in tests: */
    return crossFetch;
  }
}

async function sendConsentRequest(
  requestor: WebId,
  requestee: WebId,
  consentRequest: ConsentRequestBody,
  options: ConsentGrantBaseOptions
): Promise<unknown> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  const consentEndpoint = await getConsentEndpointForWebId(requestee, fetcher);
  return issueVerifiableCredential(
    consentEndpoint,
    requestor,
    {
      "@context": consentRequest["@context"],
      ...consentRequest.credentialSubject,
    },
    {
      "@context": consentRequest["@context"],
      type: ["SolidConsentRequest"],
      issuanceDate: consentRequest.issuanceDate,
      expirationDate: consentRequest.expirationDate,
    },
    {
      fetch: fetcher,
    }
  );
}

/**
 * Optional parameters to customise the behaviour of consent requests.
 *
 * - `fetch`: Pass in a function with a signature compatible with the WHATWG
 *            Fetch API, which will be used to make HTTP requests. Primarily
 *            useful when requests need to be authenticated.
 *            When `@inrupt/solid-client-authn-browser` is available and this
 *            property is not set, `fetch` will be imported from there.
 *            Otherwise, the HTTP requests will be unauthenticated.
 */
export type ConsentGrantBaseOptions = Partial<{
  fetch: typeof fetch;
}>;

/**
 * Required parameters to request access to one or more Resources.
 *
 * - `requestor`: WebID of the Agent requesting access to the given Resources.
 * - `resourceOwner`: WebID of an Agent controlling access to the given Resources.
 * - `access`: Level access to request on the given Resource.
 *             See {@link https://docs.inrupt.com/developer-tools/api/javascript/solid-client/interfaces/access_universal.access.html}.
 * - `resources`: Array of URLs of the Resources to which access is requested.
 */
export type RequestAccessParameters = {
  requestor: WebId;
  resourceOwner: WebId;
  access: Partial<access.Access>;
  resources: Array<UrlString>;
};
/**
 * Request access to a given Resource.
 *
 * @param params Access to request.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A signed Verifiable Credential representing the access request.
 */
export async function requestAccess(
  params: RequestAccessParameters,
  options: ConsentGrantBaseOptions = {}
): Promise<unknown> {
  const consentRequest = getRequestBody(params);

  return sendConsentRequest(
    params.requestor,
    params.resourceOwner,
    consentRequest,
    options
  );
}

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
export type RequestAccessWithConsentParameters = RequestAccessParameters & {
  purpose: UrlString;
  requestorInboxUrl?: UrlString;
  issuanceDate?: Date;
  expirationDate?: Date;
};
/**
 * Request access to a given Resource and proof that consent for a given use of that access was granted.
 *
 * @param params Access to request and constraints on how that access will be used.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A signed verifiable credential representing the access and consent request.
 */
export async function requestAccessWithConsent(
  params: RequestAccessWithConsentParameters,
  options: ConsentGrantBaseOptions = {}
): Promise<unknown> {
  const consentRequest = getRequestBody(params);
  return sendConsentRequest(
    params.requestor,
    params.resourceOwner,
    consentRequest,
    options
  );
}
