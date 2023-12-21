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

import base64url from "base64url";
import type { UrlString } from "@inrupt/solid-client";
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import type { UmaConfiguration } from "../type/UmaConfiguration";
import type { FetchOptions } from "../type/FetchOptions";
import {
  CONTEXT_VC_W3C,
  CONTEXT_ESS_DEFAULT,
  PRESENTATION_TYPE_BASE,
} from "../gConsent/constants";

const WWW_AUTH_HEADER = "www-authenticate";
const VC_CLAIM_TOKEN_TYPE = "https://www.w3.org/TR/vc-data-model/#json-ld";
const UMA_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:uma-ticket";
const UMA_CONFIG_PATH = "/.well-known/uma2-configuration";

const NO_WWW_AUTH_HEADER_ERROR =
  "No www-authentication header found in response headers; UMA cannot proceed. Refer to your network requests for details.";

const NO_WWW_AUTH_HEADER_UMA_TICKET_ERROR =
  'www-authentication header in response headers did not include "ticket"; UMA cannot proceed. Refer to your network requests for details.';

const NO_WWW_AUTH_HEADER_UMA_IRI_ERROR =
  'www-authentication header in response headers did not include "as_uri"; UMA cannot proceed. Refer to your network requests for details.';

const NO_ACCESS_TOKEN_RETURNED =
  "No access token was returned during the UMA exchange flow. Refer to your network requests for details.";

const UMA_TICKET_REGEX = /ticket="([^"]+)"/;
const UMA_IRI_REGEX = /as_uri="([^"]+)"/;

/**
 * @hidden This is just an internal utility function to parse the ticket value out of the www-authenticate header.
 */
export function parseUMAAuthTicket(header: string): string | null {
  const matches = UMA_TICKET_REGEX.exec(header);
  return matches ? matches[1] : null;
}

/**
 * @hidden This is just an internal utility function to parse the as_uri value out of the www-authenticate header.
 */
export function parseUMAAuthIri(header: string): UrlString | null {
  const matches = UMA_IRI_REGEX.exec(header);
  return matches ? matches[1] : null;
}
/**
 * @hidden This is just an internal utility function to get the UMA configuration from .well-known.
 */
export async function getUmaConfiguration(
  authIri: string,
): Promise<UmaConfiguration> {
  const configurationUrl = new URL(UMA_CONFIG_PATH, authIri).href;
  const response = await fetch(configurationUrl);
  return response.json().catch((e) => {
    throw new Error(
      `Parsing the UMA configuration found at ${configurationUrl} failed with the following error: ${e.toString()}`,
    );
  });
}

/**
 * @hidden This is just an internal utility function to exchange a VC and ticket for an auth token.
 */
export async function exchangeTicketForAccessToken(
  tokenEndpoint: UrlString,
  accessGrant: DatasetWithId | VerifiableCredential,
  authTicket: string,
  authFetch: typeof fetch,
): Promise<string | null> {
  const credentialPresentation = {
    "@context": [CONTEXT_VC_W3C, CONTEXT_ESS_DEFAULT],
    type: [PRESENTATION_TYPE_BASE],
    verifiableCredential: [accessGrant],
  };
  const response = await authFetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      claim_token: base64url.encode(JSON.stringify(credentialPresentation)),
      claim_token_format: VC_CLAIM_TOKEN_TYPE,
      grant_type: UMA_GRANT_TYPE,
      ticket: authTicket,
    }).toString(),
  });

  try {
    const data = await response.json();
    return data.access_token || null;
  } catch (_e) {
    // An error being thown here means that the response body doesn't parse as JSON.
    return null;
  }
}

/**
 * @hidden This is just an internal utility function to bind a fetch function to the UMA auth token.
 */
export function boundFetch(accessToken: string): typeof fetch {
  // Explicitly use a named function such that it appears in stacktraces
  return function authenticatedFetch(url, init) {
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${accessToken}`,
      },
    });
  };
}

/**
 * Builds a WHATWG Fetch compatible function issuing authenticated requests
 * based on an Access Grant VC. The obtained fetch function authentication will
 * only be valid for the resources included in the Access Grant.
 *
 * Note that providing an authenticated `fetch` as an option is mandatory for
 * the resulting fetch to be valid. The input fetch should be authenticated to
 * the requestor's Solid-OIDC provider.
 *
 * @param resourceIri One of the resources from the Access Grant.
 * @param accessGrant The Verifiable Credential proving that the requestor has
 * been granted access to the target resource.
 * @param options Additional fetch options, allowing you to override the
 * `fetch()` implementation
 * @returns A Promise resolving to a WHATWG Fetch compatible function matching
 * the standard signature. The obtained fetch function will override any
 * provided `Authentication` header with authentication information obtained
 * thanks to the provided VC.
 * @since 0.4.0
 */
export async function fetchWithVc(
  // Why UrlString instead of UrlString | Url? Because Urls aren't compatible
  // with the fetch return type.
  resourceIri: UrlString,
  accessGrant: DatasetWithId | VerifiableCredential,
  options?: FetchOptions,
): Promise<typeof fetch> {
  // Use an authenticated session to fetch the resource so that we can parse
  // its headers to find the UMA endpoint information and ticket
  const response = await fetch(resourceIri);
  const { headers } = response;

  const wwwAuthentication = headers.get(WWW_AUTH_HEADER);

  if (!wwwAuthentication) {
    throw new Error(NO_WWW_AUTH_HEADER_ERROR);
  }

  const authTicket = parseUMAAuthTicket(wwwAuthentication);
  const authIri = parseUMAAuthIri(wwwAuthentication);

  if (!authTicket) {
    throw new Error(NO_WWW_AUTH_HEADER_UMA_TICKET_ERROR);
  }

  if (!authIri) {
    throw new Error(NO_WWW_AUTH_HEADER_UMA_IRI_ERROR);
  }

  const umaConfiguration = await getUmaConfiguration(authIri);
  const tokenEndpoint = umaConfiguration.token_endpoint;

  const accessToken = await exchangeTicketForAccessToken(
    tokenEndpoint,
    accessGrant,
    authTicket,
    options?.fetch ?? fetch,
  );

  if (!accessToken) {
    throw new Error(NO_ACCESS_TOKEN_RETURNED);
  }

  return boundFetch(accessToken);
}
