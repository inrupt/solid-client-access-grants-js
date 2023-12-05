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

import { ACCESS_GRANT_STATUS } from "../constants";
import type {
  AccessGrantBody,
  BaseAccessVcBody,
} from "../type/AccessVerifiableCredential";

export const GC_CONSENT_STATUS_DENIED =
  "https://w3id.org/GConsent#ConsentStatusDenied";
export const GC_CONSENT_STATUS_EXPLICITLY_GIVEN =
  "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven";
export const GC_CONSENT_STATUS_REQUESTED =
  "https://w3id.org/GConsent#ConsentStatusRequested";

// Implemented as isGConsentAccessGrant in src/common/getters as isGConsentAccessGrant
export function isAccessGrant<T extends BaseAccessVcBody>(
  vc: T,
): vc is T & AccessGrantBody {
  return (
    (vc as AccessGrantBody).credentialSubject.providedConsent !== undefined &&
    ACCESS_GRANT_STATUS.has(
      (vc as AccessGrantBody).credentialSubject.providedConsent.hasStatus,
    ) &&
    typeof (vc as AccessGrantBody).credentialSubject.providedConsent
      .isProvidedTo === "string"
  );
}

/**
 * @deprecated This function checks structural assumptions about the JSON-LD presentation of the Access Grant,
 * which is not recommended. Use the RDFJS API that is now provided instead.
 */
export const CredentialIsAccessGrantGConsent = isAccessGrant;
