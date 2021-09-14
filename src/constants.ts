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
export const AS_ANNOUNCE = "https://www.w3.org/ns/activitystreams#Announce";
export const AS_SUMMARY = "https://www.w3.org/ns/activitystreams#summary";
export const AS_ACTOR = "https://www.w3.org/ns/activitystreams#actor";
export const AS_OBJECT = "https://www.w3.org/ns/activitystreams#object";

export const GC_CONSENT = "https://w3id.org/GConsent#Consent";
export const GC_HAS_STATUS = "https://w3id.org/GConsent#hasStatus";
export const GC_STATUS_REQUESTED =
  "https://w3id.org/GConsent#ConsentStatusRequested";
export const GC_FOR_PERSONAL_DATA = "https://w3id.org/GConsent#forPersonalData";
export const GC_FOR_PURPOSE = "https://w3id.org/GConsent#forPurpose";
export const GC_HAS_EXPIRY = "https://w3id.org/GConsent#hasExpiry";
export const GC_IS_PROVIDED_TO = "https://w3id.org/GConsent#isProvidedTo";

export const SOLID_VC_ISSUER = "http://www.w3.org/ns/solid/terms#vcIssuer";

export const CONTEXT_CONSENT = [
  "https://www.w3.org/2018/credentials/v1",
  "https://consent.pod.inrupt.com/credentials/v1",
];

export const WELL_KNOWN_SOLID = ".well-known/solid";

export const INRUPT_CONSENT_SERVICE = "http://inrupt.com/ns/ess#consentIssuer";

export const CREDENTIAL_TYPE = "SolidConsentRequest";

export const CONSENT_STATUS_REQUESTED = "ConsentStatusRequested";

export const CONSENT_STATUS_GIVEN = "ConsentStatusExplicitlyGiven";

export type CONSENT_STATUS =
  | typeof CONSENT_STATUS_REQUESTED
  | typeof CONSENT_STATUS_GIVEN;
