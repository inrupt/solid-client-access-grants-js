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
  getFile as coreGetFile,
  overwriteFile as coreOverwriteFile,
  saveFileInContainer as coreSaveFileInContainer,
} from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { fetchWithVc } from "../fetch";
import { FetchOptions } from "../type/FetchOptions";

/**
 * Retrieve a File from a Solid Pod using an Access Grant to prove the caller
 * is authorized to access the target resource.
 *
 * @param resourceUrl The URL of the target resource.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour.
 * @returns A promise that resolves to a File if successful, and that rejects otherwise.
 * @since 0.4.0
 */
export async function getFile(
  resourceUrl: UrlString,
  accessGrant: VerifiableCredential,
  options?: FetchOptions
): ReturnType<typeof coreGetFile> {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    resourceUrl,
    accessGrant,
    fetchOptions
  );

  return coreGetFile.apply(undefined, [
    resourceUrl,
    {
      fetch: authenticatedFetch,
    },
  ]);
}

/**
 * Saves a file at a given URL using an Access Grant to prove the caller is
 * authorized to save a file at the given URL. If a file already exists in the
 * at the URL, the function overwrites the existing file.
 *
 * @param resourceUrl The URL where the file is to be saved.
 * @param file The file to be written.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour, or override the Content-Type of the file.
 * @returns A promise that resolves to a File if successful, and that rejects
 * otherwise.
 * @since unreleased
 */
export async function overwriteFile(
  resourceUrl: UrlString,
  file: File | Buffer,
  accessGrant: VerifiableCredential,
  options?: FetchOptions & { contentType?: string }
): ReturnType<typeof coreOverwriteFile> {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    resourceUrl,
    accessGrant,
    fetchOptions
  );

  const overwriteFileOptions: { contentType?: string } = {};
  if (options && options.contentType) {
    overwriteFileOptions.contentType = options.contentType;
  }

  return coreOverwriteFile.apply(undefined, [
    resourceUrl,
    file,
    {
      ...overwriteFileOptions,
      fetch: authenticatedFetch,
    },
  ]);
}

/**
 * Saves a file in the given container URL using an Access Grant to prove the caller is
 * authorized to save a file in the given container URL.
 *
 * @param containerUrl The container URL where the file is to be saved.
 * @param file The file to be written.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour, or override the Content-Type of the file.
 * @returns A promise that resolves to a File if successful, and that rejects
 * otherwise.
 * @since unreleased
 */

export async function saveFileInContainer(
  containerUrl: UrlString,
  file: File | Buffer,
  accessGrant: VerifiableCredential,
  options?: FetchOptions & { contentType?: string; slug?: string }
): ReturnType<typeof coreSaveFileInContainer> {
  const fetchOptions: FetchOptions = {};
  if (options && options.fetch) {
    fetchOptions.fetch = options.fetch;
  }

  const authenticatedFetch = await fetchWithVc(
    containerUrl,
    accessGrant,
    fetchOptions
  );

  const fileOptions: { contentType?: string; slug?: string } = {};
  if (options && options.contentType) {
    fileOptions.contentType = options.contentType;
  }
  if (options && options.slug) {
    fileOptions.slug = options.slug;
  }

  return coreSaveFileInContainer.apply(undefined, [
    containerUrl,
    file,
    {
      ...fileOptions,
      fetch: authenticatedFetch,
    },
  ]);
}
