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
import { DatasetWithId } from "@inrupt/solid-client-vc";

export type CredentialFilter = {
  type?: "SolidAccessRequest" | "SolidAccessGrant" | "SolidAccessDenial";
  status?: "Pending" | "Denied" | "Granted" | "Canceled" | "Expired" | "Active" | "Revoked";
  fromAgent?: string;
  toAgent?: string;
  resource?: string;
  purpose?: string;
  issuedWithin?: "P1D" | "P7D" | "P1M" | "P3M";
  revokedWithin?: "P1D" | "P7D" | "P1M" | "P3M";
  pageSize?: number;
  page?: string;
};

const FILTER_ELEMENTS: (keyof CredentialFilter)[] = [
  "fromAgent","issuedWithin","page","pageSize","purpose","resource","revokedWithin","status","toAgent","type"
] as const;

// The following ensures that, when we add a value to the FILTER_ELEMENTS array, TS complains
// if there are missing cases when handling the value.
type SupportedFilterElements =
  typeof FILTER_ELEMENTS extends Array<infer E> ? E : never;

// The type assertion is okay in the context of the type guard.
const isSupportedFilterElement = (x: unknown): x is SupportedFilterElements => FILTER_ELEMENTS.includes(x as keyof CredentialFilter);

const PAGING_RELS = [
  "first", "last", "prev", "next"
] as const;

type SupportedPagingRels =
  typeof PAGING_RELS extends Array<infer E> ? E : never;

// The type assertion is okay in the context of the type guard.
const isSupportedPagingRel = (x: unknown): x is SupportedPagingRels => PAGING_RELS.includes(x as SupportedPagingRels);

export type CredentialResult = {
  items: DatasetWithId[];
  first?: CredentialFilter;
  prev?: CredentialFilter;
  next?: CredentialFilter;
  last?: CredentialFilter;
};

export async function query(
  queryEndpoint: URL,
  filter: CredentialFilter,
  options: {
    fetch?: typeof fetch;
  },
): Promise<CredentialResult> {
  const queryUrl = addQueryParams(filter, queryEndpoint);
  const response = await (options.fetch ?? fetch)(queryUrl);
  if (!response.ok) {
    throw handleErrorResponse(
      response,
      await response.text(),
      `The query endpoint [${queryUrl}] returned an error`,
    );
  }
  return toCredentialResult(response);
}

function addQueryParams(filter: CredentialFilter, url: URL): URL {
  const result = new URL(url);
  Object.entries(filter).forEach(([key, value]) => {
    result.searchParams.append(key, value.toString());
  })
  return result;
}

function toCredentialFilter(url: URL): CredentialFilter {
  const filter: CredentialFilter = {};
  url.searchParams.forEach((value, key) => {
    if (isSupportedFilterElement(key)) {
      Object.assign(filter, { key: value });
    }
  });
  return filter;
}

function toCredentialResult(response: Response): CredentialResult {
  const result: CredentialResult = {items: []};
  const linkHeader = response.headers.get("Link");
  if (linkHeader !== null) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    PAGING_RELS.forEach((rel) => {
      const link = parsedLinks.get("rel", rel);
      if (link.length > 1) {
        throw Error(`Unexpected response, found more than one ${rel} Link headers.`)
      }
      result[rel] = toCredentialFilter(new URL(link[0].uri));
    });
  }
  // TODO parse the body to get the results
  return result;
}
