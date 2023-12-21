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
import { saveSolidDatasetInContainer as coreSaveSolidDatasetInContainer } from "@inrupt/solid-client";
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { fetchWithVc } from "../fetch";
import type { FetchOptions } from "../type/FetchOptions";
import type { SaveInContainerOptions } from "../type/SaveInContainerOptions";

/**
 * Given a SolidDataset, store it in a Solid Pod as a new Resource inside a Container.
 *
 * The Container at the given URL should already exist; if it does not, you can initialise it first
 * using createContainerAt, or directly save the SolidDataset at the desired location using
 * {@link resource.saveSolidDatasetAt}.
 *
 * This function is primarily useful if the current user has not been granted
 * access to change existing files in a Container, but is allowed to add new
 * files; in other words, they have been granted Append, but not Write access to
 * a Container. This is useful in situations where someone wants to allow others
 * to, for example, send notifications to their Pod, but not to view or delete
 * existing notifications. You can pass a suggestion for the new Resource's
 * name, but the server may decide to give it another name — for example, if a
 * Resource with that name already exists inside the given Container. If the
 * user does have access to write directly to a given location,
 * {@link resource.saveSolidDatasetAt} will do the job just fine, and does not require the
 * parent Container to exist in advance.
 *
 * @see [@inrupt/solid-client's
 * saveSolidDatasetInContainer](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/resource_solidDataset.html#savesoliddatasetincontainer)
 *
 *
 * @param containerUrl URL of the Container in which to create a new Resource.
 * @param solidDataset The SolidDataset to save to a new Resource in the given Container.
 * @param accessGrant The Access Grant that would allow the Agent/Application to perform this operation.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a SolidDataset containing the saved data. The Promise rejects if the save failed.
 * @since 2.1.0
 */

export async function saveSolidDatasetInContainer(
  containerUrl: UrlString,
  solidDataset: SolidDataset,
  accessGrant: VerifiableCredential | DatasetWithId,
  options: SaveInContainerOptions,
) {
  const fetchOptions: FetchOptions = {};

  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    containerUrl,
    accessGrant,
    fetchOptions,
  );

  const containerOptions: { slugSuggestion?: string } = {};

  if (options && options.slugSuggestion) {
    containerOptions.slugSuggestion = options.slugSuggestion;
  }

  return await coreSaveSolidDatasetInContainer(containerUrl, solidDataset, {
    ...containerOptions,
    fetch: authenticatedFetch,
  });
}
