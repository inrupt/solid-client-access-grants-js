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

import {
  UrlString,
  getSolidDataset as coreGetSolidDataset,
} from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { fetchWithVc } from "../fetch";
import { FetchOptions } from "../type/FetchOptions";

/**
 * Retrieve a Dataset from a Solid Pod using an Access Grant to prove the caller
 * is authorized to access the target dataset.
 *
 * @see [@inrupt/solid-client's
 * getSolidDataset](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/resource_solidDataset.html#getsoliddataset)
 *
 * @param datasetUrl The URL of the target dataset.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour.
 * @returns A promise that resolves to a SolidDataset if successful, and that
 * rejects otherwise.
 * @since 0.4.0
 */
export async function getSolidDataset(
  datasetUrl: UrlString,
  accessGrant: VerifiableCredential,
  options?: FetchOptions
) {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    datasetUrl,
    accessGrant,
    fetchOptions
  );

  return await coreGetSolidDataset(datasetUrl, {
    ...options,
    fetch: authenticatedFetch,
  });
}
