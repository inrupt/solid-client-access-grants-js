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
import type { UrlString } from "@inrupt/solid-client";
import type { VerifiableCredential } from "@inrupt/solid-client-vc";

import type { FetchOptions } from "../type/FetchOptions";
import type { UmaConfiguration } from "../type/UmaConfiguration";

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
  authIri: string
): Promise<UmaConfiguration> {
  const configurationUrl = `${authIri}${UMA_CONFIG_PATH}`;
  const response = await crossFetch(configurationUrl);
  return response.json();
}

/**
 * @hidden This is just an internal utility function to exchange a VC and ticket for an auth token.
 */
export async function exchangeTicketForAccessToken(
  tokenEndpoint: UrlString,
  accessGrant: VerifiableCredential,
  authTicket: string
): Promise<string | null> {
  const response = await crossFetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      claim_token: JSON.stringify(accessGrant),
      claim_token_type: VC_CLAIM_TOKEN_TYPE,
      grant_type: UMA_GRANT_TYPE,
      ticket: authTicket,
    }),
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
  return async function fetchBoundToUMA(
    url: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    return crossFetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${accessToken}`,
      },
    });
  };
}

export async function fetchWithVc(
  // Why UrlString instead of UrlString | Url? Because Urls aren't compatible
  // with the fetch return type.
  resourceIri: UrlString,
  accessGrant: VerifiableCredential,
  options: FetchOptions
): Promise<typeof fetch> {
  // Use an authenticated session to fetch the resoruce so that we can parse
  // its headers to find the UMA endpoint information and ticket
  const response = await options.fetch(resourceIri);
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
    authTicket
  );

  if (!accessToken) {
    throw new Error(NO_ACCESS_TOKEN_RETURNED);
  }

  return boundFetch(accessToken);
}
