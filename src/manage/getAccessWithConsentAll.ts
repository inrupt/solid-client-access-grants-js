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
import {
  getVerifiableCredentialAllFromShape,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { GC_CONSENT_STATUS_EXPLICITLY_GIVEN } from "../constants";
import { getConsentApiEndpoint } from "../discover/getConsentApiEndpoint";
import { BaseConsentRequestBody } from "../type/AccessVerifiableCredential";
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import type { RecursivePartial } from "../type/RecursivePartial";
import type { RequestAccessWithConsentParameters } from "../type/RequestAccessWithConsentParameters";
import { accessToResourceAccessModeArray } from "../util/accessToResourceAccessModeArray";
import { getSessionFetch } from "../util/getSessionFetch";

/**
 * Retrieve consent grants issued over a resource.
 * Can be filtered by requestor, access and purpose.
 *
 * @param resource The URL of a resource to which consent grants might have been issued.
 * @param grantShape The properties of grants to filter results.
 * @param options Optional properties to customise the request behaviour.
 * @returns A void promise.
 * @since 0.0.1
 */
async function getAccessWithConsentAll(
  resource: URL | UrlString,
  params: Partial<
    Pick<RequestAccessWithConsentParameters, "requestor" | "access" | "purpose">
  > = {},
  options: ConsentApiBaseOptions = {}
): Promise<Array<VerifiableCredential>> {
  const sessionFetch = await getSessionFetch(options);

  // TODO: Fix consent API endpoint retrieval (should include all the different API endpoints)
  const holderEndpoint = new URL(
    "derive",
    await getConsentApiEndpoint(resource, options)
  );

  const vcShape: RecursivePartial<
    BaseConsentRequestBody & VerifiableCredential
  > = {
    credentialSubject: {
      id: params.requestor,
      hasConsent: {
        mode: accessToResourceAccessModeArray(params.access ?? {}),
        hasStatus: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
        forPersonalData: [resource instanceof URL ? resource.href : resource],
        forPurpose: params.purpose,
      },
    },
  };

  // TODO: Fix up the type of accepted arguments (this function should allow deep partial)
  return getVerifiableCredentialAllFromShape(
    holderEndpoint.href,
    vcShape as Partial<VerifiableCredential>,
    {
      fetch: sessionFetch,
    }
  );
}

export { getAccessWithConsentAll };
export default getAccessWithConsentAll;
export type {
  ConsentApiBaseOptions,
  RequestAccessWithConsentParameters,
  UrlString,
  VerifiableCredential,
};
