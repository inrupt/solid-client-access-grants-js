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
import { isGConsentAccessGrant } from "../../common/getters";
import { isAccessGrant } from "../guard/isAccessGrant";
import {
  isBaseAccessGrantVerifiableCredential,
  isRdfjsBaseAccessGrantVerifiableCredential,
} from "../guard/isBaseAccessGrantVerifiableCredential";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type { AccessGrant } from "../type/AccessGrant";
import { normalizeAccessGrant } from "./approveAccessRequest";

/**
 * Retrieve the Access Grant associated to the given URL.
 *
 * @param accessGrantVcUrl The URL of an access grant, with or without consent.
 * @param options Optional properties to customise the request behaviour.
 * @returns The Verifiable Credential associated to the given IRI, if it is an access grant. Throws otherwise.
 * @since 0.4.0
 */
export async function getAccessGrant(
  accessGrantVcUrl: UrlString | URL,
  options: AccessBaseOptions & {
    returnLegacyJsonld: false;
  },
): Promise<DatasetWithId>;
/**
 * Retrieve the Access Grant associated to the given URL.
 *
 * @param accessGrantVcUrl The URL of an access grant, with or without consent.
 * @param options Optional properties to customise the request behaviour.
 * @returns The Verifiable Credential associated to the given IRI, if it is an access grant. Throws otherwise.
 * @since 0.4.0
 * @deprecated set returnLegacyJsonld: false and use RDFJS API
 */
export async function getAccessGrant(
  accessGrantVcUrl: UrlString | URL,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: true;
  },
): Promise<AccessGrant>;
/**
 * Retrieve the Access Grant associated to the given URL.
 *
 * @param accessGrantVcUrl The URL of an access grant, with or without consent.
 * @param options Optional properties to customise the request behaviour.
 * @returns The Verifiable Credential associated to the given IRI, if it is an access grant. Throws otherwise.
 * @since 0.4.0
 * @deprecated set returnLegacyJsonld: false and use RDFJS API
 */
export async function getAccessGrant(
  accessGrantVcUrl: UrlString | URL,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
  },
): Promise<DatasetWithId>;
/**
 * Retrieve the Access Grant associated to the given URL.
 *
 * @param accessGrantVcUrl The URL of an access grant, with or without consent.
 * @param options Optional properties to customise the request behaviour.
 * @returns The Verifiable Credential associated to the given IRI, if it is an access grant. Throws otherwise.
 * @since 0.4.0
 */
export async function getAccessGrant(
  accessGrantVcUrl: UrlString | URL,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
  },
): Promise<DatasetWithId> {
  const vcUrl =
    typeof accessGrantVcUrl === "string"
      ? accessGrantVcUrl
      : accessGrantVcUrl.href;

  if (options?.returnLegacyJsonld === false) {
    const data = await getVerifiableCredential(vcUrl, {
      fetch: options?.fetch,
      returnLegacyJsonld: false,
    });

    if (
      !isRdfjsBaseAccessGrantVerifiableCredential(data) ||
      !isGConsentAccessGrant(data)
    ) {
      throw new Error(
        `Unexpected response when resolving [${vcUrl}], the result is not an Access Grant: ${JSON.stringify(
          data,
          null,
          2,
        )}`,
      );
    }
    return data;
  }

  const data = await getVerifiableCredential(vcUrl, {
    fetch: options?.fetch,
    normalize: normalizeAccessGrant,
  });
  if (!isBaseAccessGrantVerifiableCredential(data) || !isAccessGrant(data)) {
    throw new Error(
      `Unexpected response when resolving [${vcUrl}], the result is not an Access Grant: ${JSON.stringify(
        data,
      )}`,
    );
  }
  return data;
}
