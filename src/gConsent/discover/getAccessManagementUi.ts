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
import {
  getIri,
  getSolidDataset,
  getThing,
  getThingAll,
  getWellKnownSolid,
} from "@inrupt/solid-client";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { PIM_STORAGE, PREFERRED_CONSENT_MANAGEMENT_UI } from "../constants";

interface AccessManagementUiFromProfile {
  accessEndpoint?: UrlString;
  storage?: UrlString;
}

async function getAccessManagementUiFromProfile(
  webId: UrlString,
  options: { fetch: typeof global.fetch },
): Promise<AccessManagementUiFromProfile> {
  const result: AccessManagementUiFromProfile = {};

  let webIdDocument;
  try {
    webIdDocument = await getSolidDataset(webId, {
      fetch: options.fetch,
    });
  } catch (e) {
    throw new Error(`Cannot get the Access Management UI for ${webId}: ${e}.`);
  }

  const profile = getThing(webIdDocument, webId);
  if (profile === null) {
    throw new Error(
      `Cannot get the Access Management UI for ${webId}: the WebID cannot be dereferenced.`,
    );
  }

  // TODO: rename constant & variable when a definitive term is published:
  const profileConsentUi = getIri(profile, PREFERRED_CONSENT_MANAGEMENT_UI);
  if (profileConsentUi !== null) {
    result.accessEndpoint = profileConsentUi;
  }

  // If the profile document does not advertize for the access management UI, look for a storage root.
  const storage = getIri(profile, PIM_STORAGE);
  if (storage !== null) {
    result.storage = storage;
  }

  return result;
}

/**
 * @since 0.4.0
 * @hidden
 */
export async function getAccessManagementUiFromWellKnown(
  storage: UrlString | undefined,
  options: { fetch: typeof global.fetch },
): Promise<UrlString | undefined> {
  if (storage === undefined) {
    return undefined;
  }

  const wellKnown = await getWellKnownSolid(storage, {
    fetch: options.fetch,
  });

  if (getThingAll(wellKnown, { acceptBlankNodes: true }).length === 0) {
    return undefined;
  }

  const wellKnownAccesstUi = getIri(
    getThingAll(wellKnown, { acceptBlankNodes: true })[0],
    PREFERRED_CONSENT_MANAGEMENT_UI,
  );

  return wellKnownAccesstUi ?? undefined;
}

/**
 * Get the endpoint where the user prefers to be redirected when asked for access.
 * If the user does not specify an endpoint, this function attempts to discover the
 * default access UI recommended by their Pod provider.
 *
 * @param webId The WebID of the user asked for access.
 * @param options Optional properties to customise the access request behaviour.
 * @returns The URL where the user should be redirected, if discoverable.
 * @since 0.4.0
 */
async function getAccessManagementUi(
  webId: URL | UrlString,
  options: Pick<AccessBaseOptions, "fetch"> = {},
): Promise<UrlString | undefined> {
  const fetcher = await getSessionFetch(options);

  // TODO: Complete code coverage for URL argument
  const { accessEndpoint, storage } = await getAccessManagementUiFromProfile(
    webId.toString(),
    { fetch: fetcher },
  );

  return (
    accessEndpoint ??
    getAccessManagementUiFromWellKnown(storage, { fetch: fetcher })
  );
}

export { getAccessManagementUi };
export default getAccessManagementUi;
export type { UrlString };
