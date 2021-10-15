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

import type { access, UrlString, WebId } from "@inrupt/solid-client";
import type {
  GC_CONSENT_STATUS_REQUESTED,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
} from "../constants";
import type { ConsentStatus } from "./ConsentStatus";

export type BaseRequestParameters = {
  access: Partial<access.Access>;
  requestor: UrlString;
  requestorInboxUrl: UrlString;
  resources: Array<UrlString>;
  status: ConsentStatus;
};

export type BaseConsentParameters = {
  purpose: Array<UrlString>;
  issuanceDate?: Date;
  expirationDate?: Date;
};

export type AccessRequestParameters = BaseRequestParameters & {
  status: typeof GC_CONSENT_STATUS_REQUESTED;
};

export type ConsentRequestParameters = AccessRequestParameters &
  BaseConsentParameters;

export type AccessGrantParameters = BaseRequestParameters & {
  resourceOwner: WebId;
  status: typeof GC_CONSENT_STATUS_EXPLICITLY_GIVEN;
};

export type ConsentGrantParameters = AccessGrantParameters &
  BaseConsentParameters;
