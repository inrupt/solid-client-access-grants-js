/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { UrlString } from "@inrupt/solid-client";
import { fetch as crossFetch } from "cross-fetch";
import { parse } from "auth-header";
import { AccessBaseOptions } from "../type/AccessBaseOptions";

async function getAccessEndpointForResource(
  resource: UrlString
): Promise<UrlString> {
  // Explicitly makes an unauthenticated fetch to be sure to get the link to the
  // authorization server.
  const response = await crossFetch(resource);
  if (!response.headers.has("WWW-Authenticate")) {
    throw new Error(
      `Expected a 401 error with a WWW-Authenticate header, got a [${response.status}: ${response.statusText}] response lacking the WWW-Authenticate header.`
    );
  }
  const authHeader = response.headers.get("WWW-Authenticate") as string;
  const authHeaderToken = parse(authHeader);
  if (authHeaderToken.scheme !== "UMA") {
    throw new Error(
      `Unsupported authorization scheme: [${authHeaderToken.scheme}]`
    );
  }
  const authorizationServerIri = authHeaderToken.params.as_uri as string;
  const wellKnownIri = new URL(
    "/.well-known/uma2-configuration",
    authorizationServerIri
  );
  const rawDiscoveryDocument = await crossFetch(wellKnownIri.href);
  const discoveryDocument = await rawDiscoveryDocument.json();
  if (typeof discoveryDocument.verifiable_credential_issuer !== "string") {
    throw new Error(
      `No access issuer listed for property [verifiable_credential_issuer] in [${JSON.stringify(
        discoveryDocument
      )}]`
    );
  }
  return discoveryDocument.verifiable_credential_issuer as string;
}

/**
 * Discovers the endpoint where access requests may be created for a given resource.
 *
 * @param resource The resource for which access may be requested.
 * @param options Optional properties to customise the access request behaviour.
 * @returns The URL of the access request server.
 * @since 0.4.0
 */
async function getAccessApiEndpoint(
  resource: URL | UrlString,
  options: AccessBaseOptions = {}
): Promise<UrlString> {
  if (options.accessEndpoint !== undefined) {
    return options.accessEndpoint.toString();
  }

  if (options.consentEndpoint !== undefined) {
    return options.consentEndpoint.toString();
  }

  return getAccessEndpointForResource(resource.toString());
}

export { getAccessApiEndpoint };
export default getAccessApiEndpoint;
export type { UrlString };

/**
 * @hidden deprecated alias of [[getAccessApiEndpoint]]
 * @since 0.0.1
 * @deprecated
 */
const getConsentApiEndpoint = getAccessApiEndpoint;
export { getConsentApiEndpoint };
