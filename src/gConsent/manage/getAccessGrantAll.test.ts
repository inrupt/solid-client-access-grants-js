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
import { getVerifiableCredentialAllFromShape } from "@inrupt/solid-client-vc";
import type * as VcModule from "@inrupt/solid-client-vc";
import type { fetch } from "@inrupt/universal-fetch";
import type { IssueAccessRequestParameters } from "./getAccessGrantAll";
import { getAccessGrantAll } from "./getAccessGrantAll";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import { mockAccessGrantVc } from "../util/access.mock";

const otherFetch = jest.fn(global.fetch);

jest.mock("@inrupt/solid-client-vc");
const mockedVcModule = jest.requireMock(
  "@inrupt/solid-client-vc",
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
    "https://pod.example/container-1/container-2/some-resource",
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

    await getAccessGrantAll({ resource: resource.href });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedDefaultVcShape),
      expect.objectContaining({
        // Expecting fetch to match universal-fetch fails in node because the
        // getSessionFetch function returns the default @inrupt/solid-client-authn-browser
        // fetch instead.
        fetch: expect.anything(),
      }),
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the right parameters when using deprecated function signature", async () => {
    const requestor = "https://some.requestor";
    const expectedDefaultVcShape = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          isProvidedTo: requestor,
        },
      },
    };

    await getAccessGrantAll(resource, { requestor });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedDefaultVcShape),
      expect.objectContaining({
        // Expecting fetch to match universal-fetch fails in node because the
        // getSessionFetch function returns the default @inrupt/solid-client-authn-browser
        // fetch instead.
        fetch: expect.anything(),
      }),
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the right parameters if resource is not available", async () => {
    const requestor = "https://some.requestor";
    const expectedDefaultVcShape = {
      credentialSubject: {
        providedConsent: {
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          isProvidedTo: requestor,
        },
      },
    };

    await getAccessGrantAll(
      { requestor },
      { accessEndpoint: "https://some.api.endpoint/derive" },
    );

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedDefaultVcShape),
      expect.objectContaining({
        // Expecting fetch to match universal-fetch fails in node because the
        // getSessionFetch function returns the default @inrupt/solid-client-authn-browser
        // fetch instead.
        fetch: expect.anything(),
      }),
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the appropriate requestor", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & {
        requestor: string;
        resource: string | URL;
      }
    > = {
      requestor: "https://some.requestor",
      resource,
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

    await getAccessGrantAll(paramsInput, {
      fetch: otherFetch,
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
      {
        fetch: otherFetch,
      },
    );
  });

  it("Does not call @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape when status list is empty", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & {
        requestor: string;
        resource: string | URL;
      }
    > = {
      requestor: "https://some.requestor",
      resource,
    };

    await expect(
      getAccessGrantAll(paramsInput, {
        fetch: otherFetch,
        status: [],
      }),
    ).resolves.toHaveLength(0);

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).not.toHaveBeenCalled();
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the correct status when searching for denied grants", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & {
        requestor: string;
        resource: string | URL;
      }
    > = {
      requestor: "https://some.requestor",
      resource,
    };

    const expectedVcShape = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          isProvidedTo: "https://some.requestor",
        },
      },
    };

    await getAccessGrantAll(paramsInput, {
      fetch: otherFetch,
      status: ["denied"],
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
      {
        fetch: otherFetch,
      },
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape twice when both granted and denied status' are requested", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & {
        requestor: string;
        resource: string | URL;
      }
    > = {
      requestor: "https://some.requestor",
      resource,
    };

    const expectedVcShapeDenied = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          isProvidedTo: "https://some.requestor",
        },
      },
    };

    const expectedVcShapeApproved = {
      credentialSubject: {
        providedConsent: {
          forPersonalData: [resource.href],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
          isProvidedTo: "https://some.requestor",
        },
      },
    };

    await getAccessGrantAll(paramsInput, {
      fetch: otherFetch,
      status: ["granted", "denied"],
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(8);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShapeDenied),
      {
        fetch: otherFetch,
      },
    );

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShapeApproved),
      {
        fetch: otherFetch,
      },
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape appropriate purpose", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & {
        resource: string | URL;
      }
    > = {
      purpose: ["https://some.purpose"],
      resource,
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

    await getAccessGrantAll(paramsInput, {
      fetch: otherFetch,
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
      {
        fetch: otherFetch,
      },
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the appropriate mode", async () => {
    const paramsInput: Partial<
      IssueAccessRequestParameters & {
        resource: string | URL;
      }
    > = {
      access: { read: true },
      resource,
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

    await getAccessGrantAll(paramsInput, {
      fetch: otherFetch,
    });

    expect(getAccessApiEndpoint).toHaveBeenCalledTimes(1);

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalled();

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.objectContaining(expectedVcShape),
      {
        fetch: otherFetch,
      },
    );
  });

  it("Calls @inrupt/solid-client-vc/getVerifiableCredentialAllFromShape with the expiration filter if specified", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    await getAccessGrantAll(
      { resource },
      {
        includeExpired: true,
        fetch: mockedFetch,
      },
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      "https://some.api.endpoint/derive",
      expect.anything(),
      expect.objectContaining({
        // FIXME: expecting fetch to match crossFetch fails in node.
        fetch: mockedFetch,
        includeExpiredVc: true,
      }),
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

    await getAccessGrantAll({ resource: resource.href });

    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledTimes(4);

    // A call should have been made for each level of the hierarchy.
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[0]),
      expect.anything(),
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[1]),
      expect.anything(),
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[2]),
      expect.anything(),
    );
    expect(getVerifiableCredentialAllFromShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(expectedVcShape[3]),
      expect.anything(),
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
    await expect(
      getAccessGrantAll({ resource: resource.href }),
    ).resolves.toStrictEqual([]);
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
    await expect(
      getAccessGrantAll({ resource: resource.href }),
    ).resolves.toStrictEqual([mockedGrant]);
  });
  it("throws if both resource and accessEndpoint are undefined", async () => {
    await expect(getAccessGrantAll({})).rejects.toThrow(
      "resource and accessEndpoint cannot both be undefined",
    );
  });
});
