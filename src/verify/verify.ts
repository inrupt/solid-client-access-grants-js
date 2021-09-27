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
import {
  isVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { getConsentEndpointForResource } from "../internal/consent.internal";
import { getDefaultSessionFetch } from "../internal/getDefaultSessionFetch";

/**
 * Makes a request to the consent server to verify the validity of a given VC.
 *
 * @param vc Either a VC, or a URL to a VC, to be verified.
 * @param options Optional properties to customise the request behaviour.
 * @returns An object containing checks, warnings, and errors.
 */
// eslint-disable-next-line import/prefer-default-export
export async function isValidConsentGrant(
  vc: VerifiableCredential | UrlString,
  options: ConsentApiBaseOptions = {}
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());

  let vcObject = vc;
  if (typeof vc === "string") {
    const vcResponse = await fetcher(vc);
    vcObject = await vcResponse.json();
    if (!isVerifiableCredential(vcObject)) {
      throw new Error(
        `The request to [${vc}] returned an unexpected response: ${JSON.stringify(
          vcObject,
          null,
          "  "
        )}`
      );
    }
  }
  const credentialSubjectId = (vcObject as VerifiableCredential)
    .credentialSubject.id;

  const consentEndpoint =
    options.consentEndpoint ??
    (await getConsentEndpointForResource(credentialSubjectId, fetcher));
  const consentVerifyEndpoint = `${consentEndpoint}/verify`;

  const response = await fetcher(consentVerifyEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      verifiableCredential: vcObject,
    }),
  });

  return response.json();
}
