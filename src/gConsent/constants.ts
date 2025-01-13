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

import { gc } from "../common/constants";
import { DEFAULT_CONTEXT } from "../common/providerConfig";

export const GC_CONSENT_STATUS_DENIED_ABBREV = "ConsentStatusDenied";
export const GC_CONSENT_STATUS_EXPLICITLY_GIVEN_ABBREV =
  "ConsentStatusExplicitlyGiven";
export const GC_CONSENT_STATUS_REQUESTED_ABBREV = "ConsentStatusRequested";

export const SOLID_VC_ISSUER = "http://www.w3.org/ns/solid/terms#vcIssuer";

// TODO: Add dependency on generated vocabulary.
export const PIM_STORAGE = "http://www.w3.org/ns/pim/space#storage";

// TODO: This is a temporary filler term, until we publish a definitive term for this.
export const PREFERRED_CONSENT_MANAGEMENT_UI =
  "http://inrupt.com/ns/ess#ConsentManagementUI";

export const CONTEXT_VC_W3C = "https://www.w3.org/2018/credentials/v1" as const;

const extraContext = [
  "https://w3id.org/security/data-integrity/v1",
  "https://w3id.org/vc-revocation-list-2020/v1",
  "https://w3id.org/vc/status-list/2021/v1",
  "https://w3id.org/security/suites/ed25519-2020/v1",
];

export const MOCK_CONTEXT = [
  CONTEXT_VC_W3C,
  DEFAULT_CONTEXT,
  ...extraContext,
] as const;

export const CREDENTIAL_TYPE_ACCESS_REQUEST = "SolidAccessRequest";
export const CREDENTIAL_TYPE_ACCESS_GRANT = "SolidAccessGrant";
export const CREDENTIAL_TYPE_ACCESS_DENIAL = "SolidAccessDenial";
export const CREDENTIAL_TYPE_BASE = "VerifiableCredential";
export const PRESENTATION_TYPE_BASE = "VerifiablePresentation";

export const ACCESS_CREDENTIAL_TYPE = new Set([
  CREDENTIAL_TYPE_ACCESS_REQUEST,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_DENIAL,
  "vc:SolidAccessDenial",
]);

export const ACCESS_GRANT_STATUS = Object.freeze(
  new Set([
    gc.ConsentStatusDenied.value,
    gc.ConsentStatusExplicitlyGiven.value,
    GC_CONSENT_STATUS_DENIED_ABBREV,
    "gc:ConsentStatusDenied",
    "Consent:StatusDenied",
    GC_CONSENT_STATUS_EXPLICITLY_GIVEN_ABBREV,
  ]),
);

export const ACCESS_REQUEST_STATUS = Object.freeze(
  new Set([
    gc.ConsentStatusRequested.value,
    GC_CONSENT_STATUS_REQUESTED_ABBREV,
  ]),
);

export const ACCESS_STATUS = Object.freeze(
  new Set([...ACCESS_GRANT_STATUS, ...ACCESS_REQUEST_STATUS]),
);
