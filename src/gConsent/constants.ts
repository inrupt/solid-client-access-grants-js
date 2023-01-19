//
// Copyright 2022 Inrupt Inc.
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

export const AS_ACTOR = "https://www.w3.org/ns/activitystreams#actor";
export const AS_ANNOUNCE = "https://www.w3.org/ns/activitystreams#Announce";
export const AS_OBJECT = "https://www.w3.org/ns/activitystreams#object";
export const AS_SUMMARY = "https://www.w3.org/ns/activitystreams#summary";

export const GC_CONSENT = "https://w3id.org/GConsent#Consent";
export const GC_FOR_PERSONAL_DATA = "https://w3id.org/GConsent#forPersonalData";
export const GC_FOR_PURPOSE = "https://w3id.org/GConsent#forPurpose";
export const GC_HAS_EXPIRY = "https://w3id.org/GConsent#hasExpiry";
export const GC_HAS_STATUS = "https://w3id.org/GConsent#hasStatus";
export const GC_IS_PROVIDED_TO = "https://w3id.org/GConsent#isProvidedTo";
export const GC_CONSENT_STATUS_DENIED =
  "https://w3id.org/GConsent#ConsentStatusDenied";
export const GC_CONSENT_STATUS_EXPLICITLY_GIVEN =
  "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven";
export const GC_CONSENT_STATUS_REQUESTED =
  "https://w3id.org/GConsent#ConsentStatusRequested";

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
// This static context is used from the 2.1 version, instead of having a context
// specific to the deployment.
export const DEFAULT_ESS_CONTEXT =
  "https://schema.inrupt.com/credentials/v1.jsonld" as const;

// According to the [ESS documentation](https://docs.inrupt.com/ess/latest/services/service-vc/#ess-vc-service-endpoints),
// the JSON-LD context for ESS-issued VCs will match the following template.
const instanciateContextVcEssTemplate = (essVcDomain: string): string =>
  `https://${essVcDomain}/credentials/v1`;

// A default context value is provided for mocking purpose accross the codebase.
export const ACCESS_GRANT_CONTEXT_DEFAULT = [
  CONTEXT_VC_W3C,
  DEFAULT_ESS_CONTEXT,
  instanciateContextVcEssTemplate("vc.inrupt.com"),
] as const;

// When issuing a VC using a given service,"https://schema.inrupt.com/credentials/v1.jsonld" be sure to set the context using the following.
export const instanciateEssAccessGrantContext = (
  essVcDomain: string
): typeof ACCESS_GRANT_CONTEXT_DEFAULT =>
  [
    CONTEXT_VC_W3C,
    DEFAULT_ESS_CONTEXT,
    instanciateContextVcEssTemplate(essVcDomain),
  ] as const;



export const WELL_KNOWN_SOLID = ".well-known/solid";

export const INRUPT_CONSENT_SERVICE_LEGACY =
  "http://inrupt.com/ns/ess#consentIssuer";

export const SOLID_CONSENT_SERVICE =
  "http://www.w3.org/ns/solid/terms#accessIssuer";

export const CREDENTIAL_TYPE_ACCESS_REQUEST = "SolidAccessRequest";
export const CREDENTIAL_TYPE_ACCESS_GRANT = "SolidAccessGrant";
export const CREDENTIAL_TYPE_ACCESS_DENIAL = "SolidAccessDenial";
export const CREDENTIAL_TYPE_LEGACY_CONSENT_REQUEST = "SolidConsentRequest";
export const CREDENTIAL_TYPE_BASE = "VerifiableCredential";

export const ACCESS_CREDENTIAL_TYPE = new Set([
  CREDENTIAL_TYPE_ACCESS_REQUEST,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_DENIAL,
  CREDENTIAL_TYPE_LEGACY_CONSENT_REQUEST,
]);

export const ACCESS_GRANT_STATUS = Object.freeze(
  new Set([
    GC_CONSENT_STATUS_DENIED,
    GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
    GC_CONSENT_STATUS_DENIED_ABBREV,
    GC_CONSENT_STATUS_EXPLICITLY_GIVEN_ABBREV,
  ])
);

export const ACCESS_REQUEST_STATUS = Object.freeze(
  new Set([GC_CONSENT_STATUS_REQUESTED, GC_CONSENT_STATUS_REQUESTED_ABBREV])
);

export const ACCESS_STATUS = Object.freeze(
  new Set([...ACCESS_GRANT_STATUS, ...ACCESS_REQUEST_STATUS])
);
