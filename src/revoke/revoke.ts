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

import type { UrlString } from "@inrupt/solid-client";
import {
  revokeVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import type { ConsentGrantBaseOptions } from "../type/ConsentGrantBaseOptions";
import { getBaseAccessVerifiableCredential } from "../internal/getBaseAccessVerifiableCredential";
import { getDefaultSessionFetch } from "../internal/getDefaultSessionFetch";

/**
 * Makes a request to the consent server to revoke a given VC.
 *
 * @param vc Either a VC, or a URL to a VC, to be revoked.
 * @param options Optional properties to customise the request behaviour.
 * @returns A void promise.
 */
// eslint-disable-next-line import/prefer-default-export
export async function revokeConsentGrant(
  vc: VerifiableCredential | URL | UrlString,
  options: ConsentGrantBaseOptions = {}
): Promise<void> {
  const credential = await getBaseAccessVerifiableCredential(vc, options);
  // TODO: Find out if this should take the optional consentEndpoint
  // Potentially factor out the getConsentEndpoint taking VC or URL or UrlString and options
  // TODO: Find out about the overlap with getConsentApiEndpoint
  return revokeVerifiableCredential(
    new URL("status", credential.issuer).href,
    credential.id,
    {
      fetch: options.fetch ?? (await getDefaultSessionFetch()),
    }
  );
}
