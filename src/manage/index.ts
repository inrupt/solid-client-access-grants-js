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
 * Import this module for the consent API functions available to an entity
 * managing access requests over resources:
 * - `approveAccessRequest`: Approve an access request for a non-commercial entity;
 * - `approveAccessRequestWithConsent`: Approve an access request including a purpose for
 *   legally binding consent to access a resource;
 * - `denyAccessRequest`: Deny access over a resource;
 * - `getAccessGrant`: Retrieve the Access Grant associated to the given URL.
 * - `getAccessGrantAll`: Retrieve the Access Grants issued over a resource;
 * - `revokeAccessGrant`: Revoke previously granted access over a resource.
 */
export { approveAccessRequest } from "./approveAccessRequest";
export { approveAccessRequestWithConsent } from "./approveAccessRequestWithConsent";
export { denyAccessRequest } from "./denyAccessRequest";
export {
  getAccessGrant,
  // Deprecated APIs:
  getAccessWithConsent,
} from "./getAccessGrant";
export {
  getAccessGrantAll,
  // Deprecated APIs:
  getAccessWithConsentAll,
} from "./getAccessGrantAll";
export {
  revokeAccessGrant,
  // Deprecated APIs:
  revokeAccess,
} from "./revokeAccessGrant";
