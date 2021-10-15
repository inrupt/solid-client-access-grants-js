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

// eslint-disable-next-line no-shadow
import { jest, describe, it, expect } from "@jest/globals";
import { mockSolidDatasetFrom, getWellKnownSolid } from "@inrupt/solid-client";
import {
  mockConsentEndpoint,
  MOCKED_CONSENT_ISSUER,
  MOCK_REQUESTEE_IRI,
} from "../request/request.mock";
import { getConsentApiEndpoint } from "./getConsentApiEndpoint";

jest.mock("@inrupt/solid-client", () => {
  // TypeScript can't infer the type of modules imported via Jest;
  // skip type checking for those:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});
jest.mock("@inrupt/solid-client-authn-browser");

describe("getConsentApiEndpoint", () => {
  it("can find the consent endpoint for a given resource", async () => {
    mockConsentEndpoint(true, false);
    const consentEndpoint = await getConsentApiEndpoint(MOCK_REQUESTEE_IRI, {
      // eslint-disable-next-line
      fetch: jest.fn() as any,
    });
    expect(consentEndpoint).toBe(MOCKED_CONSENT_ISSUER);
  });

  it("supports the legacy property for consent endpoint discovery", async () => {
    mockConsentEndpoint(true, true);
    const consentEndpoint = await getConsentApiEndpoint(MOCK_REQUESTEE_IRI, {
      // eslint-disable-next-line
      fetch: jest.fn() as any,
    });
    expect(consentEndpoint).toBe(MOCKED_CONSENT_ISSUER);
  });

  it("throws an error if the well-known document does not list any subject", async () => {
    jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getWellKnownSolid: typeof getWellKnownSolid;
        },
        "getWellKnownSolid"
      )
      .mockResolvedValueOnce(
        mockSolidDatasetFrom("https://some.resource/.well-known/solid")
      );
    await expect(
      getConsentApiEndpoint(MOCK_REQUESTEE_IRI, {
        // eslint-disable-next-line
        fetch: jest.fn() as any,
      })
    ).rejects.toThrow(/Cannot discover.*well-known document is empty/);
  });

  it("throws an error if the well-known document does not list a consent endpoint", async () => {
    mockConsentEndpoint(false);
    await expect(
      getConsentApiEndpoint(MOCK_REQUESTEE_IRI, {
        // eslint-disable-next-line
        fetch: jest.fn() as any,
      })
    ).rejects.toThrow(
      /Cannot discover.*no value for properties .*\[http:\/\/inrupt.com\/ns\/ess#consentIssuer\]/
    );
  });
});
