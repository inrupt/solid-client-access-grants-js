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
import type { RedirectOptions } from "../../type/RedirectOptions";

/**
 * Internal function implementing redirection with some query parameters.
 *
 * @hidden
 */
export async function redirectWithParameters(
  target: UrlString,
  queryParams: Record<string, string>,
  options: RedirectOptions,
): Promise<void> {
  const targetUrl = new URL(target);

  Object.entries(queryParams).forEach(([key, value]) => {
    targetUrl.searchParams.append(key, value);
  });

  if (options.redirectCallback !== undefined) {
    options.redirectCallback(targetUrl.href);
  } else {
    if (typeof window === "undefined") {
      throw new Error(
        "In a non-browser environment, a redirectCallback must be provided by the user.",
      );
    }
    window.location.href = targetUrl.href;
  }
  // This redirects the user away from the app, so unless it throws an error,
  // there is no code that should run afterwards (since there is no "after" in
  // script's lifetime). Hence, this Promise never resolves:
  return new Promise(() => {});
}
