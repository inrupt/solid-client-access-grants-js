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

import {
  access,
  getIri,
  getSolidDataset,
  getThing,
  getThingAll,
  getWellKnownSolid,
  UrlString,
  WebId,
} from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  revokeVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  AccessRequestBody,
  ConsentRequestBody,
  getConsentEndpointForWebId,
  getRequestBody,
  isConsentRequest,
  getDefaultSessionFetch,
} from "../consent.internal";
import { PIM_STORAGE, PREFERRED_CONSENT_MANAGEMENT_UI } from "../constants";

export function isAccessRequest(
  credential: VerifiableCredential | AccessRequestBody
): credential is AccessRequestBody {
  let result = true;
  result =
    result &&
    (credential as AccessRequestBody).type.includes("SolidConsentRequest");
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent !==
      undefined;
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent
      .forPersonalData !== undefined;
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent.hasStatus ===
      "ConsentStatusRequested";
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent.mode !==
      undefined;
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.inbox !== undefined;
  return result;
}

async function sendConsentRequest(
  requestor: WebId,
  requestee: WebId,
  consentRequest: AccessRequestBody | ConsentRequestBody,
  options: ConsentGrantBaseOptions
): Promise<unknown> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  const consentEndpoint = new URL(
    "issue",
    await getConsentEndpointForWebId(requestee, fetcher)
  );
  return issueVerifiableCredential(
    consentEndpoint.href,
    requestor,
    {
      "@context": consentRequest["@context"],
      ...consentRequest.credentialSubject,
    },
    {
      "@context": consentRequest["@context"],
      type: ["SolidConsentRequest"],
      issuanceDate: isConsentRequest(consentRequest)
        ? consentRequest.issuanceDate
        : undefined,
      expirationDate: isConsentRequest(consentRequest)
        ? consentRequest.expirationDate
        : undefined,
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
 * - `consentEndpoint`: a base URL used when determining the location of
 *                      consent API calls.
 */
export type ConsentGrantBaseOptions = Partial<{
  fetch?: typeof fetch;
  consentEndpoint?: UrlString;
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
  requestorInboxUrl: UrlString;
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
  const consentRequest = getRequestBody({
    ...params,
    status: "ConsentStatusRequested",
  });

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
  purpose: UrlString[];
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
  const consentRequest = getRequestBody({
    ...params,
    status: "ConsentStatusRequested",
  });
  return sendConsentRequest(
    params.requestor,
    params.resourceOwner,
    consentRequest,
    options
  );
}

/**
 * Cancel a request for access to data (with explicit or implicit consent) before
 * the person being asked for consent has replied.
 *
 * @param accessRequest The access request, either in the form of a VC URL or a full-fledged VC.
 * @param options Optional properties to customise the access request behaviour.
 * @returns A void promise
 * @since Unreleased
 */
export async function cancelAccessRequest(
  accessRequest: VerifiableCredential | UrlString,
  options: { fetch?: typeof global.fetch } = {}
): Promise<void> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  if (typeof accessRequest === "object") {
    // If the full VC is provided, no additional information is needed.
    return revokeVerifiableCredential(
      new URL("issue", accessRequest.issuer).href,
      accessRequest.id,
      {
        fetch: fetcher,
      }
    );
  }
  // Only the credential IRI has been provided, and it needs to be dereferenced.
  const issuerResponse = await fetcher(accessRequest);
  if (!issuerResponse.ok) {
    throw new Error(
      `An error occured when looking up [${accessRequest}]: ${issuerResponse.status} ${issuerResponse.statusText}`
    );
  }
  const credential = (await issuerResponse.json()) as VerifiableCredential;
  return revokeVerifiableCredential(
    new URL("issue", credential.issuer).href,
    credential.id,
    {
      fetch: fetcher,
    }
  );
}

/* Get the endpoint where the user prefers to be redirected when asked for consent.
 * If the user does not specify an endpoint, this function attemps to discover the
 * default consent UI recommanded by their Pod provider.
 *
 * @param webId The WebID of the user asked for consent.
 * @param options Optional properties to customise the access request behaviour.
 */
export async function getConsentApiEndpoint(
  webId: UrlString,
  options: { fetch?: ConsentGrantBaseOptions["fetch"] } = {}
): Promise<UrlString | undefined> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  let webIdDocument;
  try {
    webIdDocument = await getSolidDataset(webId, {
      fetch: fetcher,
    });
  } catch (e) {
    throw new Error(`Cannot get consent API for ${webId}: ${e}.`);
  }
  const profile = getThing(webIdDocument, webId);
  if (profile === null) {
    throw new Error(
      `Cannot get consent API for ${webId}: the WebID cannot be dereferenced.`
    );
  }
  const profileConsentUi = getIri(profile, PREFERRED_CONSENT_MANAGEMENT_UI);
  if (profileConsentUi !== null) {
    return profileConsentUi;
  }
  // If the profile document does not advertize for the consent UI, look for a storage root.
  const storage = getIri(profile, PIM_STORAGE);
  if (storage === null) {
    return undefined;
  }
  const wellKnown = await getWellKnownSolid(storage, {
    fetch: fetcher,
  });
  if (getThingAll(wellKnown).length === 0) {
    return undefined;
  }
  const wellKnownConsentUi = getIri(
    getThingAll(wellKnown)[0],
    PREFERRED_CONSENT_MANAGEMENT_UI
  );
  if (wellKnownConsentUi !== null) {
    return wellKnownConsentUi;
  }
  return undefined;
}
