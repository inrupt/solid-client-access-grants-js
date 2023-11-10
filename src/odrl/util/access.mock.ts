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

import type { AccessGrantOdrl } from "../type/AccessGrant";
import { verifiableCredentialToDataset } from "@inrupt/solid-client-vc";

export const mockOdrlGrant = (
  issuer = "https://some.issuer",
  subjectId = "https://some.resource.owner",
): Promise<AccessGrantOdrl> => {
  return verifiableCredentialToDataset({
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://www.w3.org/ns/odrl.jsonld",
      "https://www.w3.org/ns/dpv.jsonld",
      "https://www.w3.org/ns/solid/access.jsonld",
    ],
    id: "https://some.credential",
    type: ["VerifiableCredential", "SolidAccessGrant"],
    issuer,
    holder: "https://some.requestor",
    issuanceDate: "2022-06-15T00:00:00Z",
    expirationDate: "2022-06-30T00:00:00Z",
    credentialSubject: {
      id: subjectId,
      type: "Agreement",
      profile: "https://www.w3.org/ns/solid/odrl/access",
      assigner: subjectId,
      assignee: "https://some.requestor",
      permission: [
        {
          target: "https://some.resource",
          action: [
            "http://www.w3.org/ns/auth/acl#Read",
            "http://www.w3.org/ns/auth/acl#Write",
          ],
          constraint: [
            {
              leftOperand: "purpose",
              operator: "eq",
              rightOperand: "InnovativeUseOfNewTechnologies",
            },
            {
              leftOperand: "application",
              operator: "eq",
              rightOperand: "https://app.example/id",
            },
          ],
        },
      ],
    },
    proof: {
      type: "Ed25519Signature2020",
      created: "2022-06-15T00:00:00Z",
      proofValue: "z5SpZtDGGz5a89PJbQT2sg...zmw1jMAR9PJU9mowshQFFdGmDN14D",
      proofPurpose: "assertionMethod",
      verificationMethod: "https://issuer.example/key-1",
    },
  }) as Promise<AccessGrantOdrl>;
};
