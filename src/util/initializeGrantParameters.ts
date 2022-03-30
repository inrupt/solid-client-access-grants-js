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

import { access, UrlString } from "@inrupt/solid-client";
import {
  ACL_RESOURCE_ACCESS_MODE_APPEND,
  ACL_RESOURCE_ACCESS_MODE_CONTROL,
  ACL_RESOURCE_ACCESS_MODE_READ,
  ACL_RESOURCE_ACCESS_MODE_WRITE,
} from "../constants";
import type { AccessRequestBody } from "../type/AccessVerifiableCredential";
import type { ResourceAccessMode } from "../type/ResourceAccessMode";
import { ApproveAccessRequestOverrides } from "../manage/approveAccessRequest";

function getRequestorFromRequest(requestVc: AccessRequestBody): UrlString {
  return requestVc.credentialSubject.id;
}

function getModesFromRequest(
  requestVc: AccessRequestBody
): ResourceAccessMode[] {
  return requestVc.credentialSubject.hasConsent.mode;
}

function modesToAccess(modes: ResourceAccessMode[]): Partial<access.Access> {
  const accessMode: Partial<access.Access> = {};
  accessMode.append = modes.includes(ACL_RESOURCE_ACCESS_MODE_APPEND);
  accessMode.controlRead = modes.includes(ACL_RESOURCE_ACCESS_MODE_CONTROL);
  accessMode.controlWrite = modes.includes(ACL_RESOURCE_ACCESS_MODE_CONTROL);
  accessMode.read = modes.includes(ACL_RESOURCE_ACCESS_MODE_READ);
  accessMode.write = modes.includes(ACL_RESOURCE_ACCESS_MODE_WRITE);
  return accessMode;
}

function getInboxFromRequest(
  requestVc: AccessRequestBody
): UrlString | undefined {
  return requestVc.credentialSubject.inbox;
}

function getResourcesFromRequest(requestVc: AccessRequestBody): UrlString[] {
  return requestVc.credentialSubject.hasConsent.forPersonalData;
}

function getIssuanceFromRequest(
  requestVc: AccessRequestBody & { issuanceDate: string }
): Date | undefined {
  return new Date(requestVc.issuanceDate);
}

function getPurposeFromRequest(
  requestVc: AccessRequestBody
): UrlString[] | undefined {
  return requestVc.credentialSubject.hasConsent.forPurpose;
}

function getExpirationFromRequest(
  requestVc: AccessRequestBody
): Date | undefined {
  return requestVc.expirationDate !== undefined
    ? new Date(requestVc.expirationDate)
    : undefined;
}

export function initializeGrantParameters(
  requestVc: (AccessRequestBody & { issuanceDate: string }) | undefined,
  requestOverride?: Partial<ApproveAccessRequestOverrides>
): ApproveAccessRequestOverrides {
  return requestVc === undefined
    ? (requestOverride as ApproveAccessRequestOverrides)
    : {
        requestor:
          requestOverride?.requestor ?? getRequestorFromRequest(requestVc),
        access:
          requestOverride?.access ??
          modesToAccess(getModesFromRequest(requestVc)),
        resources:
          requestOverride?.resources ?? getResourcesFromRequest(requestVc),
        requestorInboxUrl:
          requestOverride?.requestorInboxUrl ?? getInboxFromRequest(requestVc),
        issuanceDate:
          requestOverride?.issuanceDate ?? getIssuanceFromRequest(requestVc),
        purpose: requestOverride?.purpose ?? getPurposeFromRequest(requestVc),
        expirationDate:
          requestOverride?.expirationDate ??
          getExpirationFromRequest(requestVc),
      };
}
