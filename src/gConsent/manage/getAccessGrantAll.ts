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
  VerifiableCredential,
  DatasetWithId,
} from "@inrupt/solid-client-vc";
import { getVerifiableCredentialAllFromShape } from "@inrupt/solid-client-vc";
import {
  CONTEXT_ESS_DEFAULT,
  CONTEXT_VC_W3C,
  CREDENTIAL_TYPE_ACCESS_DENIAL,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_BASE,
} from "../constants";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type { RecursivePartial } from "../../type/RecursivePartial";
import type { IssueAccessRequestParameters } from "../type/IssueAccessRequestParameters";
import { accessToResourceAccessModeArray } from "../util/accessToResourceAccessModeArray";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type { BaseGrantBody } from "../type/AccessVerifiableCredential";
import { isAccessGrant } from "../guard/isAccessGrant";
import {
  isBaseAccessGrantVerifiableCredential,
  isRdfjsBaseAccessGrantVerifiableCredential,
} from "../guard/isBaseAccessGrantVerifiableCredential";
import { getInherit, getResources } from "../../common/getters";
import { normalizeAccessGrant } from "./approveAccessRequest";
import { gc } from "../../common/constants";

export type AccessParameters = Partial<
  Pick<IssueAccessRequestParameters, "access" | "purpose"> & {
    requestor: string;
    resource: URL | UrlString;
    /**
     * By default only `granted` access grants are returned when the status is undefined.
     * In the next major version of this library the default will be to return `all` access grants when the status is
     * undefined.
     * @since 2.6.0
     */
    status?: "granted" | "denied" | "all";
  }
>;

interface QueryOptions extends AccessBaseOptions {
  includeExpired?: boolean;
}

// Iteratively build the list of ancestor containers from the breakdown of the
// resource path: for resource https://pod.example/foo/bar/baz, we'll want the result
// to be ["https://pod.example/", "https://pod.example/foo/", "https://pod.example/foo/bar/", https://pod.example/foo/bar/baz].
const getAncestorUrls = (resourceUrl: URL) => {
  // Splitting on / will result in the first element being empty (since the path
  // starts with /) and in the last element being the target resource name.
  const ancestorNames = resourceUrl.pathname
    .split("/")
    .slice(1, resourceUrl.pathname.endsWith("/") ? -2 : -1);
  return ancestorNames.reduce(
    (ancestors, curName) => {
      // Add each intermediary container to ancestorPaths
      const currentPath = `${ancestors[0]}${curName}/`;
      return [new URL(currentPath, resourceUrl.origin), ...ancestors];
    },
    // The storage origin may be the storage root (it happens not to be the case in ESS).
    // The target resource should also be included.
    [new URL("/", resourceUrl.origin), resourceUrl],
  );
};

/**
 * Retrieve Access Grants issued over a resource. The Access Grants may be filtered
 * by resource, requestor, access modes and purpose.
 *
 * If a resource filter is specified, the resources hierarchy is walked up to the
 * storage root so that all applicable Access Grants for the target resource are
 * discovered, including recursive Access Grants issued over an ancestor container.
 *
 * @example ```
 * const grantsForResource = await getAccessGrantAll({
 *  resource: "https://example.org/storage/some-resource"
 * }, {
 *  fetch: session.fetch,
 *  accessEndpoint: "https://example.org/grants-holder/"
 * });
 *
 * const grantsForAgentWrite = await getAccessGrantAll({
 *  requestor: "https://id.example.org/some-agent-webid",
 *  modes: ["write"]
 * }, {
 *  fetch: session.fetch,
 *  accessEndpoint: "https://example.org/grants-holder/"
 * });
 * ```
 *
 * @param grantShape The properties of grants to filter results.
 * @param options Optional parameter:
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request,
 *   compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 *   This is typically used for authentication.
 * - `options.includeExpiredGrants`: include expired grants in the result set.
 * - accessEndpoint: A base URL used when determining the location of access API calls.
 *   If not given, it is attempted to be found by determining the server URL from the resource
 *   involved in the request and reading its .well-known/solid file for an Access API entry. If
 *   you are not providing a resource this url must point to the vcProvider endpoint associated
 *   with the environment you are requesting against.
 * @returns A promise resolving to an array of Access Grants matching the request.
 * @since 0.4.0
 */
async function getAccessGrantAll(
  params: AccessParameters,
  options: QueryOptions & {
    returnLegacyJsonld: false;
  },
): Promise<Array<DatasetWithId>>;
/**
 * @deprecated Please set returnLegacyJsonld: false and use RDFJS API
 */
async function getAccessGrantAll(
  params: AccessParameters,
  options?: QueryOptions & {
    returnLegacyJsonld?: true;
  },
): Promise<Array<VerifiableCredential>>;
/**
 * @deprecated Please set returnLegacyJsonld: false and use RDFJS API
 */
async function getAccessGrantAll(
  params: AccessParameters,
  options?: QueryOptions & {
    returnLegacyJsonld?: boolean;
  },
): Promise<Array<DatasetWithId>>;
async function getAccessGrantAll(
  params: AccessParameters,
  options: QueryOptions & {
    returnLegacyJsonld?: boolean;
  } = {},
): Promise<Array<DatasetWithId>> {
  if (!params.resource && !options.accessEndpoint) {
    throw new Error("resource and accessEndpoint cannot both be undefined");
  }
  const sessionFetch = await getSessionFetch(options);
  // TODO: Fix access API endpoint retrieval (should include all the different API endpoints)
  const queryEndpoint = options.accessEndpoint
    ? new URL("derive", options.accessEndpoint)
    : new URL(
        "derive",
        await getAccessApiEndpoint(params.resource as string, options),
      );

  const ancestorUrls = params.resource
    ? getAncestorUrls(
        typeof params.resource === "string"
          ? new URL(params.resource)
          : params.resource,
      )
    : [undefined];

  const specifiedModes = accessToResourceAccessModeArray(params.access ?? {});
  const type = [CREDENTIAL_TYPE_BASE];
  const statusShorthand = params.status ?? "granted";

  if (statusShorthand === "granted") {
    type.push(CREDENTIAL_TYPE_ACCESS_GRANT);
  } else if (statusShorthand === "denied") {
    type.push(CREDENTIAL_TYPE_ACCESS_DENIAL);
  }

  const vcShapes: RecursivePartial<BaseGrantBody & VerifiableCredential>[] =
    ancestorUrls.map((url) => ({
      "@context": [CONTEXT_VC_W3C, CONTEXT_ESS_DEFAULT],
      type,
      credentialSubject: {
        providedConsent: {
          hasStatus: {
            granted: gc.ConsentStatusExplicitlyGiven.value,
            denied: gc.ConsentStatusDenied.value,
            all: undefined,
          }[statusShorthand],
          forPersonalData: url ? [url.href] : undefined,
          forPurpose: params.purpose,
          isProvidedTo: params.requestor,
          mode: specifiedModes.length > 0 ? specifiedModes : undefined,
        },
      },
    }));

  let result: DatasetWithId[];

  if (options.returnLegacyJsonld === false) {
    // TODO: Fix up the type of accepted arguments (this function should allow deep partial)
    result = (
      await Promise.all(
        vcShapes.map((vcShape) =>
          getVerifiableCredentialAllFromShape(
            queryEndpoint.href,
            vcShape as Partial<VerifiableCredential>,
            {
              fetch: sessionFetch,
              includeExpiredVc: options.includeExpired,
              returnLegacyJsonld: false,
            },
          ),
        ),
      )
    )
      // getVerifiableCredentialAllFromShape returns a list, so the previous map
      // should be flattened to have all the candidate grants in a non-nested list.
      .flat()
      .filter((vc) => isRdfjsBaseAccessGrantVerifiableCredential(vc));
  } else {
    result = (
      await Promise.all(
        vcShapes.map((vcShape) =>
          getVerifiableCredentialAllFromShape(
            queryEndpoint.href,
            vcShape as Partial<VerifiableCredential>,
            {
              fetch: sessionFetch,
              includeExpiredVc: options.includeExpired,
              normalize: normalizeAccessGrant,
            },
          ),
        ),
      )
    )
      // getVerifiableCredentialAllFromShape returns a list, so the previous map
      // should be flattened to have all the candidate grants in a non-nested list.
      .flat()
      .filter(
        (vc) => isBaseAccessGrantVerifiableCredential(vc) && isAccessGrant(vc),
      );
  }
  // Explicitly non-recursive grants are filtered out, except if they apply
  // directly to the target resource (in the case a resource is used as a
  // filtering criteria for getAccessGrantAll).
  return result.filter(
    (vc) =>
      getInherit(vc) !== false ||
      params.resource === undefined ||
      getResources(vc).includes(params.resource.toString()),
  );
}

export { getAccessGrantAll };
export default getAccessGrantAll;
export type { IssueAccessRequestParameters, UrlString, VerifiableCredential };
