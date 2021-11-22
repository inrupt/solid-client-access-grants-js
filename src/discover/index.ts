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

/**
 * Import this module for the access API functions available to an entity
 * discovering properties of the access API:
 * - `getAccessApiEndpoint`: Discover the preferred access API endpoint for a resource;
 * - `getConsentManagementUi`: Discover the preferred consent management UI for an entity.
 */
export {
  getAccessApiEndpoint,
  // Deprecated API:
  getConsentApiEndpoint,
} from "./getAccessApiEndpoint";

export { getConsentManagementUi } from "./getConsentManagementUi";
export {
  redirectToAccessManagementUi,
  // Deprecated API:
  redirectToConsentManagementUi,
} from "./redirectToAccessManagementUi";

export type { RedirectToAccessManagementUiOptions } from "./redirectToAccessManagementUi";
