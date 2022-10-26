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

export type {
  AccessGrant,
  AccessBaseOptions,
  AccessCredentialType,
  AccessGrantContext,
  AccessModes,
  AccessRequest,
  ApproveAccessRequestOverrides,
  IssueAccessRequestParameters,
  RedirectToAccessManagementUiOptions,
} from "./gConsent";

export type { FetchOptions } from "./type/FetchOptions";
export type { RedirectOptions } from "./type/RedirectOptions";

export {
  getAccessApiEndpoint,
  getAccessManagementUi,
  redirectToAccessManagementUi,
  issueAccessRequest,
  cancelAccessRequest,
  getAccessGrantFromRedirectUrl,
  approveAccessRequest,
  denyAccessRequest,
  getAccessGrant,
  getAccessGrantAll,
  getAccessRequestFromRedirectUrl,
  redirectToRequestor,
  revokeAccessGrant,
  GRANT_VC_URL_PARAM_NAME,
  isValidAccessGrant,
} from "./gConsent";

// Add an API object to the exports to allow explicitly relying on the gConsent-based
// functions even when not relying on named exports.
export * as gConsent from "./gConsent";

// For backwards compatibility, all the functions handling odrl-based Access Grants
// are exported from an API object to avoid clashes with the gConsent ones.
/**
 * @unstable
 * @from unreleased
 */
export * as odrl from "./odrl";

export { fetchWithVc } from "./fetch";

export {
  getSolidDataset,
  getFile,
  overwriteFile,
  saveFileInContainer,
  saveSolidDatasetAt,
} from "./resource";
