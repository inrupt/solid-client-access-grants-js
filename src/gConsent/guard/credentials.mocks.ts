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

import type * as VcLibrary from "@inrupt/solid-client-vc";

export const validAccessGrantVerifiableCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://vc.inrupt.com/credentials/v1",
  ],
  credentialSubject: {
    providedConsent: {
      mode: ["http://www.w3.org/ns/auth/acl#Read"],
      hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
      forPersonalData: ["https://example.pod/resourceX"],
      forPurpose: "https://example.org/someSpecificPurpose",
    },
    id: "https://example.pod/bob",
    inbox: "https://example.pod/bob/inbox/",
  },
  id: "https://consent.service.example.com/vc/52ff98a9-xxxx-xxxx-xxxx-598adef0aafe",
  issuanceDate: "2021-10-08T08:48:54.428Z",
  issuer: "https://consent.service.example.com",
  proof: {
    created: "2021-10-08T08:48:56.538Z",
    domain: "solid",
    proofPurpose: "assertionMethod",
    proofValue:
      "SfZGjxiZGqTb7oC7rylJviE2fDTtG5hKsjh9s6bUoqyQUgfaMZ--QMz5tGGD1LSSyfFGhF1I-IG8fDvAmpXTDg",
    type: "Ed25519Signature2020",
    verificationMethod:
      "https://consent.service.example.com/key/f82e5979-xxxx-xxxx-xxxx-cd9d2105d314",
  },
  type: ["VerifiableCredential", "SolidAccessGrant"],
};

export const validAccessRequestVerifiableCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://vc.inrupt.com/credentials/v1",
  ],
  credentialSubject: {
    hasConsent: {
      mode: ["http://www.w3.org/ns/auth/acl#Read"],
      hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
      forPersonalData: ["https://example.pod/resourceX"],
      forPurpose: "https://example.org/someSpecificPurpose",
      isConsentForDataSubject: "https://example.org/alice",
    },
    id: "https://example.pod/bob",
    inbox: "https://example.pod/bob/inbox/",
  },
  id: "https://consent.service.example.com/vc/52ff98a9-xxxx-xxxx-xxxx-598adef0aafe",
  issuanceDate: "2021-10-08T08:48:54.428Z",
  issuer: "https://consent.service.example.com",
  proof: {
    created: "2021-10-08T08:48:56.538Z",
    domain: "solid",
    proofPurpose: "assertionMethod",
    proofValue:
      "SfZGjxiZGqTb7oC7rylJviE2fDTtG5hKsjh9s6bUoqyQUgfaMZ--QMz5tGGD1LSSyfFGhF1I-IG8fDvAmpXTDg",
    type: "Ed25519Signature2020",
    verificationMethod:
      "https://consent.service.example.com/key/f82e5979-xxxx-xxxx-xxxx-cd9d2105d314",
  },
  type: ["VerifiableCredential", "SolidAccessRequest"],
};

export const mockCredentialProof =
  (): VcLibrary.VerifiableCredential["proof"] => ({
    created: "some date",
    proofPurpose: "some purpose",
    proofValue: "some value",
    type: "some type",
    verificationMethod: "https://example.org/some/verification/method",
  });
