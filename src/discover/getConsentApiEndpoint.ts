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
  getSourceIri,
  getThingAll,
  getWellKnownSolid,
  UrlString,
} from "@inrupt/solid-client";
import { INRUPT_CONSENT_SERVICE } from "../constants";
import { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { getSessionFetch } from "../util/getSessionFetch";

async function getConsentEndpointForResource(
  resource: UrlString,
  fetcher: typeof fetch
): Promise<UrlString> {
  const wellKnown = await getWellKnownSolid(resource, {
    fetch: fetcher,
  });
  const wellKnownSubjects = getThingAll(wellKnown);
  if (wellKnownSubjects.length === 0) {
    throw new Error(
      `Cannot discover consent endpoint from [${getSourceIri(
        wellKnown
      )}]: the well-known document is empty.`
    );
  }
  // There should only be 1 subject in the .well-known/solid document, and if there
  // are multiple, we arbitrarily pick the first one.
  const wellKnownSubject = wellKnownSubjects[0];
  const consentIri = getIri(wellKnownSubject, INRUPT_CONSENT_SERVICE);
  if (consentIri === null) {
    throw new Error(
      `Cannot discover consent endpoint from [${getSourceIri(
        wellKnown
      )}]: the well-known document contains no value for property [${INRUPT_CONSENT_SERVICE}].`
    );
  }
  return consentIri;
}

/**
 * Discovers the endpoint where access requests may be created for a given resource.
 *
 * @param resource The resource for which access may be requested.
 * @param options Optional properties to customise the access request behaviour.
 * @returns The URL of the access request server.
 * @since 0.0.1
 */
async function getConsentApiEndpoint(
  resource: URL | UrlString,
  options: ConsentApiBaseOptions
): Promise<UrlString> {
  // TODO: complete code coverage
  /* istanbul ignore next */
  if (options.consentEndpoint instanceof URL) {
    return options.consentEndpoint.href;
  }
  if (options.consentEndpoint) {
    return options.consentEndpoint;
  }
  return getConsentEndpointForResource(
    /* istanbul ignore next */
    resource instanceof URL ? resource.href : resource,
    await getSessionFetch(options)
  );
}

export { getConsentApiEndpoint };
export default getConsentApiEndpoint;
export type { ConsentApiBaseOptions, UrlString };
