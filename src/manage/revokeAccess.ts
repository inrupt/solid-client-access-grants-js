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
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { getBaseAccessVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { getSessionFetch } from "../util/getSessionFetch";

/**
 * Makes a request to the consent server to revoke a given VC.
 *
 * @param vc Either a VC, or a URL to a VC, to be revoked.
 * @param options Optional properties to customise the request behaviour.
 * @returns A void promise.
 */
async function revokeAccess(
  vc: VerifiableCredential | URL | UrlString,
  options: ConsentApiBaseOptions = {}
): Promise<void> {
  const credential = await getBaseAccessVerifiableCredential(vc, options);

  return revokeVerifiableCredential(
    new URL("status", credential.issuer).href,
    credential.id,
    {
      fetch: await getSessionFetch(options),
    }
  );
}

export { revokeAccess };
export default revokeAccess;
export type { ConsentApiBaseOptions, UrlString, VerifiableCredential };
