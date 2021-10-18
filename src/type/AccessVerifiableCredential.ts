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

import type { UrlString } from "@inrupt/solid-client";
import type {
  CONSENT_CONTEXT,
  GC_CONSENT_STATUS_DENIED,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
  GC_CONSENT_STATUS_REQUESTED,
} from "../constants";
import type { ResourceAccessMode } from "./ResourceAccessMode";
import type { ConsentStatus } from "./ConsentStatus";
import type { AccessCredentialType } from "./AccessCredentialType";

export type ConsentAttributes = {
  mode: ResourceAccessMode[];
  hasStatus: ConsentStatus;
  forPersonalData: UrlString[];
};

export type ConsentGrantAttributes = ConsentAttributes & {
  isProvidedTo: UrlString;
};

export type CredentialSubject = {
  id: UrlString;
  inbox: UrlString;
  hasConsent?: ConsentAttributes;
  providedConsent?: ConsentGrantAttributes;
};

export type RequestCredentialSubject = Required<
  Omit<CredentialSubject, "providedConsent">
>;

export type GrantCredentialSubject = Required<
  Omit<CredentialSubject, "hasConsent">
>;

export type BaseAccessVcBody = {
  "@context": typeof CONSENT_CONTEXT;
  type: AccessCredentialType[];
  credentialSubject: RequestCredentialSubject | GrantCredentialSubject;
  issuanceDate?: string;
};

export type BaseRequestBody = {
  "@context": typeof CONSENT_CONTEXT;
  type: AccessCredentialType[];
  credentialSubject: RequestCredentialSubject;
  issuanceDate?: string;
};

export type BaseGrantBody = {
  "@context": typeof CONSENT_CONTEXT;
  type: AccessCredentialType[];
  credentialSubject: GrantCredentialSubject;
  issuanceDate?: string;
};

// TODO: Check why the access credentials would not have optional expiration dates
export type BaseConsentRequestBody = BaseRequestBody & {
  credentialSubject: {
    hasConsent: {
      forPurpose: UrlString[];
    };
  };
  expirationDate?: string;
};

export type BaseConsentGrantBody = BaseGrantBody & {
  credentialSubject: {
    providedConsent: {
      forPurpose: UrlString[];
    };
  };
  expirationDate?: string;
};

// TODO: Check if AccessRequestBody always has an issuance date (as per guard)
export type AccessRequestBody = BaseRequestBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: typeof GC_CONSENT_STATUS_REQUESTED;
    };
  };
};

export type ConsentRequestBody = AccessRequestBody & BaseConsentRequestBody;

export type AccessDeniedBody = BaseGrantBody & {
  credentialSubject: {
    providedConsent: {
      hasStatus: typeof GC_CONSENT_STATUS_DENIED;
    };
  };
};

export type ConsentDeniedBody = AccessRequestBody & BaseConsentRequestBody;

export type AccessGrantBody = BaseGrantBody & {
  credentialSubject: {
    providedConsent: {
      hasStatus: typeof GC_CONSENT_STATUS_EXPLICITLY_GIVEN;
      isProvidedTo: UrlString;
    };
  };
};

export type ConsentGrantBody = AccessGrantBody & BaseConsentGrantBody;

export type AccessVerifiableCredentialBody =
  | AccessRequestBody
  | ConsentRequestBody
  | AccessDeniedBody
  | ConsentDeniedBody
  | AccessGrantBody
  | ConsentGrantBody;
