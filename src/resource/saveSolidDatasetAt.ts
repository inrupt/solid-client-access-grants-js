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

import type { UrlString, SolidDataset } from "@inrupt/solid-client";
import { saveSolidDatasetAt as coreSaveSolidDatasetAt } from "@inrupt/solid-client";
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { fetchWithVc } from "../fetch";
import type { FetchOptions } from "../type/FetchOptions";

/**
 * Saves a Dataset in a Solid Pod using an Access Grant to prove the caller is
 * authorized to write or append to the dataset at the given dataset URL.
 *
 * ```{note} This function does not support saving a dataset if the
 * dataset does not yet exist, unlike its `@inrupt/solid-client`
 * counterpart.
 * ```
 *
 * @see [@inrupt/solid-client's
 * saveSolidDatasetAt](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/resource_solidDataset.html#savesoliddatasetat)
 *
 * @param datasetUrl The URL of the dataset to save.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour.
 * @returns A promise that resolves to a SolidDataset if successful, and that
 * rejects otherwise.
 * @since 0.4.0
 */
export async function saveSolidDatasetAt<Dataset extends SolidDataset>(
  datasetUrl: UrlString,
  solidDataset: Dataset,
  accessGrant: VerifiableCredential | DatasetWithId,
  options?: FetchOptions,
) {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    datasetUrl,
    accessGrant,
    fetchOptions,
  );

  return await coreSaveSolidDatasetAt(datasetUrl, solidDataset, {
    ...options,
    fetch: authenticatedFetch,
  });
}
