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

import { DataFactory } from "n3";
import type { DatasetWithId } from "@inrupt/solid-client-vc";
import { getIssuanceDate } from "@inrupt/solid-client-vc";
import type { NamedNode } from "n3";
import type { BaseAccessVcBody } from "../type/AccessVerifiableCredential";
import { isAccessCredentialType } from "./isAccessCredentialType";
import { isAccessGrantContext } from "./isAccessGrantContext";
import { isUnknownObject } from "./isUnknownObject";
import { getConsent, getId } from "../../common/getters";
import { TYPE } from "../../common/constants";
import { isRdfjsGConsentAttributes } from "./isGConsentAttributes";

const { namedNode, quad } = DataFactory;

/**
 * @deprecated This function checks structural assumptions about the JSON-LD presentation of the VC,
 * which is not recommended. Use the RDFJS API that is now provided instead.
 */
export function isBaseAccessVcBody(x: unknown): x is BaseAccessVcBody {
  return (
    isUnknownObject(x) &&
    isAccessGrantContext(x["@context"]) &&
    Array.isArray(x.type) &&
    isAccessCredentialType(x.type) &&
    isUnknownObject(x.credentialSubject) &&
    typeof x.credentialSubject.id === "string" &&
    (typeof x.credentialSubject.inbox === "string" ||
      typeof x.credentialSubject.inbox === "undefined") &&
    (x.issuanceDate !== undefined ? typeof x.issuanceDate === "string" : true)
  );
}

export function isRdfjsAccessVerifiableCredential(
  data: DatasetWithId,
  expectedTypes: NamedNode[],
) {
  const s = namedNode(getId(data));
  if (!expectedTypes.some((type) => data.has(quad(s, TYPE, type)))) {
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
