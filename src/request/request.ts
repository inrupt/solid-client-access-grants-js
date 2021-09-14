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
  revokeVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  getRequestBody,
  issueAccessOrConsentVc,
  getDefaultSessionFetch,
  dereferenceVcIri,
} from "../consent.internal";
import {
  PIM_STORAGE,
  PREFERRED_CONSENT_MANAGEMENT_UI,
  ConsentGrantBaseOptions,
  CONSENT_STATUS_REQUESTED,
} from "../constants";

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
    status: CONSENT_STATUS_REQUESTED,
  });

  return issueAccessOrConsentVc(params.requestor, consentRequest, options);
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
  purpose: Array<UrlString>;
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
    status: CONSENT_STATUS_REQUESTED,
  });
  return issueAccessOrConsentVc(params.requestor, consentRequest, options);
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
  const credential = await dereferenceVcIri(accessRequest, fetcher);
  return revokeVerifiableCredential(
    new URL("issue", credential.issuer).href,
    credential.id,
    {
      fetch: fetcher,
    }
  );
}

async function getConsentApiEndpointFromProfile(
  webId: UrlString,
  options: { fetch: typeof global.fetch }
): Promise<{ consentEndpoint?: UrlString; storage?: UrlString }> {
  const result: { consentEndpoint?: UrlString; storage?: UrlString } = {};
  let webIdDocument;
  try {
    webIdDocument = await getSolidDataset(webId, {
      fetch: options.fetch,
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
    result.consentEndpoint = profileConsentUi;
  }
  // If the profile document does not advertize for the consent UI, look for a storage root.
  const storage = getIri(profile, PIM_STORAGE);
  if (storage !== null) {
    result.storage = storage;
  }
  return result;
}

async function getConsentApiEndpointFromWellKnown(
  storage: UrlString | undefined,
  options: { fetch: typeof global.fetch }
): Promise<UrlString | undefined> {
  if (storage === undefined) {
    return undefined;
  }
  const wellKnown = await getWellKnownSolid(storage, {
    fetch: options.fetch,
  });
  if (getThingAll(wellKnown).length === 0) {
    return undefined;
  }
  const wellKnownConsentUi = getIri(
    getThingAll(wellKnown)[0],
    PREFERRED_CONSENT_MANAGEMENT_UI
  );
  return wellKnownConsentUi ?? undefined;
}

/**
 * Get the endpoint where the user prefers to be redirected when asked for consent.
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
  const { consentEndpoint, storage } = await getConsentApiEndpointFromProfile(
    webId,
    { fetch: fetcher }
  );
  return (
    consentEndpoint ??
    getConsentApiEndpointFromWellKnown(storage, { fetch: fetcher })
  );
}
