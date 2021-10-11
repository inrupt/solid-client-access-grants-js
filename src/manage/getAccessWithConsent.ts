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

import { UrlString } from "@inrupt/solid-client";
import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import { isBaseGrantVerifiableCredential } from "../guard/isBaseAccessVerifiableCredential";
import { isAccessGrant } from "../guard/isConsentGrant";
import type { AccessGrantBody } from "../type/AccessVerifiableCredential";
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { getSessionFetch } from "../util/getSessionFetch";

/**
 * Gets the Access Grant (with optional consent) associated to the given URL.
 *
 * @param accessGrantVcUrl The URL of an access grant, with or without consent.
 * @param options Optional properties to customise the request behaviour.
 * @returns The Verifiable Credential associated to the given IRI, if it is an access grant. Throws otherwise.
 * @since 0.1.0
 */
export async function getAccessWithConsent(
  accessGrantVcUrl: UrlString | URL,
  options?: ConsentApiBaseOptions
): Promise<VerifiableCredential & AccessGrantBody> {
  const sessionFetch = await getSessionFetch(options ?? {});
  const vcUrl =
    typeof accessGrantVcUrl === "string"
      ? accessGrantVcUrl
      : accessGrantVcUrl.href;
  const response = await sessionFetch(vcUrl);
  if (!response.ok) {
    throw new Error(
      `Could not resolve [${vcUrl}]: ${response.status} ${response.statusText}`
    );
  }
  const responseErrorClone = response.clone();
  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(
      `Unexpected response when resolving [${vcUrl}], the result is not a Verifiable Credential: ${await responseErrorClone.text()}`
    );
  }
  if (
    !isVerifiableCredential(data) ||
    !isBaseGrantVerifiableCredential(data) ||
    !isAccessGrant(data)
  ) {
    throw new Error(
      `Unexpected response when resolving [${vcUrl}], the result is not an Access Grant: ${JSON.stringify(
        data
      )}`
    );
  }
  return data;
}
