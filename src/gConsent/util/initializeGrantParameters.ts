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

import { DatasetWithId, getCredentialSubject, getExpirationDate, getIssuanceDate } from "@inrupt/solid-client-vc";
import { DataFactory } from "n3";
import { getAccessModes, getResources } from "../../common";
import { getConsent, getInbox, getInherit, getPurposes } from "../../common/getters";
import type { ApproveAccessRequestOverrides } from "../manage/approveAccessRequest";
import { INHERIT, XSD_BOOLEAN } from "../../common/constants";
const { quad, literal, defaultGraph } = DataFactory;

export function initializeGrantParameters(
  requestVc: DatasetWithId | undefined,
  requestOverride?: Partial<ApproveAccessRequestOverrides>,
): ApproveAccessRequestOverrides {
  const hasInherit = (str: 'true' | 'false') => requestVc!.has(
    quad(
      getConsent(requestVc!),
      INHERIT,
      literal(str, XSD_BOOLEAN),
      defaultGraph(),
    ),
  )

  const resultGrant =
    requestVc === undefined
      ? (requestOverride as ApproveAccessRequestOverrides)
      : {
          requestor: requestOverride?.requestor ?? getCredentialSubject(requestVc).value,
          access: requestOverride?.access ?? getAccessModes(requestVc),
          resources: requestOverride?.resources ?? getResources(requestVc),
          requestorInboxUrl: requestOverride?.requestorInboxUrl ?? getInbox(requestVc),
          issuanceDate: requestOverride?.issuanceDate ?? getIssuanceDate(requestVc),
          purpose: requestOverride?.purpose ?? getPurposes(requestVc),
          expirationDate: requestOverride?.expirationDate ?? getExpirationDate(requestVc),
          inherit: requestOverride?.inherit ?? (hasInherit('false') ? false : (hasInherit('true') ? true : undefined))
        };
  if (requestOverride?.expirationDate === null) {
    resultGrant.expirationDate = undefined;
  }
  return resultGrant;
}
