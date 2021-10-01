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
  CREDENTIAL_TYPE,
} from "../constants";
import type { ResourceAccessMode } from "./ResourceAccessMode";
import type { ConsentStatus } from "./ConsentStatus";

export type BaseAccessBody = {
  "@context": typeof CONSENT_CONTEXT;
  type: [typeof CREDENTIAL_TYPE];
  credentialSubject: {
    id: UrlString;
    hasConsent: {
      mode: ResourceAccessMode[];
      hasStatus: ConsentStatus;
      forPersonalData: UrlString[];
    };
    inbox: UrlString;
  };
  issuanceDate?: string;
};

// TODO: Check why the access credentials would not have optional expiration dates
export type BaseConsentBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      forPurpose: UrlString[];
    };
  };
  expirationDate?: string;
};

// TODO: Check if AccessRequestBody always has an issuance date (as per guard)
export type AccessRequestBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: typeof GC_CONSENT_STATUS_REQUESTED;
    };
  };
};

export type ConsentRequestBody = AccessRequestBody & BaseConsentBody;

export type AccessDeniedBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: typeof GC_CONSENT_STATUS_DENIED;
    };
  };
};

export type ConsentDeniedBody = AccessRequestBody & BaseConsentBody;

export type AccessGrantBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: typeof GC_CONSENT_STATUS_EXPLICITLY_GIVEN;
      isProvidedTo: UrlString;
    };
  };
};

export type ConsentGrantBody = AccessGrantBody & BaseConsentBody;

export type AccessVerifiableCredentialBody =
  | AccessRequestBody
  | ConsentRequestBody
  | AccessDeniedBody
  | ConsentDeniedBody
  | AccessGrantBody
  | ConsentGrantBody;
