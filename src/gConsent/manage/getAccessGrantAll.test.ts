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
import type * as VcModule from "@inrupt/solid-client-vc";
import {
  getAccessGrantAll,
  IssueAccessRequestParameters,
} from "./getAccessGrantAll";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import { mockAccessGrantVc } from "../util/access.mock";

const otherFetch = jest.fn(global.fetch);

jest.mock("@inrupt/solid-client-vc");
const mockedVcModule = jest.requireMock(
  "@inrupt/solid-client-vc"
) as jest.Mocked<typeof VcModule>;
mockedVcModule.getVerifiableCredentialAllFromShape.mockResolvedValue([
  mockAccessGrantVc(),
]);

jest.mock("../discover/getAccessApiEndpoint", () => {
  return {
    getAccessApiEndpoint: jest.fn(() => "https://some.api.endpoint"),
  };
});

describe("getAccessGrantAll", () => {
  const resource = new URL(
    "https://pod.example/container-1/container-2/some-resource"
  );
  const resourceAncestors = [
    "https://pod.example/container-1/container-2/",
    "https://pod.example/container-1/",
    "https://pod.example/",
  ];

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

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedDefaultVcShape),
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

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
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

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
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

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
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

  it("issues requests for recursive access grants of ancestor containers", async () => {
    // These are all the URLs for which a recursive Access Grant would grant access
    // to the target resource.
    const matchingUrls = [resource.href, ...resourceAncestors];
    const expectedVcShape = matchingUrls.map((url) => ({
      credentialSubject: {
        providedConsent: {
          forPersonalData: [url],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
        },
      },
    }));

    await getAccessGrantAll(resource.href);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(4);

    // A call should have been made for each level of the hierarchy.
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[0]),
      expect.anything()
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[1]),
      expect.anything()
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[2]),
      expect.anything()
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[3]),
      expect.anything()
    );
  });

  it("filters out non-recursive grants for ancestors", async () => {
    const mockedGrant = mockAccessGrantVc({
      inherit: false,
      resources: [resourceAncestors[0]],
    });
    mockedVcModule.getVerifiableCredentialAllFromShape.mockResolvedValue([
      mockedGrant,
    ]);
    await expect(getAccessGrantAll(resource.href)).resolves.toStrictEqual([]);
  });

  it("accepts explicitly non-recursive grants for target resource", async () => {
    const mockedGrant = mockAccessGrantVc({
      inherit: false,
      resources: [resource.href],
    });
    mockedVcModule.getVerifiableCredentialAllFromShape
      .mockResolvedValueOnce([mockedGrant])
      // Override the default mock to an unapplicable non-recursive grant.
      .mockResolvedValue([
        mockAccessGrantVc({
          inherit: false,
          resources: [resourceAncestors[0]],
        }),
      ]);
    await expect(getAccessGrantAll(resource.href)).resolves.toStrictEqual([
      mockedGrant,
    ]);
  });
});
