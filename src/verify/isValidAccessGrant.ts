/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import type { UrlString } from "@inrupt/solid-client";
import {
  isVerifiableCredential,
  VerifiableCredential,
  getVerifiableCredentialApiConfiguration,
} from "@inrupt/solid-client-vc";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getSessionFetch } from "../util/getSessionFetch";

/**
 * Makes a request to the access server to verify the validity of a given Verifiable Credential.
 *
 * @param vc Either a VC, or a URL to a VC, to be verified.
 * @param options Optional properties to customise the request behaviour.
 * @returns An object containing checks, warnings, and errors.
 * @since 0.4.0
 */
// TODO: Push verification further as this just checks it's a valid VC should we not type check the consent grant?
async function isValidAccessGrant(
  vc: VerifiableCredential | URL | UrlString,
  options: Exclude<AccessBaseOptions, "accessEndpoint" | "consentEndpoint"> & {
    verificationEndpoint?: UrlString;
  } = {}
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = await getSessionFetch(options);

  let vcObject;
  // This test passes for both URL and UrlString
  if (vc.toString().startsWith("http")) {
    // vc is either an IRI-shaped string or a URL object. In both
    // cases, vc.toString() is an IRI.
    const vcResponse = await fetcher(vc.toString());
    vcObject = await vcResponse.json();
  } else {
    vcObject = vc;
  }
  if (!isVerifiableCredential(vcObject)) {
    throw new Error(
      `The request to [${vc}] returned an unexpected response: ${JSON.stringify(
        vcObject,
        null,
        "  "
      )}`
    );
  }

  // Discover the access endpoint from the resource part of the Access Grant.
  const verifierEndpoint =
    options.verificationEndpoint ??
    (await getVerifiableCredentialApiConfiguration(vcObject.issuer))
      .verifierService;

  if (verifierEndpoint === undefined) {
    throw new Error(
      `The VC service provider ${vcObject.issuer} does not advertize for a verifier service in its .well-known/vc-configuration document`
    );
  }

  const response = await fetcher(verifierEndpoint, {
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

export { isValidAccessGrant };
export default isValidAccessGrant;
export type { UrlString, VerifiableCredential };

/**
 * @hidden Deprecated alias of [[isValidAccessGrant]]
 * @since 0.0.1
 * @deprecated
 */
const isValidConsentGrant = isValidAccessGrant;
export { isValidConsentGrant };
