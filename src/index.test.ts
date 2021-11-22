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

// This rule complains about the `@jest/globals` variables overriding global vars:
/* eslint-disable no-shadow */
import { describe, it, expect } from "@jest/globals";
import {
  approveAccessRequest,
  approveAccessRequestWithConsent,
  cancelAccessRequest,
  denyAccessRequest,
  getAccessGrant,
  getAccessGrantAll,
  getAccessApiEndpoint,
  getAccessManagementUi,
  isValidAccessGrant,
  issueAccessRequest,
  redirectToAccessManagementUi,
  revokeAccessGrant,
  // Deprecated APIs:
  getConsentApiEndpoint,
  getConsentManagementUi,
  getAccessWithConsent,
  getAccessWithConsentAll,
  redirectToConsentManagementUi,
  requestAccess,
  requestAccessWithConsent,
  revokeAccess,
  isValidConsentGrant,
} from "./index";

describe("Index exports", () => {
  it("exposes expected things", () => {
    expect(approveAccessRequest).toBeDefined();
    expect(approveAccessRequestWithConsent).toBeDefined();
    expect(cancelAccessRequest).toBeDefined();
    expect(denyAccessRequest).toBeDefined();
    expect(getAccessGrant).toBeDefined();
    expect(getAccessGrantAll).toBeDefined();
    expect(getAccessApiEndpoint).toBeDefined();
    expect(getAccessManagementUi).toBeDefined();
    expect(isValidAccessGrant).toBeDefined();
    expect(issueAccessRequest).toBeDefined();
    expect(redirectToAccessManagementUi).toBeDefined();
    expect(revokeAccessGrant).toBeDefined();

    // Deprecated APIs:
    expect(getConsentApiEndpoint).toBeDefined();
    expect(getConsentManagementUi).toBeDefined();
    expect(getAccessWithConsent).toBeDefined();
    expect(getAccessWithConsentAll).toBeDefined();
    expect(redirectToConsentManagementUi).toBeDefined();
    expect(requestAccess).toBeDefined();
    expect(requestAccessWithConsent).toBeDefined();
    expect(revokeAccess).toBeDefined();
    expect(isValidConsentGrant).toBeDefined();
  });
});
