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
  getIri,
  getSolidDataset,
  getThing,
  getThingAll,
  getWellKnownSolid,
  UrlString,
} from "@inrupt/solid-client";
import {
  getRequestBody,
  issueAccessOrConsentVc,
} from "../internal/consent.internal";
import { getDefaultSessionFetch } from "../internal/getDefaultSessionFetch";
import {
  PIM_STORAGE,
  PREFERRED_CONSENT_MANAGEMENT_UI,
  CONSENT_STATUS_REQUESTED,
} from "../constants";
import type { ConsentGrantBaseOptions } from "../type/ConsentGrantBaseOptions";
import type { RequestAccessParameters } from "../type/RequestAccessParameters";
import type { RequestAccessWithConsentParameters } from "../type/RequestAccessWithConsentParameters";

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
