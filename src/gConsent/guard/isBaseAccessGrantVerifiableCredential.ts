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
import { getId, getIssuanceDate } from "@inrupt/solid-client-vc";
import { DataFactory } from "n3";
import { TYPE, solidVc } from "../../common/constants";
import { getConsent } from "../../common/getters";
import type {
  BaseGrantBody,
  GrantCredentialSubject,
  GrantCredentialSubjectPayload,
  RequestCredentialSubject,
  RequestCredentialSubjectPayload,
} from "../type/AccessVerifiableCredential";
import { isBaseAccessVcBody } from "./isBaseAccessVcBody";
import {
  isGConsentAttributes,
  isRdfjsGConsentAttributes,
} from "./isGConsentAttributes";

const { namedNode, quad } = DataFactory;

function isGrantCredentialSubject(
  x:
    | RequestCredentialSubject
    | GrantCredentialSubject
    | GrantCredentialSubjectPayload
    | RequestCredentialSubjectPayload,
): x is GrantCredentialSubject {
  return (x as GrantCredentialSubject).providedConsent !== undefined;
}

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
  const s = namedNode(getId(data));
  if (
    !data.has(quad(s, TYPE, solidVc.SolidAccessDenial)) &&
    !data.has(quad(s, TYPE, solidVc.SolidAccessGrant)) &&
    !data.has(quad(s, TYPE, solidVc.SolidAccessRequest))
  ) {
    return false;
  }

  // getConsent and getIssuanceDate can error
  try {
    getIssuanceDate(data);
    return isRdfjsGConsentAttributes(data, getConsent(data));
  } catch (e) {
    return false;
  }
}
