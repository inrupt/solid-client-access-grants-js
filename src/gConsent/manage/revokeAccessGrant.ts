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
  verifiableCredentialToDataset,
} from "@inrupt/solid-client-vc";
import { DataFactory } from "n3";
import type { NamedNode } from "n3";
import { TYPE, solidVc } from "../../common/constants";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getBaseAccess } from "../util/getBaseAccessVerifiableCredential";
import { isDatasetCore } from "../guard/isDatasetCore";
import { isUrl } from "../../common/util/isUrl";

const { quad, namedNode } = DataFactory;

/**
 * Revokes the given Verifiable Credential (VC). It supports revoking approved/denied Access Grants and Access Requests.
 *
 * This function is called by revokeAccessGrant and cancelAccessRequest.
 * Each of them call this function with the appropriate types parameter: [SolidAccessGrant, SolidAccessDenial] and
 * [SolidAccessRequest] respectively.
 * In both cases, index 0 of types array must contain either SolidAccessGrant or SolidAccessRequest type
 * for getBaseAccess to get the credential.
 * @internal
 */
async function revokeAccessCredential(
  vc: DatasetWithId | VerifiableCredential | URL | UrlString,
  types: NamedNode<string>[],
  options: Omit<AccessBaseOptions, "accessEndpoint"> = {},
): Promise<void> {
  let validVC = null;
  if (
    typeof vc !== "string" &&
    !isUrl(vc.toString()) &&
    !(vc instanceof URL) &&
    !isDatasetCore(vc)
  ) {
    validVC = await verifiableCredentialToDataset(vc, {
      includeVcProperties: true,
      requireId: false,
    });
  }

  const credential = await getBaseAccess(validVC ?? vc, options, types[0]);

  if (
    types.every(
      (vcType) =>
        !credential.has(quad(namedNode(getId(credential)), TYPE, vcType)),
    )
  ) {
    throw new Error(
      `An error occurred when type checking the VC: Not of type [${types.map((type) => type.value).join("] or [")}]`,
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
  return revokeAccessCredential(
    vc,
    [solidVc.SolidAccessGrant, solidVc.SolidAccessDenial],
    options,
  );
}

export { revokeAccessGrant, revokeAccessCredential };
export default revokeAccessGrant;
export type { UrlString, VerifiableCredential };
