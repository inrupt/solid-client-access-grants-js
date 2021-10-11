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

import { CREDENTIAL_TYPE } from "../constants";
import {
  BaseBody,
  BaseGrantBody,
  BaseRequestBody,
} from "../type/AccessVerifiableCredential";
import { isUnknownObject } from "./isUnknownObject";
import { isConsentContext } from "./isConsentContext";
import { isConsentStatus } from "./isConsentStatus";

function isBaseVc(x: unknown): x is BaseBody {
  return (
    isUnknownObject(x) &&
    isConsentContext(x["@context"]) &&
    Array.isArray(x.type) &&
    x.type.includes(CREDENTIAL_TYPE) &&
    isUnknownObject(x.credentialSubject) &&
    typeof x.credentialSubject.id === "string" &&
    typeof x.credentialSubject.inbox === "string"
  );
}

// TODO: Fix type checking
export function isBaseRequestVerifiableCredential(
  x: unknown
): x is BaseRequestBody {
  return (
    isBaseVc(x) &&
    (x as BaseRequestBody).credentialSubject.hasConsent !== undefined &&
    // TODO: Add mode check
    (x as BaseRequestBody).credentialSubject.hasConsent.mode !== undefined &&
    isConsentStatus(
      (x as BaseRequestBody).credentialSubject.hasConsent.hasStatus
    ) &&
    // TODO: Add Array of string check
    Array.isArray(
      (x as BaseRequestBody).credentialSubject.hasConsent.forPersonalData
    ) &&
    typeof x.credentialSubject.inbox === "string"
  );
}

// TODO: Fix type checking
export function isBaseGrantVerifiableCredential(
  x: unknown
): x is BaseGrantBody {
  return (
    isBaseVc(x) &&
    (x as BaseGrantBody).credentialSubject.providedConsent !== undefined &&
    // TODO: Add mode check
    (x as BaseGrantBody).credentialSubject.providedConsent.mode !== undefined &&
    isConsentStatus(
      (x as BaseGrantBody).credentialSubject.providedConsent.hasStatus
    ) &&
    // TODO: Add Array of string check
    Array.isArray(
      (x as BaseGrantBody).credentialSubject.providedConsent.forPersonalData
    ) &&
    typeof x.credentialSubject.inbox === "string"
  );
}
