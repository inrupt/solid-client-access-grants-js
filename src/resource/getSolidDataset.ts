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

// This function isn't exported by the module yet.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchWithVc } from "@inrupt/solid-client-authn-core";
import {
  UrlString,
  getSolidDataset as _getSolidDataset,
  Url,
} from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { getSessionFetch } from "../util/getSessionFetch";

/**
 * This wraps calls to solid-client functions overriding the optional fetch with
 * a fetch authenticated using a VC.
 * @hidden
 */
// We just want the generic type to be callable, the types of its
// arguments and return value are inferred using TS utility types,
// so it's fine to have any in the generic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function wrapSolidClientFunction<T extends (...args: any) => any>(
  accessGrant: VerifiableCredential,
  solidClientFunction: T,
  wrappedParameters: Parameters<T>,
  options?: { fetch: typeof global.fetch }
): Promise<ReturnType<T>> {
  const sessionFetch = await getSessionFetch(options ?? {});
  const authenticatedFetch = await fetchWithVc(accessGrant, {
    fetch: sessionFetch,
  });
  // We know that all the functions we want to wrap accept an options object
  // with a fetch field as their last argument.
  return solidClientFunction(...wrappedParameters.values(), {
    fetch: authenticatedFetch,
  });
}

/**
 * Retrieve a Dataset from a Solid Pod using an Access Grant to prove the caller
 * is authorized to access the target dataset.
 *
 * @param datasetUrl The URL of the target dataset.
 * @param accessGrant The Access Grant VC proving the caller is authorized.
 * @param options Optional properties to customise the request behaviour.
 * @returns A promise that resolves to a SolidDataset if successful, and that rejects otherwise.
 */
export async function getSolidDataset(
  datasetUrl: UrlString | Url,
  accessGrant: VerifiableCredential,
  options?: { fetch: typeof global.fetch }
): ReturnType<typeof _getSolidDataset> {
  return wrapSolidClientFunction(
    accessGrant,
    _getSolidDataset,
    [typeof datasetUrl === "string" ? datasetUrl : datasetUrl.value],
    options
  );
}
