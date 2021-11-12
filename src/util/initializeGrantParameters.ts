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

import { Access, UrlString, WebId } from "@inrupt/solid-client";
import { isConsentRequest } from "../guard/isConsentRequest";
import {
  ACL_RESOURCE_ACCESS_MODE_APPEND,
  ACL_RESOURCE_ACCESS_MODE_CONTROL,
  ACL_RESOURCE_ACCESS_MODE_READ,
  ACL_RESOURCE_ACCESS_MODE_WRITE,
} from "../constants";
import type {
  AccessRequestBody,
  ConsentRequestBody,
} from "../type/AccessVerifiableCredential";
import type { ResourceAccessMode } from "../type/ResourceAccessMode";

function getRequestorFromRequest(requestVc: AccessRequestBody): UrlString {
  return requestVc.credentialSubject.id;
}

function getModesFromRequest(
  requestVc: AccessRequestBody
): ResourceAccessMode[] {
  return requestVc.credentialSubject.hasConsent.mode;
}

function modesToAccess(modes: ResourceAccessMode[]): Partial<Access> {
  const access: Partial<Access> = {};
  access.append = modes.includes(ACL_RESOURCE_ACCESS_MODE_APPEND);
  access.control = modes.includes(ACL_RESOURCE_ACCESS_MODE_CONTROL);
  access.read = modes.includes(ACL_RESOURCE_ACCESS_MODE_READ);
  access.write = modes.includes(ACL_RESOURCE_ACCESS_MODE_WRITE);
  return access;
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

function getPurposeFromConsentRequest(
  requestVc: ConsentRequestBody
): UrlString[] | undefined {
  return requestVc.credentialSubject.hasConsent.forPurpose;
}

function getExpirationFromConsentRequest(
  requestVc: ConsentRequestBody
): Date | undefined {
  return requestVc.expirationDate !== undefined
    ? new Date(requestVc.expirationDate)
    : undefined;
}

export function initializeGrantParameters(
  requestVc?:
    | (AccessRequestBody & { issuanceDate: string })
    | (ConsentRequestBody & { issuanceDate: string }),
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  }>
): Omit<
  Exclude<Required<typeof requestOverride>, undefined>,
  "requestorInboxIri"
> & { requestorInboxIri?: string } {
  let internalOptions: typeof requestOverride;
  if (requestVc === undefined) {
    internalOptions = requestOverride;
  } else {
    internalOptions = {
      requestor:
        requestOverride?.requestor ?? getRequestorFromRequest(requestVc),
      access:
        requestOverride?.access ??
        modesToAccess(getModesFromRequest(requestVc)),
      resources:
        requestOverride?.resources ?? getResourcesFromRequest(requestVc),
      requestorInboxIri:
        requestOverride?.requestorInboxIri ?? getInboxFromRequest(requestVc),
      issuanceDate:
        requestOverride?.issuanceDate ?? getIssuanceFromRequest(requestVc),
    };
    if (isConsentRequest(requestVc)) {
      internalOptions = {
        ...internalOptions,
        purpose:
          requestOverride?.purpose ??
          getPurposeFromConsentRequest(requestVc as ConsentRequestBody),
        expirationDate:
          requestOverride?.expirationDate ??
          getExpirationFromConsentRequest(requestVc as ConsentRequestBody),
      };
    }
  }
  // At this point, all the assertions in internalOptions are initialised, either
  // from the provided VC or from the provided override.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return (internalOptions as Required<typeof requestOverride>)!;
}
