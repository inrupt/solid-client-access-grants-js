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
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  getId,
  getIssuer,
  revokeVerifiableCredential,
} from "@inrupt/solid-client-vc";
import { DataFactory } from "n3";
import { TYPE, solidVc } from "../../common/constants";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getBaseAccess } from "../util/getBaseAccessVerifiableCredential";

const { quad, namedNode } = DataFactory;

/**
 * Makes a request to the access server to revoke a given Verifiable Credential (VC).
 *
 * @param vc Either a VC, or a URL to a VC, to be revoked.
 * @param options Optional properties to customise the request behaviour.
 * @returns A void promise.
 * @since 0.4.0
 */
async function revokeAccessGrant(
  vc: DatasetWithId | VerifiableCredential | URL | UrlString,
  options: Omit<AccessBaseOptions, "accessEndpoint"> = {},
): Promise<void> {
  const credential = await getBaseAccess(vc, options, solidVc.SolidAccessGrant);

  if (
    !credential.has(
      quad(namedNode(getId(credential)), TYPE, solidVc.SolidAccessGrant),
    ) &&
    !credential.has(
      quad(namedNode(getId(credential)), TYPE, solidVc.SolidAccessDenial),
    )
  ) {
    throw new Error(
      `An error occurred when type checking the VC: Not of type [${solidVc.SolidAccessGrant.value}] or [${solidVc.SolidAccessDenial.value}].`,
    );
  }

  return revokeVerifiableCredential(
    new URL("status", getIssuer(credential)).href,
    getId(credential),
    {
      fetch: await getSessionFetch(options),
    },
  );
}

export { revokeAccessGrant };
export default revokeAccessGrant;
export type { UrlString, VerifiableCredential };
