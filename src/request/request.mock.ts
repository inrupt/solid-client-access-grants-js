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

import {
  buildThing,
  mockSolidDatasetFrom,
  setThing,
  SolidDataset,
  UrlString,
  WithServerResourceInfo,
} from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { PREFERRED_CONSENT_MANAGEMENT_UI } from "../constants";

export const MOCKED_CREDENTIAL_ID = "https://some.credential";
export const MOCKED_ISSUANCE_DATE = "2021-09-07T09:59:00Z";

export const mockAccessGrant = (
  issuer: string,
  subjectId: string,
  subjectClaims?: Record<string, string>
): VerifiableCredential => {
  return {
    "@context": [],
    credentialSubject: {
      id: subjectId,
      ...subjectClaims,
    },
    type: ["SolidCredential", "SolidConsentRequest"],
    id: MOCKED_CREDENTIAL_ID,
    issuanceDate: MOCKED_ISSUANCE_DATE,
    issuer,
    proof: {
      created: MOCKED_ISSUANCE_DATE,
      proofPurpose: "assertionMethod",
      verificationMethod: "https://issuer.jwks",
      proofValue: "eyJhbGciO..E1og50tS9tH8WyXMlXyo45CA",
      type: "Ed25519Signature2018",
    },
  };
};

export const MOCKED_CONSENT_ISSUER = "https://consent-issuer.iri";
export const MOCKED_CONSENT_UI_IRI = "https://some-consent.app";
export const MOCKED_STORAGE = "https://pod-provider.iri";

export const mockWellKnownWithConsent = (
  hasUi = true
): SolidDataset & WithServerResourceInfo => {
  const wellKown = buildThing().addIri(
    "http://inrupt.com/ns/ess#consentIssuer",
    MOCKED_CONSENT_ISSUER
  );
  if (hasUi) {
    wellKown.addIri(PREFERRED_CONSENT_MANAGEMENT_UI, MOCKED_CONSENT_UI_IRI);
  }
  return setThing(
    mockSolidDatasetFrom("https://pod-provider.iri/resource/.well-known/solid"),
    wellKown.build()
  );
};

export const mockWellKnownNoConsent = (): SolidDataset &
  WithServerResourceInfo => {
  const wellKown = buildThing()
    .addIri(
      "http://www.w3.org/ns/pim/space#storage",
      "https://pod-provider.iri"
    )
    .build();
  return setThing(
    mockSolidDatasetFrom("https://pod-provider.iri/resource/.well-known/solid"),
    wellKown
  );
};

export const mockWebIdWithUi = (
  webId: UrlString,
  hasUi = true,
  hasStorage = true
): SolidDataset & WithServerResourceInfo => {
  const profile = buildThing({ url: webId });
  if (hasStorage) {
    profile.addIri("http://www.w3.org/ns/pim/space#storage", MOCKED_STORAGE);
  }
  if (hasUi) {
    profile.addIri(PREFERRED_CONSENT_MANAGEMENT_UI, MOCKED_CONSENT_UI_IRI);
  }
  return setThing(mockSolidDatasetFrom(webId), profile.build());
};
