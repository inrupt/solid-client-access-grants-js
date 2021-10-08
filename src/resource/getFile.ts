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

import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { getFile as _getFile, Url, UrlString } from "@inrupt/solid-client";
import { wrapSolidClientFunction } from "./getSolidDataset";

/**
 * Retrieve a File from a Solid Pod using an Access Grant to prove the caller
 * is authorized to access the target dataset.
 *
 * @param fileUrl The URL of the target file.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour.
 * @returns A promise that resolves to a File if successful, and that rejects otherwise.
 */
export async function getFile(
  fileUrl: UrlString | Url,
  accessGrant: VerifiableCredential,
  options?: { fetch: typeof global.fetch }
): ReturnType<typeof _getFile> {
  return wrapSolidClientFunction(
    accessGrant,
    _getFile,
    [typeof fileUrl === "string" ? fileUrl : fileUrl.value],
    options
  );
}
