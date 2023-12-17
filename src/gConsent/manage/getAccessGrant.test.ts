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

import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { isomorphic } from "rdf-isomorphic";
import { getResources } from "../../common/getters";

import {
  mockAccessGrantObject,
  mockAccessGrantVc,
  mockAccessRequestVc,
} from "../util/access.mock";
import { toBeEqual } from "../util/toBeEqual.mock";
import { getAccessGrant } from "./getAccessGrant";

describe("getAccessGrant", () => {
  let mockAccessGrant: Awaited<ReturnType<typeof mockAccessGrantVc>>;

  beforeAll(async () => {
    mockAccessGrant = await mockAccessGrantVc();
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(mockAccessGrantObject()), {
        headers: new Headers([["content-type", "application/json"]]),
      }),
    );

    await getAccessGrant("https://some.credential", {
      fetch: mockedFetch,
    });
    expect(mockedFetch).toHaveBeenCalledWith("https://some.credential");
  });

  it("throws if resolving the IRI results in an HTTP error", async () => {
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: async () =>
          new Response("Not Found", { status: 404, statusText: "Not Found" }),
      }),
    ).rejects.toThrow(
      "Fetching the Verifiable Credential [https://some.vc.url] failed: 404 Not Found",
    );
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: async () =>
          new Response("Not Found", { status: 404, statusText: "Not Found" }),
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(
      "Fetching the Verifiable Credential [https://some.vc.url] failed: 404 Not Found",
    );
  });

  it("throws if the given IRI does not resolve to a Verifiable Credential", async () => {
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: async () => new Response("{'someKey': 'someValue'}"),
      }),
    ).rejects.toThrow(
      "Parsing the Verifiable Credential [https://some.vc.url] as JSON failed",
    );
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: async () => new Response("{'someKey': 'someValue'}"),
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(
      "Parsing the Verifiable Credential [https://some.vc.url] as JSON failed",
    );
  });

  it("throws if the given IRI does not resolve to a access grant Verifiable Credential", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify(await mockAccessRequestVc()), {
        headers: new Headers([["content-type", "application/json"]]),
      });
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: fetchFn,
      }),
    ).rejects.toThrow(/not an Access Grant/);
    await expect(
      getAccessGrant("https://some.vc.url", {
        fetch: fetchFn,
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(/not an Access Grant/);
  });

  // There is an expect call in the `toBeEqual` function,
  // but the linter doesn't pick up on this.
  // eslint-disable-next-line jest/expect-expect
  it("supports denied access grants with a given IRI", async () => {
    const mockedAccessGrant = mockAccessGrantObject();
    mockedAccessGrant.credentialSubject.providedConsent.hasStatus =
      "https://w3id.org/GConsent#ConsentStatusDenied";

    const fetchFn = async () =>
      new Response(JSON.stringify(mockedAccessGrant), {
        headers: new Headers([["content-type", "application/json"]]),
      });

    const accessGrant = await getAccessGrant("https://some.vc.url", {
      fetch: fetchFn,
    });
    const accessGrantNoProperties = await getAccessGrant(
      "https://some.vc.url",
      {
        fetch: fetchFn,
        returnLegacyJsonld: false,
      },
    );
    toBeEqual(accessGrant, mockedAccessGrant);
    expect(isomorphic([...accessGrant], [...accessGrantNoProperties])).toBe(
      true,
    );
  });

  // There is an expect call in the `toBeEqual` function,
  // but the linter doesn't pick up on this.
  // eslint-disable-next-line jest/expect-expect
  it("returns the access grant with the given IRI", async () => {
    const accessGrant = await getAccessGrant("https://some.vc.url", {
      fetch: async () =>
        new Response(JSON.stringify(mockAccessGrantObject()), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
    });
    toBeEqual(accessGrant, mockAccessGrant);
  });

  // There is an expect call in the `toBeEqual` function,
  // but the linter doesn't pick up on this.
  // eslint-disable-next-line jest/expect-expect
  it("normalizes equivalent JSON-LD VCs", async () => {
    const normalizedAccessGrant = mockAccessGrantObject();
    const fetchFn = async () =>
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
        }),
        {
          headers: new Headers([["content-type", "application/json"]]),
        },
      );

    const accessGrant = await getAccessGrant("https://some.vc.url", {
      // The server returns an equivalent JSON-LD with a different frame:
      fetch: fetchFn,
    });
    toBeEqual(accessGrant, mockAccessGrant);
    expect(
      accessGrant.credentialSubject.providedConsent.forPersonalData,
    ).toEqual(["https://some.resource"]);
    expect(getResources(accessGrant)).toEqual(["https://some.resource"]);

    const accessGrantNoProperties = await getAccessGrant(
      new URL("https://some.vc.url"),
      {
        fetch: fetchFn,
        returnLegacyJsonld: false,
      },
    );
    // @ts-expect-error no object properties should be available
    expect(accessGrantNoProperties.credentialSubject).toBeUndefined();
    expect(getResources(accessGrantNoProperties)).toEqual([
      "https://some.resource",
    ]);

    expect(isomorphic([...accessGrant], [...accessGrantNoProperties])).toBe(
      true,
    );
  });

  // There is an expect call in the `toBeEqual` function,
  // but the linter doesn't pick up on this.
  // eslint-disable-next-line jest/expect-expect
  it("returns the access grant with the given URL object", async () => {
    const mockedFetch = jest.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(mockAccessGrantObject()), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
    );

    const accessGrant = await getAccessGrant(new URL("https://some.vc.url"), {
      fetch: mockedFetch,
    });
    toBeEqual(accessGrant, mockAccessGrant);
    expect(
      accessGrant.credentialSubject.providedConsent.forPersonalData,
    ).toEqual(["https://some.resource"]);
    expect(getResources(accessGrant)).toEqual(["https://some.resource"]);

    const accessGrantNoProperties = await getAccessGrant(
      new URL("https://some.vc.url"),
      {
        fetch: mockedFetch,
        returnLegacyJsonld: false,
      },
    );
    // @ts-expect-error no object properties should be available
    expect(accessGrantNoProperties.credentialSubject).toBeUndefined();
    expect(getResources(accessGrantNoProperties)).toEqual([
      "https://some.resource",
    ]);

    expect(isomorphic([...accessGrant], [...accessGrantNoProperties])).toBe(
      true,
    );
  });

  it("errors if the response is not a full access grant", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          "@context": "https://www.w3.org/2018/credentials/v1",
          id: "https://some.credential",
        }),
      );
    await expect(
      getAccessGrant(new URL("https://some.vc.url"), {
        fetch: fetchFn,
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc.url/] is not a Verifiable Credential",
    );
    await expect(
      getAccessGrant(new URL("https://some.vc.url"), {
        fetch: fetchFn,
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc.url/] is not a Verifiable Credential",
    );
  });

  it("errors if the response is an empty json object", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({}), {
        headers: new Headers([["content-type", "application/json"]]),
      });
    await expect(
      getAccessGrant(new URL("https://some.vc.url"), {
        fetch: fetchFn,
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc.url/] is not a Verifiable Credential",
    );
    await expect(
      getAccessGrant(new URL("https://some.vc.url"), {
        fetch: fetchFn,
        returnLegacyJsonld: false,
      }),
    ).rejects.toThrow(
      "Verifiable credential is not an object, or does not have an id",
    );
  });
});
