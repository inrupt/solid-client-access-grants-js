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

/* eslint-disable no-shadow */
import { jest, it, describe, expect } from "@jest/globals";
import { getVerifiableCredentialAllFromShape } from "@inrupt/solid-client-vc";
import {
  getAccessWithConsentAll,
  RequestAccessWithConsentParameters,
} from "./getAccessWithConsentAll";
import { getConsentApiEndpoint } from "../discover/getConsentApiEndpoint";

const clientAuthnFetch = jest.fn(global.fetch);
const otherFetch = jest.fn(global.fetch);
jest.mock("@inrupt/solid-client-authn-browser", () => {
  return { fetch: clientAuthnFetch };
});

jest.mock("@inrupt/solid-client-vc", () => {
  return {
    getVerifiableCredentialAllFromShape: jest.fn(() => ""),
  };
});

jest.mock("../discover/getConsentApiEndpoint", () => {
  return {
    getConsentApiEndpoint: jest.fn(() => "https://some.api.endpoint"),
  };
});

describe("getAccessWithConsentAll", () => {
  const resource = new URL("https://some.resource");

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the right default parameters", async () => {
    const expectedDefaultVcShape = {
      credentialSubject: {
        hasConsent: {
          mode: [],
          forPersonalData: [resource.href],
          forPurpose: undefined,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        },
      },
    };

    await getAccessWithConsentAll(resource.href);

    expect(getConsentApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expectedDefaultVcShape,
      {
        fetch: clientAuthnFetch,
      }
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the right passed in parameters", async () => {
    const paramsInput: Partial<RequestAccessWithConsentParameters> = {
      purpose: ["https://some.purpose"],
      access: { read: true },
      requestor: "https://some.requestor",
    };

    const expectedVcShape = {
      credentialSubject: {
        id: paramsInput.requestor,
        hasConsent: {
          mode: ["http://www.w3.org/ns/auth/acl#Read"],
          forPersonalData: [resource.href],
          forPurpose: paramsInput.purpose,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        },
      },
    };

    await getAccessWithConsentAll(resource, paramsInput, {
      fetch: otherFetch,
    });

    expect(getConsentApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expectedVcShape,
      {
        fetch: otherFetch,
      }
    );
  });
});
