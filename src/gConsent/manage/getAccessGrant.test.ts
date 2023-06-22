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
import { Response } from "@inrupt/universal-fetch";
import type * as CrossFetch from "@inrupt/universal-fetch";

import { mockAccessApiEndpoint } from "../request/request.mock";
import { mockAccessGrantVc, mockConsentRequestVc } from "../util/access.mock";
import { getAccessGrant } from "./getAccessGrant";

jest.mock("@inrupt/universal-fetch", () => {
  const crossFetch = jest.requireActual(
    "@inrupt/universal-fetch"
  ) as jest.Mocked<typeof CrossFetch>;
  return {
    // Do no mock the globals such as Response.
    ...crossFetch,
    fetch: jest.fn<(typeof crossFetch)["fetch"]>(),
  };
});

describe("getAccessGrant", () => {
  it("uses the provided fetch if any", async () => {
    mockAccessApiEndpoint();
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockAccessGrantVc())));

    await getAccessGrant("https://some.vc.url", {
      fetch: mockedFetch,
    });
    expect(mockedFetch).toHaveBeenCalledWith("https://some.vc.url");
  });

  it("throws if resolving the IRI results in an HTTP error", async () => {
    mockAccessApiEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response("Not Found", { status: 404, statusText: "Not Found" })
      );

    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(
      /Could not resolve \[https:\/\/some.vc.url\].*404 Not Found/
    );
  });

  it("throws if the given IRI does not resolve to a Verifiable Credential", async () => {
    mockAccessApiEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response("{'someKey': 'someValue'}"));

    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(
      /Unexpected response.*\[https:\/\/some.vc.url\].*not a Verifiable Credential/
    );
  });

  it("throws if the given IRI does not resolve to a access grant Verifiable Credential", async () => {
    mockAccessApiEndpoint();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockConsentRequestVc()))
      );

    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(/not an Access Grant/);
  });

  it("supports denied access grants with a given IRI", async () => {
    mockAccessApiEndpoint();
    const mockedAccessGrant = mockAccessGrantVc();
    mockedAccessGrant.credentialSubject.providedConsent.hasStatus =
      "https://w3id.org/GConsent#ConsentStatusDenied";
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedAccessGrant)));

    const accessGrant = await getAccessGrant("https://some.vc.url", {
      fetch: mockedFetch,
    });
    expect(accessGrant).toEqual(mockedAccessGrant);
  });

  it("returns the access grant with the given IRI", async () => {
    mockAccessApiEndpoint();
    const mockedAccessGrant = mockAccessGrantVc();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedAccessGrant)));

    const accessGrant = await getAccessGrant("https://some.vc.url", {
      fetch: mockedFetch,
    });
    expect(accessGrant).toEqual(mockedAccessGrant);
  });

  it("normalizes equivalent JSON-LD VCs", async () => {
    mockAccessApiEndpoint();
    const normalizedAccessGrant = mockAccessGrantVc();
    // The server returns an equivalent JSON-LD with a different frame:
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...normalizedAccessGrant,
          credentialSubject: {
            ...normalizedAccessGrant.credentialSubject,
            providedConsent: {
              ...normalizedAccessGrant.credentialSubject.providedConsent,
              // The 1-value array is replaced by the literal value.
              forPersonalData:
                normalizedAccessGrant.credentialSubject.providedConsent
                  .forPersonalData[0],
              mode: normalizedAccessGrant.credentialSubject.providedConsent
                .mode[0],
              inherit: "true",
            },
          },
        })
      )
    );
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: mockedFetch,
      })
    ).resolves.toEqual(normalizedAccessGrant);
  });

  it("returns the access grant with the given URL object", async () => {
    mockAccessApiEndpoint();
    const mockedAccessGrant = mockAccessGrantVc();
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedAccessGrant)));

    const accessGrant = await getAccessGrant(new URL("https://some.vc.url"), {
      fetch: mockedFetch,
    });
    expect(accessGrant).toEqual(mockedAccessGrant);
  });
});
