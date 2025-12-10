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

import {
  beforeAll,
  describe,
  expect,
  it,
  jest,
  afterEach,
} from "@jest/globals";

import type * as VcLibrary from "@inrupt/solid-client-vc";
import {
  getCredentialSubject,
  getIssuer,
  verifiableCredentialToDataset,
  setMaxJsonSize,
} from "@inrupt/solid-client-vc";

// Mocked responses do not include the content lenght.
setMaxJsonSize(undefined);

import { isomorphic } from "rdf-isomorphic";
import { getAccessModes, getRequestor, getResources } from "../../common";
import {
  MOCKED_ACCESS_ISSUER,
  mockAccessApiEndpoint,
} from "../request/request.mock";
import type { AccessGrant } from "../type/AccessGrant";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";
import { normalizeAccessGrant } from "./approveAccessRequest";
import { denyAccessRequest } from "./denyAccessRequest";
import { cacheProvider, DEFAULT_CONTEXT } from "../../common/providerConfig";

jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset,
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});

jest.mock("@inrupt/solid-client-vc", () => {
  const actualVcLibrary = jest.requireActual(
    "@inrupt/solid-client-vc",
  ) as typeof VcLibrary;
  return {
    ...actualVcLibrary,
    issueVerifiableCredential: jest.fn(),
  };
});

// TODO: Extract the fetch VC function and related tests
describe("denyAccessRequest", () => {
  let accessRequestVc: Awaited<ReturnType<typeof mockAccessRequestVc>>;

  beforeAll(async () => {
    accessRequestVc = await mockAccessRequestVc();
    cacheProvider(new URL(MOCKED_ACCESS_ISSUER).href, {
      context: DEFAULT_CONTEXT,
    });
    cacheProvider(new URL("https://some.access-endpoint.override/").href, {
      context: DEFAULT_CONTEXT,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([[true], [false]])(
    "throws if the provided VC isn't a Solid access request [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      await expect(
        denyAccessRequest(
          await mockAccessRequestVc(undefined, (accessRequest) => ({
            ...accessRequest,
            type: ["NotASolidAccessRequest"],
          })),
          {
            returnLegacyJsonld,
          },
        ),
      ).rejects.toThrow(
        "An error occurred when type checking the VC: Not of type [http://www.w3.org/ns/solid/vc#SolidAccessRequest].",
      );
    },
  );

  it.each([[true], [false]])(
    "throws if the provided plain JSON VC isn't a Solid access request [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      await expect(
        denyAccessRequest(
          JSON.parse(
            JSON.stringify(
              await mockAccessRequestVc(undefined, (accessRequest) => ({
                ...accessRequest,
                type: ["NotASolidAccessRequest"],
              })),
            ),
          ),
          {
            returnLegacyJsonld,
          },
        ),
      ).rejects.toThrow(
        "An error occurred when type checking the VC: Not of type [http://www.w3.org/ns/solid/vc#SolidAccessRequest].",
      );
    },
  );

  it.each([[true], [false]])(
    "throws if there is no well known access endpoint [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint(false);
      await expect(
        denyAccessRequest(accessRequestVc, { returnLegacyJsonld }),
      ).rejects.toThrow(
        "No access issuer listed for property [verifiable_credential_issuer] in",
      );
    },
  );

  it.each([[true], [false]])(
    "uses the provided access endpoint, if any [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => Promise<AccessGrant>;
      };
      const spiedIssueRequest = jest
        .spyOn(mockedVcModule, "issueVerifiableCredential")
        .mockResolvedValueOnce(await mockAccessGrantVc());

      const denail = await denyAccessRequest(accessRequestVc, {
        accessEndpoint: "https://some.access-endpoint.override/",
        fetch: jest.fn<typeof fetch>(),
        returnLegacyJsonld,
      });

      expect(spiedIssueRequest).toHaveBeenCalledWith(
        "https://some.access-endpoint.override/".concat("issue"),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      expect(getRequestor(denail)).toEqual(getRequestor(accessRequestVc));
      expect(getAccessModes(denail)).toEqual(getAccessModes(accessRequestVc));
      expect(getIssuer(denail)).toEqual(getIssuer(accessRequestVc));
      expect(getResources(denail)).toEqual(getResources(accessRequestVc));
    },
  );

  it.each([[true], [false]])(
    "uses the provided access endpoint from plain JSON VC, if any [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => Promise<AccessGrant>;
      };
      const spiedIssueRequest = jest
        .spyOn(mockedVcModule, "issueVerifiableCredential")
        .mockResolvedValueOnce(await mockAccessGrantVc());

      const denail = await denyAccessRequest(
        JSON.parse(JSON.stringify(accessRequestVc)),
        {
          accessEndpoint: "https://some.access-endpoint.override/",
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
        },
      );

      expect(spiedIssueRequest).toHaveBeenCalledWith(
        "https://some.access-endpoint.override/".concat("issue"),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      expect(getRequestor(denail)).toEqual(getRequestor(accessRequestVc));
      expect(getAccessModes(denail)).toEqual(getAccessModes(accessRequestVc));
      expect(getIssuer(denail)).toEqual(getIssuer(accessRequestVc));
      expect(getResources(denail)).toEqual(getResources(accessRequestVc));
    },
  );

  it("returns isomorphic results regardless of how returnLegacyJsonld is set", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => Promise<AccessGrant>;
    };
    jest
      .spyOn(mockedVcModule, "issueVerifiableCredential")
      .mockResolvedValueOnce(await mockAccessGrantVc());

    const legacyDenial = await denyAccessRequest(accessRequestVc, {
      accessEndpoint: "https://some.access-endpoint.override/",
      fetch: jest.fn<typeof fetch>(),
      returnLegacyJsonld: true,
    });

    jest
      .spyOn(mockedVcModule, "issueVerifiableCredential")
      .mockResolvedValueOnce(
        // @ts-expect-error only return the dataset-like value.
        await verifiableCredentialToDataset(await mockAccessGrantVc(), {
          includeVcProperties: false,
        }),
      );

    const denial = await denyAccessRequest(accessRequestVc, {
      accessEndpoint: "https://some.access-endpoint.override/",
      fetch: jest.fn<typeof fetch>(),
      returnLegacyJsonld: false,
    });

    expect(isomorphic([...legacyDenial], [...denial])).toBe(true);

    expect(legacyDenial.credentialSubject.id).toBe(
      "https://some.resource.owner",
    );
    expect(getCredentialSubject(legacyDenial).value).toBe(
      "https://some.resource.owner",
    );
    expect(getCredentialSubject(denial).value).toBe(
      "https://some.resource.owner",
    );
    // @ts-expect-error the credentialSubject property has been removed on non-legacy results
    expect(denial.credentialSubject).toBeUndefined();
  });

  it.each([[true], [false]])(
    "uses the provided fetch, if any [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      const mockedFetch = async () => new Response();
      const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => Promise<AccessGrant>;
      };
      const spiedIssueRequest = jest
        .spyOn(mockedVcModule, "issueVerifiableCredential")
        .mockResolvedValueOnce(await mockAccessGrantVc());

      await denyAccessRequest(accessRequestVc, {
        fetch: mockedFetch,
        returnLegacyJsonld,
      });
      expect(spiedIssueRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          fetch: mockedFetch,
          normalize: normalizeAccessGrant,
          returnLegacyJsonld,
        },
      );
    },
  );

  it.each([[true], [false]])(
    "issues a proper denied access VC [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => Promise<AccessGrant>;
      };
      const spiedIssueRequest = jest
        .spyOn(mockedVcModule, "issueVerifiableCredential")
        .mockResolvedValueOnce(await mockAccessGrantVc());
      const accessRequestWithPurpose = await mockAccessRequestVc({
        purpose: ["https://example.org/some-purpose"],
      });
      await denyAccessRequest(accessRequestWithPurpose, {
        fetch: jest.fn<typeof fetch>(),
        returnLegacyJsonld,
      });

      // TODO: Should we expect "isProvidedTo": "https://some.requestor" in "providedConsent" or nest the expect.objectContaining?
      expect(spiedIssueRequest).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          providedConsent: {
            mode: accessRequestWithPurpose.credentialSubject.hasConsent.mode,
            hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
            forPersonalData:
              accessRequestWithPurpose.credentialSubject.hasConsent
                .forPersonalData,
            isProvidedTo: "https://some.requestor",
            forPurpose:
              accessRequestWithPurpose.credentialSubject.hasConsent.forPurpose,
            request: accessRequestWithPurpose.id,
          },
          inbox: accessRequestWithPurpose.credentialSubject.inbox,
        }),
        expect.objectContaining({
          type: ["SolidAccessDenial"],
          expirationDate: accessRequestWithPurpose.expirationDate,
        }),
        expect.anything(),
      );
    },
  );

  it.each([[true], [false]])(
    "issues a proper denied access VC from a given access request VC IRI [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => Promise<AccessGrant>;
      };
      const spiedIssueRequest = jest
        .spyOn(mockedVcModule, "issueVerifiableCredential")
        .mockResolvedValueOnce(await mockAccessGrantVc());
      const mockedFetch = jest
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(await mockAccessRequestVc())),
        );
      await denyAccessRequest("https://some.credential", {
        fetch: mockedFetch,
        returnLegacyJsonld,
      });

      expect(spiedIssueRequest).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          providedConsent: expect.objectContaining({
            mode: accessRequestVc.credentialSubject.hasConsent.mode,
            hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
            forPersonalData:
              accessRequestVc.credentialSubject.hasConsent.forPersonalData,
            request: "https://some.credential",
          }),
          inbox: accessRequestVc.credentialSubject.inbox,
        }),
        expect.objectContaining({
          type: ["SolidAccessDenial"],
        }),
        expect.anything(),
      );
    },
  );

  it.each([[true], [false]])(
    "can take a URL as VC IRI parameter [returnLegacyJsonld: %s]",
    async (returnLegacyJsonld) => {
      mockAccessApiEndpoint();
      const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
        issueVerifiableCredential: () => Promise<AccessGrant>;
      };
      const spiedIssueRequest = jest
        .spyOn(mockedVcModule, "issueVerifiableCredential")
        .mockResolvedValueOnce(await mockAccessGrantVc());

      const mockedFetch = jest
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(await mockAccessRequestVc())),
        );
      await denyAccessRequest(new URL("https://some.credential"), {
        fetch: mockedFetch,
        returnLegacyJsonld,
      });

      // TODO: Should we expect "isProvidedTo": "https://some.requestor" in "providedConsent" or nest the expect.objectContaining?
      expect(spiedIssueRequest).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          providedConsent: expect.objectContaining({
            mode: accessRequestVc.credentialSubject.hasConsent.mode,
            hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
            forPersonalData:
              accessRequestVc.credentialSubject.hasConsent.forPersonalData,
            request: "https://some.credential",
          }),
          inbox: accessRequestVc.credentialSubject.inbox,
        }),
        expect.objectContaining({
          type: ["SolidAccessDenial"],
        }),
        expect.anything(),
      );
    },
  );

  it("passes custom fields to the VC issuer", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => Promise<AccessGrant>;
    };
    const spiedIssueRequest = jest
      .spyOn(mockedVcModule, "issueVerifiableCredential")
      .mockResolvedValueOnce(await mockAccessGrantVc());

    const denialCustomFields = new Set([
      {
        key: new URL("https://example.org/ns/overriddenCustomString"),
        value: "overriden custom value",
      },
      {
        key: new URL("https://example.org/ns/denialCustomValue"),
        value: 42,
      },
    ]);

    const grantCustomFields = [
      {
        key: new URL("https://example.org/ns/overriddenCustomString"),
        value: "custom value",
      },
      {
        key: new URL("https://example.org/ns/unchangedCustomString"),
        value: "unchanged value",
      },
    ];
    const customRequest = await mockAccessRequestVc({
      custom: grantCustomFields,
    });

    await denyAccessRequest(customRequest, {
      customFields: denialCustomFields,
      fetch: jest.fn<typeof fetch>(),
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: expect.objectContaining({
          "https://example.org/ns/overriddenCustomString":
            "overriden custom value",
          "https://example.org/ns/unchangedCustomString": "unchanged value",
          "https://example.org/ns/denialCustomValue": 42,
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("correctly merges multiple custom fields", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => Promise<AccessGrant>;
    };
    const spiedIssueRequest = jest
      .spyOn(mockedVcModule, "issueVerifiableCredential")
      .mockResolvedValueOnce(await mockAccessGrantVc());

    const customFields = new Set([
      {
        key: new URL("https://example.org/field1"),
        value: "value1",
      },
      {
        key: new URL("https://example.org/field2"),
        value: "value2",
      },
      {
        key: new URL("https://example.org/field3"),
        value: true,
      },
      {
        key: new URL("https://example.org/field4"),
        value: 123,
      },
    ]);

    await denyAccessRequest(accessRequestVc, {
      customFields,
      fetch: jest.fn<typeof fetch>(),
    });

    // Verify all custom fields are included in the context and body
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: expect.objectContaining({
          "https://example.org/field1": "value1",
          "https://example.org/field2": "value2",
          "https://example.org/field3": true,
          "https://example.org/field4": 123,
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });
});
