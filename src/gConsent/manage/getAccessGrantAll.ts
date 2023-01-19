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
import {
  getVerifiableCredentialAllFromShape,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_BASE,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
  GC_CONSENT_STATUS_EXPLICITLY_GIVEN_ABBREV,
  instanciateEssAccessGrantContext,
} from "../constants";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type { RecursivePartial } from "../../type/RecursivePartial";
import type { IssueAccessRequestParameters } from "../type/IssueAccessRequestParameters";
import { accessToResourceAccessModeArray } from "../util/accessToResourceAccessModeArray";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type { BaseGrantBody } from "../type/AccessVerifiableCredential";
import { isAccessGrant } from "../guard/isAccessGrant";
import { isBaseAccessGrantVerifiableCredential } from "../guard/isBaseAccessGrantVerifiableCredential";
import { AccessGrant } from "../type/AccessGrant";
import { getInherit, getResources } from "../../common/getters";
import { normalizeAccessGrant } from "./approveAccessRequest";

// Iteratively build the list of ancestor containers from the breakdown of the
// resource path: for resource https://pod.example/foo/bar/baz, we'll want the result
// to be ["https://pod.example/", "https://pod.example/foo/", "https://pod.example/foo/bar/", https://pod.example/foo/bar/baz].
const getAncestorUrls = (resourceUrl: URL) => {
  // Splitting on / will result in the first element being empty (since the path
  // starts with /) and in the last element being the target resource name.
  const ancestorNames = resourceUrl.pathname.split("/").slice(1, -1);
  return ancestorNames.reduce(
    (ancestors, curName) => {
      // Add each intermediary container to ancestorPaths
      const currentPath = `${ancestors[0]}${curName}/`;
      return [new URL(currentPath, resourceUrl.origin), ...ancestors];
    },
    // The storage origin may be the storage root (it happens not to be the case in ESS).
    // The target resource should also be included.
    [new URL("/", resourceUrl.origin), resourceUrl]
  );
};

/**
 * Retrieve Access Grants issued over a resource. The Access Grants may be filtered
 * by requestor, access modes and purpose. In order to discover all applicable Access
 * Grants for the target resource, including recursive Access Grants issued over
 * an ancestor container, the resources hierarchy is walked up to the storage root.
 *
 * @param resource The URL of a resource to which access grants might have been issued.
 * @param grantShape The properties of grants to filter results.
 * @param options Optional parameter:
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * - `options.includeExpiredGrants`: include expired grants in the result set.
 * @returns A void promise.
 * @since 0.4.0
 */
async function getAccessGrantAll(
  resource: URL | UrlString,
  params: Partial<
    Pick<IssueAccessRequestParameters, "access" | "purpose"> & {
      requestor: string;
    }
  > = {},
  options: AccessBaseOptions & { includeExpired?: boolean } = {}
): Promise<Array<VerifiableCredential>> {
  const sessionFetch = await getSessionFetch(options);
  const vcServiceBase = await getAccessApiEndpoint(resource, options);
  // TODO: Fix access API endpoint retrieval (should include all the different API endpoints)
  const holderEndpoint = new URL("derive", vcServiceBase);

  const ancestorUrls = getAncestorUrls(
    typeof resource === "string" ? new URL(resource) : resource
  );

  const specifiedModes = accessToResourceAccessModeArray(params.access ?? {});

  const vcShapes: RecursivePartial<BaseGrantBody & VerifiableCredential>[] =
    ancestorUrls.map((url) => ({
      "@context": instanciateEssAccessGrantContext(vcServiceBase),
      type: [CREDENTIAL_TYPE_ACCESS_GRANT, CREDENTIAL_TYPE_BASE],
      credentialSubject: {
        providedConsent: {
          hasStatus: GC_CONSENT_STATUS_EXPLICITLY_GIVEN,
          forPersonalData: [url.href],
          forPurpose: params.purpose,
          isProvidedTo: params.requestor,
          mode: specifiedModes.length > 0 ? specifiedModes : undefined,
        },
      },
    }));

  // TODO: Fix up the type of accepted arguments (this function should allow deep partial)
  const result = (
    await Promise.all(
      vcShapes.map((vcShape) =>
        getVerifiableCredentialAllFromShape(
          holderEndpoint.href,
          vcShape as Partial<VerifiableCredential>,
          {
            fetch: sessionFetch,
            includeExpiredVc: options.includeExpired,
          }
        )
      )
    )
  )
    // getVerifiableCredentialAllFromShape returns a list, so the previous map
    // should be flattened to have all the candidate grants in a non-nested list.
    .flat()
    .map(normalizeAccessGrant);

  return (
    result
      .filter(
        (vc) => isBaseAccessGrantVerifiableCredential(vc) && isAccessGrant(vc)
      )
      // FIXME why isn't the previous filter enough?
      .map((vc) => vc as AccessGrant)
      .filter(
        (grant) =>
          // Explicitly non-recursive grants are filtered out, except if they apply
          // directly to the target resource.
          getInherit(grant) !== false ||
          getResources(grant).includes(resource.toString())
      )
  );
}

export { getAccessGrantAll };
export default getAccessGrantAll;
export type { IssueAccessRequestParameters, UrlString, VerifiableCredential };
