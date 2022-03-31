//
// Copyright 2022 Inrupt Inc.
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
  revokeVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getBaseAccessGrantVerifiableCredential } from "../util/getBaseAccessVerifiableCredential";
import { getSessionFetch } from "../util/getSessionFetch";

/**
 * Makes a request to the access server to revoke a given Verifiable Credential (VC).
 *
 * @param vc Either a VC, or a URL to a VC, to be revoked.
 * @param options Optional properties to customise the request behaviour.
 * @returns A void promise.
 * @since 0.4.0
 */
async function revokeAccessGrant(
  vc: VerifiableCredential | URL | UrlString,
  options: Omit<AccessBaseOptions, "accessEndpoint"> = {}
): Promise<void> {
  const credential = await getBaseAccessGrantVerifiableCredential(vc, options);

  return revokeVerifiableCredential(
    new URL("status", credential.issuer).href,
    credential.id,
    {
      fetch: await getSessionFetch(options),
    }
  );
}

export { revokeAccessGrant };
export default revokeAccessGrant;
export type { UrlString, VerifiableCredential };
