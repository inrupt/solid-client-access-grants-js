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

import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import type * as VcLibrary from "@inrupt/solid-client-vc";

import type { NamedNode } from "n3";
import { INHERIT, acl, gc } from "../../common/constants";
import type { CustomField } from "../../type/CustomField";
import {
  issueAccessRequest,
  normalizeAccessRequest,
} from "./issueAccessRequest";
import { getRequestBody } from "../util/issueAccessVc";
import {
  mockAccessApiEndpoint,
  MOCKED_ACCESS_ISSUER,
  MOCK_REQUESTOR_INBOX,
  MOCK_RESOURCE_OWNER_IRI,
} from "./request.mock";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";
import { GC_CONSENT_STATUS_REQUESTED_ABBREV } from "../constants";
import type { AccessRequestBody } from "../type/AccessVerifiableCredential";
import type { AccessRequest } from "../type/AccessRequest";

jest.mock("@inrupt/solid-client", () => {
  // TypeScript can't infer the type of modules imported via Jest;
  // skip type checking for those:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe("getRequestBody", () => {
  it("can generate a minimal request body", () => {
    const requestBody = getRequestBody({
      access: { append: true },
      resources: ["https://some.pod/resource"],
      status: "https://w3id.org/GConsent#ConsentStatusRequested",
      requestorInboxUrl: MOCK_REQUESTOR_INBOX,
      resourceOwner: MOCK_RESOURCE_OWNER_IRI,
    });

    expect(requestBody).toStrictEqual({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.inrupt.com/credentials/v2.jsonld",
      ],
      credentialSubject: {
        hasConsent: {
          forPersonalData: ["https://some.pod/resource"],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
          mode: ["http://www.w3.org/ns/auth/acl#Append"],
          isConsentForDataSubject: "https://some.pod/profile#you",
        },
        inbox: MOCK_REQUESTOR_INBOX,
      },
      type: ["SolidAccessRequest"],
    });
  });

  it("can generate a full request body", () => {
    const requestBody = getRequestBody({
      access: {
        read: true,
        write: true,
        append: true,
      },
      resources: ["https://some.pod/resource"],
      issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
      expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
      purpose: ["https://some.vocab/purpose#save-the-world"],
      requestorInboxUrl: "https://some.pod/inbox/",
      status: "https://w3id.org/GConsent#ConsentStatusRequested",
      resourceOwner: MOCK_RESOURCE_OWNER_IRI,
      inherit: false,
    });

    expect(requestBody).toStrictEqual({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.inrupt.com/credentials/v2.jsonld",
      ],
      credentialSubject: {
        hasConsent: {
          forPersonalData: ["https://some.pod/resource"],
          forPurpose: ["https://some.vocab/purpose#save-the-world"],
          hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
          mode: [
            "http://www.w3.org/ns/auth/acl#Read",
            "http://www.w3.org/ns/auth/acl#Append",
            "http://www.w3.org/ns/auth/acl#Write",
          ],
          isConsentForDataSubject: "https://some.pod/profile#you",
          inherit: false,
        },
        inbox: "https://some.pod/inbox/",
      },
      expirationDate: "1990-11-12T13:37:42.042Z",
      issuanceDate: "1955-06-08T13:37:42.042Z",
      type: ["SolidAccessRequest"],
    });
  });
});

describe.each([true, false, undefined])(
  "issueAccessRequest, legacyJsonLd: %s",
  (returnLegacyJsonld) => {
    let mockAccessRequest: Awaited<ReturnType<typeof mockAccessRequestVc>>;
    let mockAccessGrant: Awaited<ReturnType<typeof mockAccessGrantVc>>;

    beforeAll(async () => {
      mockAccessRequest = await mockAccessRequestVc();
      mockAccessGrant = await mockAccessGrantVc();
    });

    it("sends a proper access request", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          requestorInboxUrl: MOCK_REQUESTOR_INBOX,
        },
        {
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
        },
      );

      expect(mockedIssue).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          hasConsent: {
            mode: ["http://www.w3.org/ns/auth/acl#Read"],
            hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
            forPersonalData: ["https://some.pod/resource"],
            isConsentForDataSubject: "https://some.pod/profile#you",
          },
        }),
        expect.objectContaining({
          type: ["SolidAccessRequest"],
        }),
        expect.anything(),
      );
    });

    it("Supports abbreviated status values", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockAccessRequest.credentialSubject.hasConsent.hasStatus =
        GC_CONSENT_STATUS_REQUESTED_ABBREV;
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await expect(
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
          },
        ),
      ).resolves.not.toThrow();
    });

    it("throws if the VC returned is not an Access Request", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessGrant);

      await expect(
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
          },
        ),
      ).rejects.toThrow();
    });

    it("sends a proper access with consent request", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          purpose: ["https://some.vocab/purpose#save-the-world"],
          issuanceDate: new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 42)),
          expirationDate: new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)),
          requestorInboxUrl: "https://some.pod/inbox/",
        },
        {
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
        },
      );

      expect(mockedIssue).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          hasConsent: {
            mode: ["http://www.w3.org/ns/auth/acl#Read"],
            hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
            forPersonalData: ["https://some.pod/resource"],
            forPurpose: ["https://some.vocab/purpose#save-the-world"],
            isConsentForDataSubject: "https://some.pod/profile#you",
          },
        }),
        expect.objectContaining({
          type: ["SolidAccessRequest"],
          issuanceDate: "1955-06-08T13:37:42.042Z",
          expirationDate: "1990-11-12T13:37:42.042Z",
        }),
        expect.anything(),
      );
    });

    it("supports access with consent request with no issuance or expiration set", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          purpose: ["https://some.vocab/purpose#save-the-world"],
          requestorInboxUrl: "https://some.pod/inbox/",
        },
        {
          returnLegacyJsonld,
        },
      );

      expect(mockedIssue).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          hasConsent: {
            mode: ["http://www.w3.org/ns/auth/acl#Read"],
            hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
            forPersonalData: ["https://some.pod/resource"],
            forPurpose: ["https://some.vocab/purpose#save-the-world"],
            isConsentForDataSubject: "https://some.pod/profile#you",
          },
        }),
        expect.objectContaining({
          type: ["SolidAccessRequest"],
        }),
        expect.anything(),
      );
    });

    it("includes the inherit flag if set to false", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          inherit: false,
        },
        {
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
        },
      );

      expect(mockedIssue.mock.lastCall?.[1]).toMatchObject({
        hasConsent: {
          inherit: false,
        },
      });
    });

    it("includes the inherit flag if set to true", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          inherit: true,
        },
        {
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
        },
      );

      expect(mockedIssue.mock.lastCall?.[1]).toMatchObject({
        hasConsent: {
          inherit: true,
        },
      });
    });

    it("defaults the inherit flag to undefined", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          // Note that "inherit" is not specified.
        },
        {
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
        },
      );

      expect(
        (
          mockedIssue.mock
            .lastCall?.[1] as unknown as AccessRequestBody["credentialSubject"]
        ).hasConsent.inherit,
      ).toBeUndefined();
    });

    const jsonLdEquivalent = (
      request: AccessRequest,
      options: { inherit?: "true" | "false" },
    ) => ({
      ...request,
      credentialSubject: {
        ...request.credentialSubject,
        hasConsent: {
          ...request.credentialSubject.hasConsent,
          // The 1-value array is replaced by the literal value.
          forPersonalData:
            request.credentialSubject.hasConsent.forPersonalData[0],
          mode: request.credentialSubject.hasConsent.mode[0],
          inherit: options.inherit,
        },
      },
    });

    it("normalizes equivalent JSON-LD VCs including 'true' booleans", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      const normalizedAccessRequest = await mockAccessRequestVc({
        inherit: true,
      });
      mockedIssue.mockResolvedValueOnce(
        normalizeAccessRequest(
          jsonLdEquivalent(normalizedAccessRequest, { inherit: "true" }),
        ),
      );
      await expect(
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
          },
        ),
      ).resolves.toStrictEqual(normalizedAccessRequest);
    });

    it("normalizes equivalent JSON-LD VCs including 'false' booleans", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      // Test for a different "inherit" value
      const normalizedAccessRequest = await mockAccessRequestVc({
        inherit: false,
      });
      mockedIssue.mockResolvedValueOnce(
        normalizeAccessRequest(
          jsonLdEquivalent(normalizedAccessRequest, { inherit: "false" }),
        ),
      );
      await expect(
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
          },
        ),
      ).resolves.toStrictEqual(normalizedAccessRequest);
    });

    it("supports valid custom fields", async () => {
      mockAccessApiEndpoint();
      const mockedIssue = jest.spyOn(
        jest.requireMock("@inrupt/solid-client-vc") as {
          issueVerifiableCredential: typeof VcLibrary.issueVerifiableCredential;
        },
        "issueVerifiableCredential",
      );
      mockedIssue.mockResolvedValueOnce(mockAccessRequest);

      await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: MOCK_RESOURCE_OWNER_IRI,
          resources: ["https://some.pod/resource"],
          requestorInboxUrl: MOCK_REQUESTOR_INBOX,
        },
        {
          fetch: jest.fn<typeof fetch>(),
          returnLegacyJsonld,
          customFields: new Set([
            {
              key: new URL("https://example.org/ns/customString"),
              value: "custom value",
            },
            {
              key: new URL("https://example.org/ns/customBoolean"),
              value: true,
            },
            {
              key: new URL("https://example.org/ns/customInt"),
              value: 1,
            },
            {
              key: new URL("https://example.org/ns/customFloat"),
              value: 1.1,
            },
          ]),
        },
      );

      expect(mockedIssue).toHaveBeenCalledWith(
        `${MOCKED_ACCESS_ISSUER}/issue`,
        expect.objectContaining({
          hasConsent: {
            mode: ["http://www.w3.org/ns/auth/acl#Read"],
            hasStatus: "https://w3id.org/GConsent#ConsentStatusRequested",
            forPersonalData: ["https://some.pod/resource"],
            isConsentForDataSubject: "https://some.pod/profile#you",
            "https://example.org/ns/customString": "custom value",
            "https://example.org/ns/customBoolean": true,
            "https://example.org/ns/customInt": 1,
            "https://example.org/ns/customFloat": 1.1,
          },
        }),
        expect.objectContaining({
          type: ["SolidAccessRequest"],
        }),
        expect.anything(),
      );
    });

    it("throws if the same key is used for multiple custom fields", async () => {
      mockAccessApiEndpoint();

      await expect(() =>
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
            customFields: new Set([
              {
                key: new URL("https://example.org/ns/customField"),
                value: "custom string",
              },
              {
                key: new URL("https://example.org/ns/customField"),
                value: "another string",
              },
            ]),
          },
        ),
      ).rejects.toThrow();
    });

    it("throws on invalid custom fields", async () => {
      mockAccessApiEndpoint();

      await expect(() =>
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
            customFields: new Set([
              {
                key: "not a URL",
                value: "customValue",
                // Mimic a user passing in bad data not caught by a TS compiler
              } as unknown as CustomField,
            ]),
          },
        ),
      ).rejects.toThrow();

      await expect(() =>
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
            customFields: new Set([
              {
                key: new URL("https://example.org/ns/customField"),
                value: { notA: "literal" },
                // Mimic a user passing in bad data not caught by a TS compiler
              } as unknown as CustomField,
            ]),
          },
        ),
      ).rejects.toThrow();

      await expect(() =>
        issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: MOCK_RESOURCE_OWNER_IRI,
            resources: ["https://some.pod/resource"],
            requestorInboxUrl: MOCK_REQUESTOR_INBOX,
          },
          {
            fetch: jest.fn<typeof fetch>(),
            returnLegacyJsonld,
            customFields: new Set([
              {
                key: new URL("https://example.org/ns/customField"),
                value: ["not a", "scalar"],
                // Mimic a user passing in bad data not caught by a TS compiler
              } as unknown as CustomField,
            ]),
          },
        ),
      ).rejects.toThrow();
    });

    it.each([
      [gc.forPersonalData],
      [gc.forPurpose],
      [gc.isProvidedTo],
      [gc.isProvidedToController],
      [gc.isProvidedToPerson],
      [acl.mode],
      [INHERIT],
    ])(
      "throws if using reserved predicate %s as custom fields",
      async (reserved: NamedNode) => {
        mockAccessApiEndpoint();

        await expect(() =>
          issueAccessRequest(
            {
              access: { read: true },
              resourceOwner: MOCK_RESOURCE_OWNER_IRI,
              resources: ["https://some.pod/resource"],
              requestorInboxUrl: MOCK_REQUESTOR_INBOX,
            },
            {
              fetch: jest.fn<typeof fetch>(),
              returnLegacyJsonld,
              customFields: new Set([
                {
                  key: new URL(reserved.value),
                  value: "customValue",
                },
              ]),
            },
          ),
        ).rejects.toThrow();
      },
    );
  },
);
