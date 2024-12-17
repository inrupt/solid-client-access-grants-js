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

export type CredentialStatus =
  | "Pending"
  | "Denied"
  | "Granted"
  | "Canceled"
  | "Expired"
  | "Active"
  | "Revoked";

export type CredentialType =
  | "SolidAccessRequest"
  | "SolidAccessGrant"
  | "SolidAccessDenial";

export type CredentialFilter = {
  type?: CredentialType;
  status?: CredentialStatus;
  fromAgent?: UrlString;
  toAgent?: UrlString;
  resource?: UrlString;
  purpose?: UrlString;
  issuedWithin?: "P1D" | "P7D" | "P1M" | "P3M";
  revokedWithin?: "P1D" | "P7D" | "P1M" | "P3M";
  pageSize?: number;
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
  items: DatasetWithId[];
  first?: CredentialFilter;
  prev?: CredentialFilter;
  next?: CredentialFilter;
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

function hasItems(x: unknown): x is { items: unknown[] } {
  const candidate = x as { items: unknown };
  return candidate.items !== undefined && Array.isArray(candidate.items);
}

function isObjectWithId(x: unknown): x is { id: string } {
  const candidate = x as { id: string };
  return typeof candidate.id === "string";
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
          `Unexpected response, found more than one ${rel} Link headers.`,
        );
      }
      if (link.length === 0) {
        return;
      }
      result[rel] = toCredentialFilter(new URL(link[0].uri));
    });
  }
  const body = await response.json();
  if (!hasItems(body) || !body.items.every(isObjectWithId)) {
    throw Error(
      `Unexpected response, no items found in ${JSON.stringify(body)}`,
    );
  }
  result.items = await Promise.all(
    body.items.map((vc) => {
      return verifiableCredentialToDataset(vc);
    }),
  );
  return result;
}

function toQueryUrl(endpoint: URL, filter: CredentialFilter): URL {
  const result = new URL(endpoint);
  Object.entries(filter).forEach(([key, value]) => {
    result.searchParams.append(key, value.toString());
  });
  return result;
}

export async function query(
  filter: CredentialFilter,
  options: {
    fetch?: typeof fetch;
    queryEndpoint: URL;
  },
): Promise<CredentialResult> {
  const queryUrl = toQueryUrl(options.queryEndpoint, filter);
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
