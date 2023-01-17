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

import { UrlString } from "@inrupt/solid-client";
import { ACCESS_STATUS } from "../constants";
import { GConsentRequestAttributes } from "../type/AccessVerifiableCredential";
import {
  ResourceAccessMode,
  RESOURCE_ACCESS_MODE,
} from "../../type/ResourceAccessMode";
import { isUnknownObject } from "./isUnknownObject";
import { GConsentStatus } from "../type/GConsentStatus";

function isResourceAccessModeArray(x: unknown): x is Array<ResourceAccessMode> {
  return Array.isArray(x) && x.every((y) => RESOURCE_ACCESS_MODE.has(y));
}

function isGConsentStatus(x: unknown): x is GConsentStatus {
  return typeof x === "string" && ACCESS_STATUS.has(x);
}

// TODO: Discuss a strongly typed UrlString guard (as a team).
function isStringArray(x: unknown): x is Array<UrlString> {
  return Array.isArray(x) && x.every((y) => typeof y === "string");
}

export function isGConsentAttributes(
  x: unknown
): x is GConsentRequestAttributes {
  return (
    isUnknownObject(x) &&
    isResourceAccessModeArray(x.mode) &&
    isGConsentStatus(x.hasStatus) &&
    isStringArray(x.forPersonalData)
  );
}
