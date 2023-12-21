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
import type { DatasetWithId } from "@inrupt/solid-client-vc";
import { getVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  isAccessRequest,
  isRdfjsAccessRequest,
} from "../guard/isAccessRequest";
import type { AccessRequest } from "../type/AccessRequest";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import { normalizeAccessRequest } from "../request/issueAccessRequest";

/**
 * Fetch the Access Request from the given URL.
 *
 * @param url The URL of the Access Request.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request.
 * @since 2.4.0
 */
export async function getAccessRequest(
  url: UrlString | URL,
  options: { fetch?: typeof fetch; returnLegacyJsonld: false },
): Promise<DatasetWithId>;
/**
 * Fetch the Access Request from the given URL.
 *
 * @param url The URL of the Access Request.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request.
 * @since 2.4.0
 * @deprecated Use RDFJS API instead of relying on the JSON structure by setting `returnLegacyJsonld` to false
 */
export async function getAccessRequest(
  url: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: true },
): Promise<AccessRequest>;
/**
 * Fetch the Access Request from the given URL.
 *
 * @param url The URL of the Access Request.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request.
 * @since 2.4.0
 */
export async function getAccessRequest(
  url: UrlString | URL,
  options?: { fetch?: typeof fetch; returnLegacyJsonld?: boolean },
): Promise<DatasetWithId>;
/**
 * Fetch the Access Request from the given URL.
 *
 * @param url The URL of the Access Request.
 * @param options Optional properties to customise the behaviour:
 * - fetch: an authenticated fetch function. If not provided, the default session
 * from @inrupt/solid-client-authn-browser will be used if available.
 * @returns An Access Request.
 * @since 2.4.0
 * @deprecated Use RDFJS API instead of relying on the JSON structure by setting `returnLegacyJsonld` to false
 */
export async function getAccessRequest(
  url: UrlString | URL,
  options: { fetch?: typeof fetch; returnLegacyJsonld?: boolean } = {},
): Promise<DatasetWithId> {
  if (options?.returnLegacyJsonld === false) {
    const accessRequest = await getVerifiableCredential(url.toString(), {
      fetch: options.fetch ?? (await getSessionFetch(options)),
      returnLegacyJsonld: false,
    });

    if (!isRdfjsAccessRequest(accessRequest)) {
      throw new Error(
        `${JSON.stringify(accessRequest)} is not an Access Request`,
      );
    }
    return accessRequest;
  }

  const accessRequest = await getVerifiableCredential(url.toString(), {
    fetch: options.fetch ?? (await getSessionFetch(options)),
    normalize: normalizeAccessRequest,
  });

  if (!isAccessRequest(accessRequest)) {
    throw new Error(
      `${JSON.stringify(accessRequest, null, 2)} is not an Access Request`,
    );
  }
  return accessRequest;
}

export default getAccessRequest;
