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
import { getCredentialSubject, getIssuanceDate } from "@inrupt/solid-client-vc";
import type { BlankNode, NamedNode } from "@rdfjs/types";
import { DataFactory } from "n3";
import { ACCESS_REQUEST_STATUS } from "../constants";
import type { AccessRequestBody } from "../type/AccessVerifiableCredential";
import { isRdfjsBaseAccessGrantVerifiableCredential } from "./isBaseAccessGrantVerifiableCredential";
import { isBaseAccessRequestVerifiableCredential } from "./isBaseAccessRequestVerifiableCredential";
import { gc } from "../../common/constants";
import { getResourceOwner, getSingleObject } from "../../common/getters";
import { isRdfjsGConsentAttributes } from "./isGConsentAttributes";

const { quad, defaultGraph, namedNode } = DataFactory;

export function isAccessRequest(
  x: unknown,
): x is AccessRequestBody & { issuanceDate: string } {
  return (
    isBaseAccessRequestVerifiableCredential(x) &&
    ACCESS_REQUEST_STATUS.has(x.credentialSubject.hasConsent.hasStatus) &&
    x.credentialSubject.hasConsent.isConsentForDataSubject !== undefined &&
    typeof x.issuanceDate === "string"
  );
}

export function isRdfjsAccessRequest(dataset: DatasetWithId) {
  let consent: NamedNode | BlankNode;
  try {
    // There must be an issuance date
    getIssuanceDate(dataset);
    consent = getSingleObject(
      dataset,
      getCredentialSubject(dataset),
      gc.hasConsent,
    );
  } catch {
    return false;
  }

  return (
    isRdfjsGConsentAttributes(dataset, consent) &&
    dataset.has(quad(consent, gc.hasStatus, gc.ConsentStatusRequested)) &&
    dataset.match(consent, gc.isConsentForDataSubject, null, defaultGraph())
      .size === 1
  );

  // return isRdfjsBaseAccessGrantVerifiableCredential(dataset)
  //   && dataset.has(quad(consent, gc.hasStatus, gc.ConsentStatusRequested))
  //   && dataset.match(consent, gc.isConsentForDataSubject, null, defaultGraph()).size === 1
}
