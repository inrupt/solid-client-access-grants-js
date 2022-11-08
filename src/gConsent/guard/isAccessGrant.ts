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

import {
  GC_CONSENT_STATUS_DENIED,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
} from "../constants";
import {
  AccessGrantBody,
  BaseAccessVcBody,
} from "../type/AccessVerifiableCredential";

export function isAccessGrant(
  vc: BaseAccessVcBody
): vc is BaseAccessVcBody & AccessGrantBody {
  return (
    (vc as AccessGrantBody).credentialSubject.providedConsent !== undefined &&
    [GC_CONSENT_STATUS_EXPLICITLY_GIVEN, GC_CONSENT_STATUS_DENIED].includes(
      (vc as AccessGrantBody).credentialSubject.providedConsent.hasStatus
    ) &&
    typeof (vc as AccessGrantBody).credentialSubject.providedConsent
      .isProvidedTo === "string"
  );
}

export const CredentialIsAccessGrantGConsent = isAccessGrant;
