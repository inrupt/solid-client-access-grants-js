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

export const AS_ACTOR = "https://www.w3.org/ns/activitystreams#actor";
export const AS_ANNOUNCE = "https://www.w3.org/ns/activitystreams#Announce";
export const AS_OBJECT = "https://www.w3.org/ns/activitystreams#object";
export const AS_SUMMARY = "https://www.w3.org/ns/activitystreams#summary";

// TODO: Check that these are actually the modes you can request.
//       The Server API doc does refer to `acl:` as a prefix,
//       although that is not listed in the example context.
export const ACL_RESOURCE_ACCESS_MODE_APPEND =
  "http://www.w3.org/ns/auth/acl#Append";
export const ACL_RESOURCE_ACCESS_MODE_CONTROL =
  "http://www.w3.org/ns/auth/acl#Control";
export const ACL_RESOURCE_ACCESS_MODE_READ =
  "http://www.w3.org/ns/auth/acl#Read";
export const ACL_RESOURCE_ACCESS_MODE_WRITE =
  "http://www.w3.org/ns/auth/acl#Write";

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

export const SOLID_VC_ISSUER = "http://www.w3.org/ns/solid/terms#vcIssuer";

// TODO: Add dependency on generated vocabulary.
export const PIM_STORAGE = "http://www.w3.org/ns/pim/space#storage";

// TODO: This is a temporary filler term, until we publish a definitive term for this.
export const PREFERRED_CONSENT_MANAGEMENT_UI =
  "http://inrupt.com/ns/ess#ConsentManagementUI";

export const CONSENT_CONTEXT = [
  "https://www.w3.org/2018/credentials/v1",
  "https://consent.pod.inrupt.com/credentials/v1",
] as const;

export const WELL_KNOWN_SOLID = ".well-known/solid";

export const INRUPT_CONSENT_SERVICE_LEGACY =
  "http://inrupt.com/ns/ess#consentIssuer";

export const SOLID_CONSENT_SERVICE = "http://www.w3.org/ns/solid/terms#consent";

export const CREDENTIAL_TYPE = "SolidAccessRequest";

export const CONSENT_STATUS = new Set([
  GC_CONSENT_STATUS_DENIED,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
  GC_CONSENT_STATUS_REQUESTED,
] as const);

export const RESOURCE_ACCESS_MODE = new Set([
  ACL_RESOURCE_ACCESS_MODE_APPEND,
  ACL_RESOURCE_ACCESS_MODE_CONTROL,
  ACL_RESOURCE_ACCESS_MODE_READ,
  ACL_RESOURCE_ACCESS_MODE_WRITE,
] as const);
