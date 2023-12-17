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
import type { AccessBaseOptions } from "../../gConsent/type/AccessBaseOptions";

/**
 * Dynamically import solid-client-authn-browser so that
 * this library doesn't have a hard dependency.
 *
 * @returns fetch function
 */
export async function getSessionFetch(
  options: AccessBaseOptions,
): Promise<typeof fetch> {
  if (options.fetch) {
    return options.fetch;
  }
  try {
    const { fetch: fetchFn } = await import(
      // @inrupt/solid-client-authn-browser is not in this code's direct dependencies,
      // we dynamically check whether it is in the caller's dependencies.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line import/no-unresolved
      "@inrupt/solid-client-authn-browser"
    );

    return fetchFn;
  } catch (e) {
    /* istanbul ignore next: @inrupt/solid-client-authn-browser is a devDependency, so this path is not hit in tests: */
    return fetch;
  }
}
