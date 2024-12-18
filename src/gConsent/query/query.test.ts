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

import { jest, it, describe, expect } from "@jest/globals";
import { detail } from "rdf-namespaces/dist/fhir";
import type { CredentialFilter } from "./query";
import { DURATION, query } from "./query";
import { mockAccessGrantVc } from "../util/access.mock";

describe("query", () => {
  it("throws on server errors", async () => {
    await expect(() =>
      query(
        {},
        {
          queryEndpoint: new URL("https://vc.example.org/query"),
          fetch: jest.fn<typeof fetch>().mockResolvedValue(
            new Response(
              JSON.stringify({
                title: "Some title",
                detail: "Some details",
              }),
              {
                status: 400,
              },
            ),
          ),
        },
      ),
    ).rejects.toThrow();
  });

  it("builds query params out of the provided filter", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
        }),
      ),
    );
    const filter: CredentialFilter = {
      fromAgent: "https://example.org/from-some-agent",
      issuedWithin: "P1D",
      purpose: "https://example.org/some-purpose",
      revokedWithin: "P1D",
      toAgent: "https://example.org/to-some-agent",
      resource: "https://example.org/some-resource",
      type: "SolidAccessGrant",
      status: "Active",
      pageSize: 10,
      page: "some-page",
    };
    await query(filter, {
      queryEndpoint: new URL("https://vc.example.org/query"),
      fetch: mockedFetch,
    });
    const expectedQueryParams = new URLSearchParams({
      ...filter,
      pageSize: `${filter.pageSize}`,
    });
    expect(mockedFetch.mock.calls[0][0].toString()).toBe(
      `https://vc.example.org/query?${expectedQueryParams}`,
    );
  });

  it("ignores unknown filter elements", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
        }),
      ),
    );
    const filter = {
      unknownKey: "some value",
    };
    await query(filter as CredentialFilter, {
      queryEndpoint: new URL("https://vc.example.org/query"),
      fetch: mockedFetch,
    });
    expect(mockedFetch.mock.calls[0][0].toString()).toBe(
      `https://vc.example.org/query`,
    );
  });

  it("parses the server's response Link headers", async () => {
    const firstQueryParams = {
      type: "SolidAccessGrant",
      page: "323904ad",
      status: "Active",
    };
    const linkFirst = `<https://vc.example.org/query?${new URLSearchParams(firstQueryParams)}>; rel="first"`;
    const nextQueryParams = {
      type: "SolidAccessGrant",
      page: "6af7d740",
      status: "Active",
    };
    const linkNext = `<https://vc.example.org/query?${new URLSearchParams(nextQueryParams)}>; rel="next"`;
    const lastQueryParams = {
      type: "SolidAccessGrant",
      page: "35faea55",
      status: "Active",
    };
    const linkLast = `<https://vc.example.org/query?${new URLSearchParams(lastQueryParams)}>; rel="last"`;
    const paginationHeaders = new Headers();
    paginationHeaders.append("Link", linkFirst);
    paginationHeaders.append("Link", linkLast);
    paginationHeaders.append("Link", linkNext);
    const mockedGrant = await mockAccessGrantVc();
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [mockedGrant],
        }),
        {
          headers: paginationHeaders,
        },
      ),
    );
    const result = await query(
      {},
      {
        queryEndpoint: new URL("https://vc.example.org/query"),
        fetch: mockedFetch,
      },
    );
    expect(result.first).toStrictEqual(firstQueryParams);
    expect(result.next).toStrictEqual(nextQueryParams);
    expect(result.last).toStrictEqual(lastQueryParams);
    expect(result.prev).toBeUndefined();
  });

  it("exposes utility constants for duration", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
        }),
      ),
    );
    await query(
      { issuedWithin: DURATION.ONE_DAY, revokedWithin: DURATION.ONE_WEEK },
      {
        queryEndpoint: new URL("https://vc.example.org/query"),
        fetch: mockedFetch,
      },
    );
    expect(mockedFetch.mock.calls[0][0].toString()).toBe(
      `https://vc.example.org/query?issuedWithin=P1D&revokedWithin=P7D`,
    );
  });
});
