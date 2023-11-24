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

import type { UrlString } from "@inrupt/solid-client";
import type {
  ACCESS_GRANT_CONTEXT_DEFAULT,
  GC_CONSENT_STATUS_DENIED_ABBREV,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN_ABBREV,
  GC_CONSENT_STATUS_REQUESTED_ABBREV,
} from "../constants";
import type { ResourceAccessMode } from "../../type/ResourceAccessMode";
import type { GConsentStatus } from "./GConsentStatus";
import type { AccessCredentialType } from "./AccessCredentialType";
import type { gc } from "../../common/constants";

export type GConsentAttributes = {
  mode: ResourceAccessMode[];
  hasStatus: GConsentStatus;
  forPersonalData: UrlString[];
  forPurpose?: UrlString[];
  inherit?: boolean;
};

export type GConsentGrantAttributes = GConsentAttributes & {
  isProvidedTo: UrlString;
};

export type GConsentRequestAttributes = GConsentAttributes & {
  isConsentForDataSubject?: UrlString;
};

export type CredentialSubject = {
  id: UrlString;
  inbox: UrlString | undefined;
  hasConsent?: GConsentRequestAttributes;
  providedConsent?: GConsentGrantAttributes;
};

export type RequestCredentialSubject = Required<
  Omit<CredentialSubject, "providedConsent">
>;

export type RequestCredentialSubjectPayload = Omit<
  RequestCredentialSubject,
  "id"
>;

export type GrantCredentialSubject = Required<
  Omit<CredentialSubject, "hasConsent">
>;

export type GrantCredentialSubjectPayload = Omit<GrantCredentialSubject, "id">;

export type BaseAccessVcBody = {
  "@context": typeof ACCESS_GRANT_CONTEXT_DEFAULT;
  type: AccessCredentialType[];
  credentialSubject:
    | RequestCredentialSubject
    | GrantCredentialSubject
    | Omit<RequestCredentialSubject, "id">
    | Omit<GrantCredentialSubject, "id">;
  issuanceDate?: string;
  expirationDate?: string;
};

export type BaseRequestBody = BaseAccessVcBody & {
  credentialSubject: RequestCredentialSubject;
};

export type BaseGrantBody = BaseAccessVcBody & {
  credentialSubject: GrantCredentialSubject;
};

// When sending a VC payload to be issued, the subject id is omitted.
export type BaseRequestPayload = BaseAccessVcBody & {
  credentialSubject: Omit<RequestCredentialSubject, "id">;
};

// When sending a VC payload to be issued, the subject id is omitted.
export type BaseGrantPayload = BaseAccessVcBody & {
  credentialSubject: Omit<GrantCredentialSubject, "id">;
};

// TODO: Check if AccessRequestBody always has an issuance date (as per guard)
export type AccessRequestBody = BaseRequestBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus:
        | typeof gc.ConsentStatusRequested.value
        // FIXME: This is a stopgap solution, but proper JSON-LD parsing should
        // be implemented to fix this long-term.
        | typeof GC_CONSENT_STATUS_REQUESTED_ABBREV;
    };
  };
};

export type AccessDeniedBody = BaseGrantBody & {
  credentialSubject: {
    providedConsent: {
      hasStatus: typeof gc.ConsentStatusDenied.value;
    };
  };
};

export type AccessGrantBody = BaseGrantBody & {
  credentialSubject: {
    providedConsent: {
      hasStatus:
        | typeof gc.ConsentStatusExplicitlyGiven.value
        | typeof gc.ConsentStatusDenied.value
        // FIXME: This is a stopgap solution, but proper JSON-LD parsing should
        // be implemented to fix this long-term.
        | typeof GC_CONSENT_STATUS_EXPLICITLY_GIVEN_ABBREV
        | typeof GC_CONSENT_STATUS_DENIED_ABBREV;
      isProvidedTo: UrlString;
    };
  };
};

export type AccessVerifiableCredentialBody =
  | AccessRequestBody
  | AccessDeniedBody
  | AccessGrantBody;
