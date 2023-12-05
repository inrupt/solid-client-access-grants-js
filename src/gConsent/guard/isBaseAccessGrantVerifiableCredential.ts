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

import type { DatasetWithId } from "@inrupt/solid-client-vc";
import { solidVc } from "../../common/constants";
import type {
  BaseGrantBody,
  GrantCredentialSubject,
  GrantCredentialSubjectPayload,
  RequestCredentialSubject,
  RequestCredentialSubjectPayload,
} from "../type/AccessVerifiableCredential";
import {
  isBaseAccessVcBody,
  isRdfjsAccessVerifiableCredential,
} from "./isBaseAccessVcBody";
import { isGConsentAttributes } from "./isGConsentAttributes";

/**
 * @deprecated This function checks structural assumptions about the JSON-LD presentation of the Access Grant,
 * which is not recommended. Use the RDFJS API that is now provided instead.
 */
function isGrantCredentialSubject(
  x:
    | RequestCredentialSubject
    | GrantCredentialSubject
    | GrantCredentialSubjectPayload
    | RequestCredentialSubjectPayload,
): x is GrantCredentialSubject {
  return (x as GrantCredentialSubject).providedConsent !== undefined;
}

/**
 * @deprecated This function checks structural assumptions about the JSON-LD presentation of the Access Grant,
 * which is not recommended. Use the RDFJS API that is now provided instead.
 */
export function isBaseAccessGrantVerifiableCredential(
  x: unknown,
): x is BaseGrantBody {
  return (
    isBaseAccessVcBody(x) &&
    isGrantCredentialSubject(x.credentialSubject) &&
    isGConsentAttributes(x.credentialSubject.providedConsent)
  );
}

export function isRdfjsBaseAccessGrantVerifiableCredential(
  data: DatasetWithId,
) {
  return isRdfjsAccessVerifiableCredential(data, [
    solidVc.SolidAccessDenial,
    solidVc.SolidAccessGrant,
  ]);
}
