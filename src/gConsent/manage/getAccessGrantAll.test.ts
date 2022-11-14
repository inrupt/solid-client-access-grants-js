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

import { jest, it, describe, expect } from "@jest/globals";
import { getVerifiableCredentialAllFromShape } from "@inrupt/solid-client-vc";
import { fetch as crossFetch } from "cross-fetch";
import {
  getAccessGrantAll,
  IssueAccessRequestParameters,
} from "./getAccessGrantAll";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";

const otherFetch = jest.fn(global.fetch);

jest.mock("@inrupt/solid-client-vc", () => {
  return {
    getVerifiableCredentialAllFromShape: jest.fn(() => ""),
  };
});

jest.mock("../discover/getAccessApiEndpoint", () => {
  return {
    getAccessApiEndpoint: jest.fn(() => "https://some.api.endpoint"),
  };
});

describe("getAccessGrantAll", () => {
  const resource = new URL("https://some.resource");

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the right default parameters", async () => {
    const expectedDefaultVcShape = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        },
      },
    };

    await getAccessGrantAll(resource.href);

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expectedDefaultVcShape,
      expect.objectContaining({
        // FIXME: expecting fetch to match crossFetch fails in node.
        fetch: expect.anything(),
      })
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the appropriate requestor", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & { requestor: string }
    > = {
      requestor: "https://some.requestor",
    };

    const expectedVcShape = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          isProvidedTo: "https://some.requestor",
        },
      },
    };

    await getAccessGrantAll(resource, paramsInput, {
      fetch: otherFetch,
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expectedVcShape,
      {
        fetch: otherFetch,
      }
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape appropriate purpose", async () => {
    const paramsInput: Partial<IssueAccessRequestParameters> = {
      purpose: ["https://some.purpose"],
    };

    const expectedVcShape = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          forPurpose: paramsInput.purpose,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        },
      },
    };

    await getAccessGrantAll(resource, paramsInput, {
      fetch: otherFetch,
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expectedVcShape,
      {
        fetch: otherFetch,
      }
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the appropriate mode", async () => {
    const paramsInput: Partial<IssueAccessRequestParameters> = {
      access: { read: true },
    };

    const expectedVcShape = {
      credentialSubject: {
        providedConsent: {
          mode: ["http://www.w3.org/ns/auth/acl#Read"],
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        },
      },
    };

    await getAccessGrantAll(resource, paramsInput, {
      fetch: otherFetch,
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expectedVcShape,
      {
        fetch: otherFetch,
      }
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the expiration filter if specified", async () => {
    await getAccessGrantAll(resource.href, undefined, {
      includeExpired: true,
    });
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.anything(),
      expect.objectContaining({
        // FIXME: expecting fetch to match crossFetch fails in node.
        fetch: expect.anything(),
        includeExpiredVc: true,
      })
    );
  });
});
