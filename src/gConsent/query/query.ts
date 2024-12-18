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

import LinkHeader from "http-link-header";

import { handleErrorResponse } from "@inrupt/solid-client-errors";
import type { DatasetWithId } from "@inrupt/solid-client-vc";
import { verifiableCredentialToDataset } from "@inrupt/solid-client-vc";
import type { UrlString } from "@inrupt/solid-client";
import { AccessGrantError } from "../../common/errors/AccessGrantError";

/**
 * Supported Access Credential statuses
 */
export type CredentialStatus =
  | "Pending"
  | "Denied"
  | "Granted"
  | "Canceled"
  | "Expired"
  | "Active"
  | "Revoked";

/**
 * Supported Access Credential types
 */
export type CredentialType =
  | "SolidAccessRequest"
  | "SolidAccessGrant"
  | "SolidAccessDenial";

/**
 * Supported durations for Access Credential filtering.
 */
export const DURATION = {
  ONE_DAY: "P1D",
  ONE_WEEK: "P7D",
  ONE_MONTH: "P1M",
  THREE_MONTHS: "P3M",
} as const;

export type CredentialFilter = {
  /**
   * The Access Credential type (e.g. Access Request, Access Grant...).
   */
  type?: CredentialType;
  /**
   * The Access Credential status (e.g. Active, Revoked...).
   */
  status?: CredentialStatus;
  /**
   * WebID of the Agent who issued the Access Credential.
   */
  fromAgent?: UrlString;
  /**
   * WebID of the Agent who is the Access Credential recipient.
   */
  toAgent?: UrlString;
  /**
   * URL of the resource featured in the Access Credential.
   */
  resource?: UrlString;
  /**
   * URL of the Access Credential purpose.
   */
  purpose?: UrlString;
  /**
   * Period (expressed using ISO 8601) during which the Credential was issued.
   */
  issuedWithin?: "P1D" | "P7D" | "P1M" | "P3M";
  /**
   * Period (expressed using ISO 8601) during which the Credential was revoked.
   */
  revokedWithin?: "P1D" | "P7D" | "P1M" | "P3M";
  /**
   * Number of items per page.
   */
  pageSize?: number;
  /**
   * Target page (for result pagination).
   */
  page?: string;
};

const FILTER_ELEMENTS: Array<keyof CredentialFilter> = [
  "fromAgent",
  "issuedWithin",
  "page",
  "pageSize",
  "purpose",
  "resource",
  "revokedWithin",
  "status",
  "toAgent",
  "type",
] as const;

// The following ensures that, when we add a value to the FILTER_ELEMENTS array, TS complains
// if there are missing cases when handling the value.
type SupportedFilterElements =
  typeof FILTER_ELEMENTS extends Array<infer E> ? E : never;

// The type assertion is okay in the context of the type guard.
const isSupportedFilterElement = (x: unknown): x is SupportedFilterElements =>
  FILTER_ELEMENTS.includes(x as keyof CredentialFilter);

const PAGING_RELS = ["first", "last", "prev", "next"] as const;

export type CredentialResult = {
  /**
   * Page of Access Credentials matching the query.
   */
  items: DatasetWithId[];
  /**
   * First page of query results.
   */
  first?: CredentialFilter;
  /**
   * Previous page of query results.
   */
  prev?: CredentialFilter;
  /**
   * Next page of query results.
   */
  next?: CredentialFilter;
  /**
   * Last page of query results.
   */
  last?: CredentialFilter;
};

function toCredentialFilter(url: URL): CredentialFilter {
  const filter: CredentialFilter = {};
  url.searchParams.forEach((value, key) => {
    if (isSupportedFilterElement(key)) {
      Object.assign(filter, { [`${key}`]: value });
    }
  });
  return filter;
}

async function parseQueryResponse(
  responseJson: unknown,
): Promise<DatasetWithId[]> {
  // The type assertion here is immediately checked.
  const candidate = responseJson as { items: unknown };
  if (candidate.items === undefined || !Array.isArray(candidate.items)) {
    throw new AccessGrantError(
      `Unexpected query response, no 'items' array found in ${JSON.stringify(responseJson)}`,
    );
  }
  return Promise.all(
    candidate.items.map((vc) => {
      return verifiableCredentialToDataset(vc);
    }),
  ).catch((error) => {
    throw new AccessGrantError(
      `Unexpected query response, parsing the content of the 'items' array failed.`,
      {
        cause: error,
      },
    );
  });
}

async function toCredentialResult(
  response: Response,
): Promise<CredentialResult> {
  const result: CredentialResult = { items: [] };
  const linkHeader = response.headers.get("Link");
  if (linkHeader !== null) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    PAGING_RELS.forEach((rel) => {
      const link = parsedLinks.get("rel", rel);
      if (link.length > 1) {
        throw Error(
          `Unexpected response, found more than one [${rel}] Link headers.`,
        );
      }
      if (link.length === 0) {
        return;
      }
      result[rel] = toCredentialFilter(new URL(link[0].uri));
    });
  }
  result.items = await parseQueryResponse(await response.json());
  return result;
}

function toQueryUrl(endpoint: URL, filter: CredentialFilter): URL {
  const result = new URL(endpoint);
  Object.entries(filter).forEach(([key, value]) => {
    if (isSupportedFilterElement(key)) {
      result.searchParams.append(key, value.toString());
    }
  });
  return result;
}

/**
 * Query for Access Credentials (Access Requests, Access Grants or Access Denials) based on a given filter.
 *
 * @param filter The query filter
 * @param options Query options
 * @returns a paginated set of Access Credentials matching the given filter
 * @since unreleased
 *
 * @example
 * ```
 *  // Get the first results page.
 *  const activeGrantsWithinDay = await query(
 *       {
 *         type: "SolidAccessGrant",
 *         status: "Active",
 *         issuedWithin: DURATION.ONE_DAY,
 *       },
 *       {
 *         fetch: session.fetch,
 *         queryEndpoint: config.queryEndpoint,
 *       },
 *     );
 * // Get the next results page.
 * const activeGrantsWithinDay2 = await query(
 *       activeGrantsWithinDay.next,
 *       {
 *         fetch: session.fetch,
 *         queryEndpoint: config.queryEndpoint,
 *       },
 *     );
 * ```
 */
export async function query(
  filter: CredentialFilter,
  options: {
    fetch: typeof fetch;
    queryEndpoint: URL;
  },
): Promise<CredentialResult> {
  const queryUrl = toQueryUrl(options.queryEndpoint, filter);
  const response = await options.fetch(queryUrl);
  if (!response.ok) {
    throw handleErrorResponse(
      response,
      await response.text(),
      `The query endpoint [${queryUrl}] returned an error`,
    );
  }
  return toCredentialResult(response);
}

export async function* paginateQuery(
  filter: CredentialFilter,
  options: {
    fetch: typeof fetch;
    queryEndpoint: URL;
  },
) {
  let page = await query(filter, options);
  while (page.next !== undefined) {
    yield page;
    // This is a generator, so we don't want to go through
    // all the pages at once with a Promise.all approach.
    // eslint-disable-next-line no-await-in-loop
    page = await query(page.next, options);
  }
  // Return the last page.
  yield page;
}
