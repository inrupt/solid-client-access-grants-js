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

import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  getVerifiableCredential,
  verifiableCredentialToDataset,
} from "@inrupt/solid-client-vc";
import type { UrlString } from "@inrupt/solid-client";
import { isDatasetCore } from "../../gConsent/guard/isDatasetCore";
import type { AccessBaseOptions } from "../../gConsent";

/**
 *
 * @param vc
 * @param options
 * @returns
 */
export async function toVcDataset(
  vc: DatasetWithId | VerifiableCredential | URL | UrlString | undefined,
  options?: AccessBaseOptions,
): Promise<DatasetWithId | undefined> {
  if (vc !== undefined && isDatasetCore(vc)) {
    return vc;
  }
  // fetch the vc if it is valid
  if (typeof vc === "string" || vc instanceof URL) {
    return getVerifiableCredential(vc.toString(), {
      returnLegacyJsonld: false,
      skipValidation: true,
      fetch: options?.fetch,
    });
  }
  // convert it to valid VC otherwise
  if (typeof vc === "object" && typeof (vc as { id: string }).id === "string") {
    return verifiableCredentialToDataset(vc, {
      includeVcProperties: true,
      requireId: true,
    });
  }
  return undefined;
}
