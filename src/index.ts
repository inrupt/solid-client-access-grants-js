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

export type { AccessGrant } from "./type/AccessGrant";
export type { AccessBaseOptions } from "./type/AccessBaseOptions";
export type { AccessCredentialType } from "./type/AccessCredentialType";
export type { AccessGrantContext } from "./type/AccessGrantContext";
export type { AccessModes } from "./type/AccessModes";
export type { ApproveAccessRequestOverrides } from "./manage/approveAccessRequest";
export type { FetchOptions } from "./type/FetchOptions";
export type { IssueAccessRequestParameters } from "./type/IssueAccessRequestParameters";
export type { RedirectOptions } from "./type/RedirectOptions";
export type { RedirectToAccessManagementUiOptions } from "./discover";

export {
  getAccessApiEndpoint,
  getAccessManagementUi,
  redirectToAccessManagementUi,
} from "./discover";

export {
  issueAccessRequest,
  cancelAccessRequest,
  getAccessGrantFromRedirectUrl,
} from "./request";

export {
  approveAccessRequest,
  denyAccessRequest,
  getAccessGrant,
  getAccessGrantAll,
  getAccessRequestFromRedirectUrl,
  redirectToRequestor,
  revokeAccessGrant,
  GRANT_VC_URL_PARAM_NAME,
} from "./manage";

export { isValidAccessGrant } from "./verify";

export { fetchWithVc } from "./fetch";

export { getSolidDataset, getFile, saveSolidDatasetAt } from "./resource";
