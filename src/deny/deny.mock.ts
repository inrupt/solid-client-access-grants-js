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

import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { CONSENT_CONTEXT } from "../constants";
import { BaseAccessBody } from "../type/BaseAccessBody";

// eslint-disable-next-line import/prefer-default-export
export const mockDenyAccessVc = (): VerifiableCredential & BaseAccessBody => {
  return {
    "@context": CONSENT_CONTEXT,
    id: "https://some.credential",
    credentialSubject: {
      id: "https://some.requestor",
      hasConsent: {
        forPersonalData: ["https://some.resource"],
        hasStatus: "ConsentStatusRequested",
        mode: ["Read"],
      },
      inbox: "https://some.inbox",
    },
    issuanceDate: "some ISO date",
    issuer: "https://some.issuer",
    proof: {
      created: "some ISO date",
      proofPurpose: "some proof purpose",
      proofValue: "some proof",
      type: "some proof type",
      verificationMethod: "some method",
    },
    type: ["SolidConsentRequest"],
  };
};
