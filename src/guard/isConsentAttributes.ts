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

import { UrlString } from "@inrupt/solid-client";
import { CONSENT_STATUS, RESOURCE_ACCESS_MODE } from "../constants";
import { ConsentAttributes } from "../type/AccessVerifiableCredential";
import { ResourceAccessMode } from "../type/ResourceAccessMode";
import { isUnknownObject } from "./isUnknownObject";
import { ConsentStatus } from "../type/ConsentStatus";

function isResourceAccessModeArray(x: unknown): x is Array<ResourceAccessMode> {
  return (
    Array.isArray(x) &&
    x
      .map((y) => RESOURCE_ACCESS_MODE.has(y))
      .reduce((previous, current) => previous && current)
  );
}

function isConsentStatus(x: unknown): x is ConsentStatus {
  return typeof x === "string" && (CONSENT_STATUS as Set<string>).has(x);
}

// TODO: Make strongly typed URL strings? as in check they parse as URL?
function isUrlStringArray(x: unknown): x is Array<UrlString> {
  return (
    Array.isArray(x) &&
    x
      .map((y) => typeof y === "string")
      .reduce((previous, current) => previous && current)
  );
}

export function isConsentAttributes(x: unknown): x is ConsentAttributes {
  return (
    isUnknownObject(x) &&
    isResourceAccessModeArray(x.mode) &&
    isConsentStatus(x.hasStatus) &&
    isUrlStringArray(x.forPersonalData)
  );
}
