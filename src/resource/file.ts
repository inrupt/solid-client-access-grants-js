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

import type { File as NodeFile } from "buffer";
import type { UrlString, WithResourceInfo } from "@inrupt/solid-client";
import {
  getFile as coreGetFile,
  overwriteFile as coreOverwriteFile,
  saveFileInContainer as coreSaveFileInContainer,
} from "@inrupt/solid-client";
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { fetchWithVc } from "../fetch";
import type { FetchOptions } from "../type/FetchOptions";

/**
 * Retrieve a File from a Solid Pod using an Access Grant to prove the caller is
 * authorized to access the target resource.
 *
 * @see [@inrupt/solid-client's
 * getFile](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/resource_file.html#getfile)
 *
 * @param resourceUrl The URL of the target resource.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour.
 * @returns A promise that resolves to a File if successful, and that rejects
 * otherwise.
 * @since 0.4.0
 */
export async function getFile(
  resourceUrl: UrlString,
  accessGrant: VerifiableCredential | DatasetWithId,
  options?: FetchOptions,
) {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    resourceUrl,
    accessGrant,
    fetchOptions,
  );

  return await coreGetFile(resourceUrl, {
    fetch: authenticatedFetch,
  });
}

/**
 * Overwrites the file using an Access Grant to prove the caller is authorized
 * to write to the given resource URL.
 *
 * ```{note} This function does not support saving a file if the file does not
 * yet exist, unlike its `@inrupt/solid-client` counterpart. To save a new file
 * in a container, you should use [saveFileInContainer](#savefileincontainer)
 * instead.
 * ```
 *
 * @see [@inrupt/solid-client's
 * overwriteFile](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/resource_file.html#overwritefile)
 *
 * @param resourceUrl The URL where the file is located.
 * @param file The file to be written.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour, or
 * override the Content-Type of the file.
 * @returns A promise that resolves to a File if successful, and that rejects
 * otherwise.
 * @since 1.1.0
 */
export async function overwriteFile<T extends File | NodeFile | Blob>(
  resourceUrl: UrlString,
  file: T,
  accessGrant: VerifiableCredential | DatasetWithId,
  options?: FetchOptions & { contentType?: string },
): Promise<T & WithResourceInfo> {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    resourceUrl,
    accessGrant,
    fetchOptions,
  );

  const overwriteFileOptions: { contentType?: string } = {};
  if (options && options.contentType) {
    overwriteFileOptions.contentType = options.contentType;
  }

  return await coreOverwriteFile(resourceUrl, file, {
    ...overwriteFileOptions,
    fetch: authenticatedFetch,
  });
}

/**
 * Saves a file in the given container URL using an Access Grant to prove the caller is
 * authorized to save a file in the given container.
 *
 * @see [@inrupt/solid-client's
 * saveFileInContainer](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/resource_file.html#savefileincontainer)
 *
 * @param containerUrl The container URL where the file is to be saved.
 * @param file The file to be written.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour, or override the Content-Type of the file.
 * @returns A promise that resolves to a File if successful, and that rejects
 * otherwise.
 * @since 1.1.0
 */
export async function saveFileInContainer<T extends File | NodeFile | Blob>(
  containerUrl: UrlString,
  file: T,
  accessGrant: VerifiableCredential | DatasetWithId,
  options?: FetchOptions & { contentType?: string; slug?: string },
): Promise<T & WithResourceInfo> {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    containerUrl,
    accessGrant,
    fetchOptions,
  );

  const fileOptions: { contentType?: string; slug?: string } = {};
  if (options && options.contentType) {
    fileOptions.contentType = options.contentType;
  }
  if (options && options.slug) {
    fileOptions.slug = options.slug;
  }

  return await coreSaveFileInContainer(containerUrl, file, {
    ...fileOptions,
    fetch: authenticatedFetch,
  });
}
