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

export type {
  AccessBaseOptions,
  AccessCredentialType,
  AccessGrant,
  AccessGrantContext,
  AccessRequest,
  ApproveAccessRequestOverrides,
  IssueAccessRequestParameters,
  RedirectToAccessManagementUiOptions,
} from "./gConsent";
export type { AccessParameters } from "./gConsent/manage/getAccessGrantAll";

export type { AccessGrantAny } from "./type/AccessGrant";
export type { AccessModes } from "./type/AccessModes";
export type { FetchOptions } from "./type/FetchOptions";
export type { RedirectOptions } from "./type/RedirectOptions";
export type { SaveInContainerOptions } from "./type/SaveInContainerOptions";
export { CredentialIsAccessGrantAny } from "./type/AccessGrant";

export {
  approveAccessRequest,
  cancelAccessRequest,
  denyAccessRequest,
  getAccessApiEndpoint,
  getAccessGrant,
  getAccessGrantAll,
  getAccessGrantFromRedirectUrl,
  getAccessRequest,
  getAccessManagementUi,
  getAccessRequestFromRedirectUrl,
  issueAccessRequest,
  redirectToAccessManagementUi,
  redirectToRequestor,
  revokeAccessGrant,
  GRANT_VC_URL_PARAM_NAME,
} from "./gConsent";

// Add an API object to the exports to allow explicitly relying on the gConsent-based
// functions even when not relying on named exports.
export * as gConsent from "./gConsent";

export { isValidAccessGrant } from "./common/verify";

export * as common from "./common";

export { fetchWithVc } from "./fetch";

export {
  createContainerInContainer,
  deleteFile,
  deleteSolidDataset,
  getFile,
  getSolidDataset,
  overwriteFile,
  saveFileInContainer,
  saveSolidDatasetAt,
  saveSolidDatasetInContainer,
} from "./resource";

export {
  AccessGrantWrapper,
  getAccessModes,
  getExpirationDate,
  getId,
  getIssuanceDate,
  getIssuer,
  getRequestor,
  getResourceOwner,
  getResources,
  getTypes,
  getPurposes,
  getConsent,
  getCredentialSubject,
  getInbox,
  getInherit,
} from "./common/getters";

export type { DatasetWithId } from "@inrupt/solid-client-vc";
