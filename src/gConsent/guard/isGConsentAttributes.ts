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
import { DataFactory } from "n3";
// eslint-disable-next-line camelcase
import type { DatasetCore, Quad_Subject } from "@rdfjs/types";
import { ACCESS_STATUS } from "../constants";
import type { GConsentRequestAttributes } from "../type/AccessVerifiableCredential";
import type { ResourceAccessMode } from "../../type/ResourceAccessMode";
import { RESOURCE_ACCESS_MODE } from "../../type/ResourceAccessMode";
import { isUnknownObject } from "./isUnknownObject";
import type { GConsentStatus } from "../type/GConsentStatus";
import { acl, gc } from "../../common/constants";

const { defaultGraph } = DataFactory;

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

/**
 * @deprecated This function checks structural assumptions about the JSON-LD presentation of the VC,
 * which is not recommended. Use the RDFJS API that is now provided instead.
 */
export function isGConsentAttributes(
  x: unknown,
): x is GConsentRequestAttributes {
  return (
    isUnknownObject(x) &&
    isResourceAccessModeArray(x.mode) &&
    isGConsentStatus(x.hasStatus) &&
    isStringArray(x.forPersonalData)
  );
}

export function isRdfjsGConsentAttributes(
  dataset: DatasetCore,
  // eslint-disable-next-line camelcase
  consent: Quad_Subject,
) {
  // isResourceAccessModeArray
  const modeQuads = dataset.match(consent, acl.mode, null, defaultGraph());
  if (modeQuads.size === 0) {
    return false;
  }
  for (const { object: mode } of modeQuads) {
    if (
      ![acl.Append, acl.Read, acl.Write].some((allowedMode) =>
        allowedMode.equals(mode),
      )
    ) {
      return false;
    }
  }

  // isGConsentStatus
  const statuses = [
    ...dataset.match(consent, gc.hasStatus, null, defaultGraph()),
  ];
  if (
    statuses.length !== 1 ||
    ![
      gc.ConsentStatusDenied,
      gc.ConsentStatusExplicitlyGiven,
      gc.ConsentStatusRequested,
    ].some((e) => e.equals(statuses[0].object))
  ) {
    return false;
  }

  const forPersonalData = dataset.match(
    consent,
    gc.forPersonalData,
    null,
    defaultGraph(),
  );

  if (forPersonalData.size === 0) {
    throw new Error("No Personal Data specified for Access Grant");
  }

  for (const { object } of forPersonalData) {
    if (object.termType !== "NamedNode") {
      return false;
    }
  }

  return true;
}
