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

// Globals are actually not injected, so this does not shadow anything.
import { File as NodeFile } from "buffer";
import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";
import { Session } from "@inrupt/solid-client-authn-node";
import type {
  DatasetWithId,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  isVerifiableCredential as _isVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  isRdfjsVerifiableCredential,
} from "@inrupt/solid-client-vc";
import { DataFactory } from "n3";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
// Making a named import here to avoid confusion with the wrapped functions from
// the access grant API
import * as sc from "@inrupt/solid-client";
import { custom } from "openid-client";
import type { AccessGrant, AccessRequest } from "../../src/index";
import {
  DURATION,
  approveAccessRequest,
  createContainerInContainer,
  denyAccessRequest,
  getAccessApiEndpoint,
  getAccessGrant,
  getAccessGrantAll,
  getAccessModes,
  getExpirationDate,
  getFile,
  getIssuanceDate,
  getIssuer,
  getRequestor,
  getResourceOwner,
  getResources,
  getSolidDataset,
  getTypes,
  isValidAccessGrant,
  issueAccessRequest,
  overwriteFile,
  paginatedQuery,
  query,
  revokeAccessGrant,
  saveFileInContainer,
  saveSolidDatasetAt,
  saveSolidDatasetInContainer,
} from "../../src/index";
import {
  getCustomBoolean,
  getCustomFields,
  getCustomInteger,
  getCustomString,
  getInherit,
  getPurposes,
  getRequest,
} from "../../src/common/getters";
import { toBeEqual } from "../../src/gConsent/util/toBeEqual.mock";
import { issueAccessGrant } from "../../src/gConsent/manage/approveAccessRequest";

const { namedNode } = DataFactory;

async function retryAsync<T>(
  callback: () => Promise<T>,
  maxRetries = 2,
  interval = 1_000,
): Promise<T> {
  let tries = 0;
  const errors: Error[] = [];
  while (tries < maxRetries) {
    try {
      // The purpose here is to retry an async operation, not to parallelize.
      // Awaiting the callback will throw on error before returning.

      return await callback();
    } catch (e: unknown) {
      errors.push(e as Error);
      tries += 1;

      await new Promise((resolve) => {
        setTimeout(resolve, interval);
      });
    }
  }
  const errorsString = errors.map((e) => e.toString()).join("\n");
  throw new Error(
    `An async callback is still failing after ${maxRetries} retries. The errors were: ${errorsString}`,
  );
}

if (process.env.CI === "true") {
  // Tests running in the CI runners tend to be more flaky.
  jest.retryTimes(3, { logErrorsBeforeRetry: true });
}

// Extend the timeout because of frequent issues in CI (default is 3500)
custom.setHttpOptionsDefaults({
  timeout: 10000,
});

const env = getNodeTestingEnvironment({
  clientCredentials: {
    owner: { id: true, secret: true },
    requestor: { id: true, secret: true },
  },
});

const {
  idp: oidcIssuer,
  environment,
  clientCredentials,
  features: environmentFeatures,
} = env;

const TEST_USER_AGENT = `Node-based solid-client-access-grant end-to-end tests running ${
  process.env.CI === "true" ? "in CI" : "locally"
}`;
const addUserAgent =
  (myFetch: typeof fetch, agent: string) =>
  (input: RequestInfo | URL, init?: RequestInit | undefined) =>
    myFetch(input, {
      ...init,
      headers: { ...init?.headers, "User-Agent": agent },
    });

const describeIf = (condition: boolean) =>
  condition ? describe : describe.skip;
// Conditional tests confuse eslint.

// For some reason, the Node jest runner throws an undefined error when
// calling to btoa. This overrides it, while keeping the actual code
// environment-agnostic.
if (!globalThis.btoa) {
  globalThis.btoa = (data: string) => Buffer.from(data).toString("base64");
}

// This is the content of the file uploaded manually at SHARED_FILE_IRI.
const SHARED_FILE_CONTENT = "Some content.\n";

describe(`End-to-end access grant tests for environment [${environment}] `, () => {
  const requestorSession = new Session();
  const requestorLogin = async () => {
    await requestorSession.login({
      oidcIssuer,
      clientId: clientCredentials?.requestor?.id,
      clientSecret: clientCredentials?.requestor?.secret,
      // Note that currently, using a Bearer token (as opposed to a DPoP one)
      // is required for the UMA access token to be usable.
      tokenType: "Bearer",
    });
  };
  // Keep the session loggined in.
  requestorSession.events.on("sessionExpired", requestorLogin);

  const ownerSession = new Session();
  const ownerLogin = async () => {
    await ownerSession.login({
      oidcIssuer,
      clientId: clientCredentials?.owner?.id,
      clientSecret: clientCredentials?.owner?.secret,
      // Note that currently, using a Bearer token (as opposed to a DPoP one)
      // is required for the UMA access token to be usable.
      tokenType: "Bearer",
    });
  };
  ownerSession.events.on("sessionExpired", ownerLogin);
  let sharedFileIri: string;
  let resourceOwnerPod: string;
  let vcProvider: string;
  let sharedRequest: DatasetWithId;
  let verifierService: string;

  async function getSharedFile() {
    // setup the shared file
    const savedFile = await retryAsync(() =>
      sc.saveFileInContainer(
        resourceOwnerPod,
        new Blob([SHARED_FILE_CONTENT]),
        {
          fetch: addUserAgent(
            addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            TEST_USER_AGENT,
          ),
        },
      ),
    );

    return sc.getSourceUrl(savedFile);
  }

  function deleteSharedFile(iri: string) {
    // Remove the shared file from the resource owner's Pod.
    return retryAsync(() =>
      sc.deleteFile(iri, {
        fetch: addUserAgent(
          addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          TEST_USER_AGENT,
        ),
      }),
    );
  }

  beforeAll(async () => {
    // Log both sessions in.
    await Promise.all([ownerLogin(), requestorLogin()]);

    // Create a file in the resource owner's Pod
    const resourceOwnerPodAll = await retryAsync(() =>
      sc.getPodUrlAll(ownerSession.info.webId as string),
    );
    if (resourceOwnerPodAll.length === 0) {
      throw new Error(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root.",
      );
    }
    [resourceOwnerPod] = resourceOwnerPodAll;

    sharedFileIri = await getSharedFile();
    vcProvider = await retryAsync(() => getAccessApiEndpoint(sharedFileIri));

    const vcConfiguration =
      await getVerifiableCredentialApiConfiguration(vcProvider);

    if (typeof vcConfiguration.verifierService !== "string") {
      throw new Error("Verifier endpoint is undefined");
    }

    verifierService = vcConfiguration.verifierService;
  });

  afterAll(async () => {
    await deleteSharedFile(sharedFileIri);
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.

    await Promise.all(
      [ownerSession, requestorSession].map((session) => session.logout()),
    );
  });

  describe.each([[true, false], []])(
    `with [returnLegacyJsonLd: %s]`,
    (returnLegacyJsonld) => {
      const isVerifiableCredential = returnLegacyJsonld
        ? _isVerifiableCredential
        : (d: DatasetWithId) => isRdfjsVerifiableCredential(d, namedNode(d.id));

      beforeAll(async () => {
        sharedRequest = await issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: ownerSession.info.webId as string,
            resources: [sharedFileIri],
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
            expirationDate: new Date(Date.now() + 60 * 60 * 1000),
          },
          {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
            returnLegacyJsonld,
          },
        );
      });

      describe("access request, grant and exercise flow", () => {
        it("can issue an access request, grant access to a resource, and revoke the granted access", async () => {
          expect(isVerifiableCredential(sharedRequest)).toBe(true);

          const grant = await approveAccessRequest(
            sharedRequest,
            {},
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
              returnLegacyJsonld,
            },
          );

          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });

          expect(getResources(grant)).toEqual(getResources(sharedRequest));
          expect(getAccessModes(grant)).toEqual(getAccessModes(sharedRequest));
          expect(getRequestor(grant)).toEqual(getRequestor(sharedRequest));
          expect(getResourceOwner(grant)).toEqual(
            getResourceOwner(sharedRequest),
          );
          expect(getRequest(grant)).toEqual(sharedRequest.id);

          const grantedAccess = await getAccessGrantAll(
            { resource: sharedFileIri },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          // Test that looking up the access grants for the given resource returns
          // the access we just granted.
          // The issuer and query service return the grants with a slight difference
          // in the value order in arrays, so we can't use deep comparison to verify
          // if the issued grant is part of the query result set. Matching on the proofs
          // is sufficient, as proofs are generated on canonicalized datasets.
          if (returnLegacyJsonld) {
            expect(
              grantedAccess.map((matchingGrant) => matchingGrant.proof),
            ).toContainEqual((grant as AccessGrant).proof);
          }

          const sharedFile = await getFile(sharedFileIri, grant, {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          });
          await expect(sharedFile.text()).resolves.toBe(SHARED_FILE_CONTENT);

          await revokeAccessGrant(grant, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });
          expect(
            (
              await isValidAccessGrant(grant, {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                verificationEndpoint: verifierService,
              })
            ).errors,
          ).toHaveLength(1);

          const filePromise = getFile(sharedFileIri, grant, {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          });

          // After revocation getFile should throw errors
          await expect(filePromise).rejects.toThrow();

          // In particular the error should be a 403
          const fileResponse = await addUserAgent(
            requestorSession.fetch,
            TEST_USER_AGENT,
          )(sharedFileIri);
          expect(fileResponse.status).toBe(403);
        });

        it("can issue an access grant overriding an access request", async () => {
          const startTime = Date.now();
          const expirationMs = startTime + 25 * 60 * 1000;
          const grant = await approveAccessRequest(
            sharedRequest,
            {
              // Only grant a subset of the required access.
              access: { read: true },
              requestor: requestorSession.info.webId as string,
              resources: [sharedFileIri],
              // Remove the expiration date from the grant.
              expirationDate: new Date(expirationMs),
            },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });
          expect(
            grant.expirationDate && Date.parse(grant.expirationDate),
          ).toEqual(expirationMs);
          expect(getExpirationDate(grant)).toEqual(new Date(expirationMs));
          expect(["http://www.w3.org/ns/auth/acl#Read", "Read"]).toContain(
            grant.credentialSubject.providedConsent.mode[0],
          );
          expect(getAccessModes(grant)).toEqual({
            read: true,
            append: false,
            write: false,
          });
          expect(getResources(grant)).toEqual([sharedFileIri]);
          expect(getRequestor(grant)).toEqual(requestorSession.info.webId);
          expect(getResourceOwner(grant)).toEqual(ownerSession.info.webId);

          for (const type of [
            "http://www.w3.org/ns/solid/vc#SolidAccessGrant",
            "SolidAccessGrant",
            "https://www.w3.org/2018/credentials#VerifiableCredential",
            "VerifiableCredential",
          ]) {
            expect(getTypes(grant)).toContain(type);
          }

          // Check the issuance date is within 2 minutes of the start of this test
          // expect(getIssuanceDate(grant).valueOf()).toBeGreaterThan(
          //   startTime -
          //     1000 /* subtract 1000ms to allow for clock drift in testing infrastructure */,
          // );
          expect(getIssuanceDate(grant).valueOf()).toBeLessThan(
            startTime + 2 * 60 * 1000,
          );

          expect(getIssuer(grant)).toEqual(vcProvider);
          expect(getInherit(grant)).toBe(true);
          expect(getPurposes(grant)).toEqual([
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ]);
        });

        it("can issue a non-recursive access grant", async () => {
          const grant = await approveAccessRequest(
            undefined,
            {
              access: { read: true, append: true },
              requestor: requestorSession.info.webId as string,
              resources: [sharedFileIri],
              purpose: [
                "https://some.purpose/not-a-nefarious-one/i-promise",
                "https://some.other.purpose/",
              ],
              inherit: false,
            },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );
          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });
          expect(grant.credentialSubject.providedConsent.inherit).toBe(false);
        });

        it("will issue an access request, grant access to a resource, but will not update the ACR if the updateAcr flag is set to false", async () => {
          const sharedFile2Iri = await getSharedFile();
          const request = await issueAccessRequest(
            {
              access: { read: true },
              resourceOwner: ownerSession.info.webId as string,
              resources: [sharedFile2Iri],
              purpose: [
                "https://some.purpose/not-a-nefarious-one/i-promise",
                "https://some.other.purpose/",
              ],
              expirationDate: new Date(Date.now() + 60 * 60 * 1000),
            },
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );
          expect(isVerifiableCredential(request)).toBe(true);

          const grant = await approveAccessRequest(
            request,
            {},
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
              updateAcr: false,
            },
          );

          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });

          const sharedFileWithAcr = await retryAsync(() =>
            sc.acp_ess_2.getFileWithAcr(sharedFile2Iri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          if (!sc.acp_ess_2.hasAccessibleAcr(sharedFileWithAcr)) {
            throw new Error("The resource should have an accessible ACR");
          }

          expect(sc.acp_ess_2.getVcAccess(sharedFileWithAcr)).toEqual(
            // Note: All VC Access modes should be false, as we explicitly instructed the SDK to
            // not update the ACRs, and they default to false
            expect.objectContaining({
              read: false,
              write: false,
              append: false,
            }),
          );
          await deleteSharedFile(sharedFile2Iri);
        });

        it("will issue an access request, grant access to a resource, and update the ACR if the updateAcr flag is set to true", async () => {
          const request = await issueAccessRequest(
            {
              access: { read: true },
              resourceOwner: ownerSession.info.webId as string,
              resources: [sharedFileIri],
              purpose: [
                "https://some.purpose/not-a-nefarious-one/i-promise",
                "https://some.other.purpose/",
              ],
              expirationDate: new Date(Date.now() + 60 * 60 * 1000),
            },
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );
          expect(isVerifiableCredential(request)).toBe(true);

          const grant = await approveAccessRequest(
            request,
            {},
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
              updateAcr: true,
            },
          );

          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });

          const sharedFileWithAcr = await retryAsync(() =>
            sc.acp_ess_2.getFileWithAcr(sharedFileIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          if (!sc.acp_ess_2.hasAccessibleAcr(sharedFileWithAcr)) {
            throw new Error("The resource should have an accessible ACR");
          }

          expect(sc.acp_ess_2.getVcAccess(sharedFileWithAcr)).toEqual(
            // The ACR should have been updated, and the matcher should be aligned with
            // the access modes set in the Access Grant.
            expect.objectContaining({
              read: true,
              write: false,
              append: false,
            }),
          );
        });

        it("supports custom fields", async () => {
          const request = await issueAccessRequest(
            {
              access: { read: true },
              resourceOwner: "https://example.org/owner",
              resources: ["https://example.org/resource"],
              expirationDate: new Date(Date.now() + 60 * 60 * 1000),
            },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              returnLegacyJsonld: false,
              accessEndpoint: vcProvider,
              customFields: new Set([
                {
                  key: new URL("https://example.org/myProperty"),
                  value: "some value",
                },
                {
                  key: new URL("https://example.org/myRequestProperty"),
                  value: true,
                },
                {
                  key: new URL("https://example.org/myOverriddenProperty"),
                  value: "some overridden value",
                },
              ]),
            },
          );
          const grant = await approveAccessRequest(
            request,
            {
              customFields: new Set([
                {
                  key: new URL("https://example.org/myOverriddenProperty"),
                  value: "some overriding value",
                },
                {
                  key: new URL("https://example.org/myGrantProperty"),
                  value: 1,
                },
                {
                  key: new URL("https://example.org/myRequestProperty"),
                  value: undefined,
                },
              ]),
            },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              returnLegacyJsonld: false,
              accessEndpoint: vcProvider,
              updateAcr: false,
            },
          );
          const denial = await denyAccessRequest(request, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            returnLegacyJsonld: false,
            accessEndpoint: vcProvider,
            updateAcr: false,
            customFields: new Set([
              {
                key: new URL("https://example.org/myOverriddenProperty"),
                value: "some overriding value",
              },
              {
                key: new URL("https://example.org/myDenialProperty"),
                value: 1,
              },
              {
                key: new URL("https://example.org/myRequestProperty"),
                value: undefined,
              },
            ]),
          });

          expect(getRequest(denial)).toBe(request.id);

          // Check custom fields on request.
          expect(
            getCustomBoolean(
              request,
              new URL("https://example.org/myRequestProperty"),
            ),
          ).toBe(true);
          expect(
            getCustomString(request, new URL("https://example.org/myProperty")),
          ).toBe("some value");
          expect(
            getCustomString(
              request,
              new URL("https://example.org/myOverriddenProperty"),
            ),
          ).toBe("some overridden value");
          expect(getCustomFields(request)).toEqual({
            "https://example.org/myRequestProperty": true,
            "https://example.org/myProperty": "some value",
            "https://example.org/myOverriddenProperty": "some overridden value",
          });

          // Check custom fields on grant.
          expect(
            getCustomBoolean(
              grant,
              new URL("https://example.org/myRequestProperty"),
            ),
            // This should have been erased.
          ).toBeUndefined();
          expect(
            getCustomString(grant, new URL("https://example.org/myProperty")),
            // This should be unchanged
          ).toBe("some value");
          expect(
            getCustomString(
              grant,
              new URL("https://example.org/myOverriddenProperty"),
            ),
            // This should be overridden
          ).toBe("some overriding value");
          expect(
            getCustomInteger(
              grant,
              new URL("https://example.org/myGrantProperty"),
            ),
          ).toBe(1);
          expect(getCustomFields(grant)).toEqual({
            "https://example.org/myGrantProperty": 1,
            "https://example.org/myProperty": "some value",
            "https://example.org/myOverriddenProperty": "some overriding value",
          });

          // Check custom fields on denial.
          expect(
            getCustomBoolean(
              denial,
              new URL("https://example.org/myRequestProperty"),
            ),
            // This should have been erased.
          ).toBeUndefined();
          expect(
            getCustomString(grant, new URL("https://example.org/myProperty")),
            // This should be unchanged
          ).toBe("some value");
          expect(
            getCustomString(
              denial,
              new URL("https://example.org/myOverriddenProperty"),
            ),
            // This should be overridden
          ).toBe("some overriding value");
          expect(
            getCustomInteger(
              denial,
              new URL("https://example.org/myDenialProperty"),
            ),
          ).toBe(1);
          expect(getCustomFields(denial)).toEqual({
            "https://example.org/myDenialProperty": 1,
            "https://example.org/myProperty": "some value",
            "https://example.org/myOverriddenProperty": "some overriding value",
          });
        });

        it("can issue an Access Grant without a request", async () => {
          const expirationDate = new Date(Date.now() + 60 * 60 * 1000);
          const grant = await issueAccessGrant(
            {
              access: { read: true },
              requestor: "https://example.org/requestor",
              resources: ["https://example.org/resource"],
              expirationDate,
              customFields: new Set([
                {
                  key: new URL("https://example.org/myGrantProperty"),
                  value: 1,
                },
              ]),
            },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });

          expect(getResources(grant)).toEqual(["https://example.org/resource"]);
          expect(getAccessModes(grant)).toEqual({
            read: true,
            write: false,
            append: false,
          });
          expect(getRequestor(grant)).toBe("https://example.org/requestor");
          expect(getExpirationDate(grant)).toEqual(expirationDate);
          expect(
            getCustomInteger(
              grant,
              new URL("https://example.org/myGrantProperty"),
            ),
          ).toBe(1);
          expect(getCustomFields(grant)).toEqual({
            "https://example.org/myGrantProperty": 1,
          });
        });
      });

      describe("access request, deny flow", () => {
        it("can issue an access grant denying an access request", async () => {
          const grant = await denyAccessRequest(sharedRequest, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          });

          await expect(
            isValidAccessGrant(grant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] });

          expect(grant.expirationDate).toBeDefined();

          const filePromise = getFile(sharedFileIri, grant, {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          });

          // After revocation getFile should throw errors
          await expect(filePromise).rejects.toThrow();

          // In particular the error should be a 403
          const fileResponse = await addUserAgent(
            requestorSession.fetch,
            TEST_USER_AGENT,
          )(sharedFileIri);
          expect(fileResponse.status).toBe(403);

          // Retrieving the grant should still be possible:
          const retrievedGrant = await getAccessGrant(grant.id, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });
          toBeEqual(retrievedGrant, grant);
        });
      });

      describe("resource owner interaction with VC provider", () => {
        let sharedFilterTestIri: string;
        let accessGrant: AccessGrant;
        let denyGrant: VerifiableCredential;
        beforeAll(async () => {
          sharedFilterTestIri = await getSharedFile();

          const request = await retryAsync(() =>
            issueAccessRequest(
              {
                access: { read: true, write: true, append: true },
                resourceOwner: ownerSession.info.webId as string,
                resources: [sharedFilterTestIri],
                purpose: [
                  "https://some.purpose/not-a-nefarious-one/i-promise",
                  "https://some.other.purpose/",
                ],
                expirationDate: new Date(Date.now() + 60 * 60 * 1000),
              },
              {
                fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          );

          [accessGrant, denyGrant] = await Promise.all([
            retryAsync(() =>
              approveAccessRequest(
                request,
                {},
                {
                  fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                  accessEndpoint: vcProvider,
                },
              ),
            ),
            retryAsync(() =>
              denyAccessRequest(request.id, {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              }),
            ),
          ]);
        });

        afterAll(async () => {
          await deleteSharedFile(sharedFilterTestIri);
          await retryAsync(() =>
            revokeAccessGrant(accessGrant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
        });

        it("can filter VCs held by the service based on requestor", async () => {
          const allGrants = getAccessGrantAll(
            {
              requestor: requestorSession.info.webId as string,
              resource: sharedFilterTestIri,
            },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          // There should be at least one grant
          await expect(allGrants).resolves.not.toHaveLength(0);

          // There should be exactly one grant once we filter out grants
          // that target the pod root
          await expect(
            allGrants.then((grants) =>
              grants.filter(
                (grant) =>
                  !getResources(grant as any).includes(resourceOwnerPod),
              ),
            ),
          ).resolves.toHaveLength(1);

          await expect(
            getAccessGrantAll(
              {
                requestor: "https://some.unknown.requestor",
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          ).resolves.toHaveLength(0);
        });

        it("can filter VCs held by the service based on target resource", async () => {
          const allGrants = getAccessGrantAll(
            { resource: sharedFilterTestIri },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );
          // There should be at least one grant
          await expect(allGrants).resolves.not.toHaveLength(0);

          // There should be exactly one grant once we filter out grants
          // that target the pod root
          await expect(
            allGrants.then((grants) =>
              grants.filter(
                (grant) =>
                  !getResources(grant as any).includes(resourceOwnerPod),
              ),
            ),
          ).resolves.toHaveLength(1);
          await expect(
            getAccessGrantAll(
              { resource: "https://some.unkown.resource" },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          ).resolves.toHaveLength(0);
        });

        it("can filter VCs held by the service based on status", async () => {
          const [granted, denied, both, unspecified] = await Promise.all([
            getAccessGrantAll(
              {
                status: "granted",
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              {
                status: "denied",
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              { status: "all", resource: sharedFilterTestIri },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              { resource: sharedFilterTestIri },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          ]);

          // Currently not specifying the status should be equivalent to setting it to granted
          expect(unspecified).toHaveLength(granted.length);

          // There should be at least one grant
          expect(granted).not.toHaveLength(0);

          // There should be exactly one grant once we filter out grants
          // that target the pod root
          expect(
            granted.filter(
              (grant) => !getResources(grant as any).includes(resourceOwnerPod),
            ),
          ).toHaveLength(1);

          expect(denied).toHaveLength(1);
          expect(both).toHaveLength(granted.length + denied.length);

          toBeEqual(denied[0], {
            ...denyGrant,
            credentialSubject: {
              ...denyGrant.credentialSubject,
              providedConsent: {
                ...(denyGrant.credentialSubject.providedConsent as any),
                forPersonalData: (
                  denyGrant.credentialSubject.providedConsent as any
                ).forPersonalData,
              },
            },
          });
        });

        it("can filter VCs held by the service based on purpose", async () => {
          const [
            noPurposeFilter,
            partialPurposeFilter,
            otherPartialPurposeFilter,
            bothPurposeFilter,
            unknownPurposeFilter,
          ] = await Promise.all([
            getAccessGrantAll(
              { resource: sharedFilterTestIri },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              {
                purpose: ["https://some.purpose/not-a-nefarious-one/i-promise"],
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              {
                purpose: ["https://some.other.purpose/"],
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              {
                purpose: [
                  "https://some.purpose/not-a-nefarious-one/i-promise",
                  "https://some.other.purpose/",
                ],
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
            getAccessGrantAll(
              {
                purpose: ["https://some.unknown.purpose/"],
                resource: sharedFilterTestIri,
              },
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          ]);

          // All filters should return a result except for the last one.
          expect(noPurposeFilter.length).toBeGreaterThan(0);
          expect(partialPurposeFilter.length).toBeGreaterThan(0);
          expect(otherPartialPurposeFilter.length).toBeGreaterThan(0);
          expect(bothPurposeFilter.length).toBeGreaterThan(0);
          expect(unknownPurposeFilter).toHaveLength(0);
          // The unfiltered results should contain the other ones
          // Note that we serialize the VCs to avoid comparing by reference
          expect(
            bothPurposeFilter.every((vc) =>
              noPurposeFilter
                .map((vcNoPurpose) => JSON.stringify(vcNoPurpose))
                .includes(JSON.stringify(vc)),
            ),
          ).toBe(true);
          // Filtering on both purposes should include the results filtered on individual purposes
          expect(
            partialPurposeFilter.every((vc) =>
              bothPurposeFilter
                .map((vcWithPurpose) => JSON.stringify(vcWithPurpose))
                .includes(JSON.stringify(vc)),
            ),
          ).toBe(true);
          expect(
            otherPartialPurposeFilter.every((vc) =>
              bothPurposeFilter
                .map((vcWithPurpose) => JSON.stringify(vcWithPurpose))
                .includes(JSON.stringify(vc)),
            ),
          ).toBe(true);
        });
      });

      describe("requestor can use the resource Dataset APIs to interact with Datasets", () => {
        let accessGrant: AccessGrant;
        let testResourceIri: string;
        let testContainerIri: string;
        let testContainerIriChild: string;

        beforeEach(async () => {
          const testContainer = await retryAsync(() =>
            sc.createContainerInContainer(resourceOwnerPod, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
          testContainerIri = sc.getSourceUrl(testContainer);

          const newThing = sc.setStringNoLocale(
            sc.createThing({
              name: "e2e-test-thing",
            }),
            "https://arbitrary.vocab/regular-predicate",
            "initial-dataset",
          );

          const dataset = sc.setThing(sc.createSolidDataset(), newThing);

          const persistedDataset = await retryAsync(() =>
            sc.saveSolidDatasetInContainer(testContainerIri, dataset, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          testResourceIri = sc.getSourceUrl(persistedDataset);

          const request = await retryAsync(() =>
            issueAccessRequest(
              {
                access: { read: true, write: true, append: true },
                resourceOwner: ownerSession.info.webId as string,
                resources: [testResourceIri, testContainerIri],
                purpose: [
                  "https://some.purpose/not-a-nefarious-one/i-promise",
                  "https://some.other.purpose/",
                ],
                expirationDate: new Date(Date.now() + 60 * 60 * 1000),
              },
              {
                fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          );

          accessGrant = await retryAsync(() =>
            approveAccessRequest(
              request,
              {},
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          );
        });

        afterEach(async () => {
          await retryAsync(() =>
            revokeAccessGrant(accessGrant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          await retryAsync(() =>
            sc.deleteFile(testResourceIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          const testContainer = await retryAsync(() =>
            sc.getSolidDataset(testContainerIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
          // Iterate over the contained resources because the IRI of some child resources
          // is unknown.
          await Promise.all(
            sc.getContainedResourceUrlAll(testContainer).map((childUrl) =>
              retryAsync(() =>
                sc.deleteSolidDataset(childUrl, {
                  fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                }),
              ),
            ),
          );
        });

        it("can use the getSolidDataset API to fetch an existing dataset", async () => {
          const ownerDataset = await sc.getSolidDataset(testResourceIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          const requestorDataset = await getSolidDataset(
            testResourceIri,
            accessGrant,
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            },
          );

          const ownerTtl = await sc.solidDatasetAsTurtle(ownerDataset);
          const requestorTtl = await sc.solidDatasetAsTurtle(requestorDataset);

          expect(ownerTtl).toBe(requestorTtl);
        });

        it("can use the saveSolidDatasetAt API for an existing dataset", async () => {
          // Here we request the dataset as the resource owner, but in real-world
          // applications, you'd need to use an Access Grant to request the dataset
          // as the requestor, this is just to limit how much of the Access Grants
          // library we're testing in a single test case:
          const dataset = await sc.getSolidDataset(testResourceIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          // Create a thing and add it to the dataset:
          let newThing = sc.createThing({
            name: "e2e-test-thing",
          });
          newThing = sc.setBoolean(
            newThing,
            "https://arbitrary.vocab/regular-predicate",
            true,
          );
          const datasetUpdate = sc.setThing(dataset, newThing);

          // Try to update the dataset as a requestor of the Access Grant:
          const updatedDataset = await saveSolidDatasetAt(
            testResourceIri,
            datasetUpdate,
            accessGrant,
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            },
          );

          // Fetch it back as the owner to prove the dataset was actually updated:
          const updatedDatasetAsOwner = await sc.getSolidDataset(
            testResourceIri,
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            },
          );

          // Serialize each to turtle:
          const updatedDatasetTtl =
            await sc.solidDatasetAsTurtle(updatedDataset);
          const existingDatasetAsOwnerTtl =
            await sc.solidDatasetAsTurtle(dataset);
          const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
            updatedDatasetAsOwner,
          );

          // Assert that the dataset changed:
          expect(updatedDatasetTtl).not.toBe(existingDatasetAsOwnerTtl);
          expect(updatedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
        });

        it("can use the createContainerInContainer API to create a new container", async () => {
          const newChildContainer = await createContainerInContainer(
            testContainerIri,
            accessGrant,
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            },
          );

          const parentContainer = await retryAsync(() =>
            sc.getSolidDataset(testContainerIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
          const parentContainerContainsAll = sc.getUrlAll(
            sc.getThing(
              parentContainer,
              sc.getSourceUrl(parentContainer),
            ) as sc.Thing,
            "http://www.w3.org/ns/ldp#contains",
          );
          testContainerIriChild = sc.getSourceUrl(newChildContainer);

          const match = parentContainerContainsAll.filter((childUrl) => {
            return childUrl === testContainerIriChild;
          });

          expect(match).toHaveLength(1);
        });

        it("can use the saveSolidDatasetInContainer API for an existing dataset", async () => {
          // Need to delete dataset that was already created in test setup,
          // such that our test can create an empty dataset at `testFileIri`.
          await sc.deleteFile(testResourceIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          const testDataset = sc.createSolidDataset();
          const savedDataset = await saveSolidDatasetInContainer(
            testContainerIri,
            testDataset,
            accessGrant,
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            },
          );

          const datasetInPodAsResourceOwner = await sc.getSolidDataset(
            sc.getSourceIri(savedDataset),
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            },
          );

          // We cannot request the newly created dataset using our existing Access
          // Grant because of ACR inheritance. When we delete the file containing
          // the dataset at the start of this testcase it also deletes the datasets'
          // ACRs, so this test case will fail (SDK-2792).

          // const datasetInPodAsRequestor = await
          // getSolidDataset( testFileIri, accessGrant,
          //   {
          //     fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          //   }
          // );

          const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
            datasetInPodAsResourceOwner,
          );
          const savedDatasetTtl = await sc.solidDatasetAsTurtle(savedDataset);
          expect(savedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
        });
      });

      describe("requestor can use the resource File APIs to interact with resources", () => {
        let accessGrant: DatasetWithId;
        let testFileIri: string;
        let testContainerIri: string;
        let fileContents: Blob;

        beforeEach(async () => {
          try {
            const fileApisContainer = await sc.createContainerInContainer(
              resourceOwnerPod,
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              },
            );
            testContainerIri = sc.getSourceIri(fileApisContainer);

            fileContents = new Blob(["hello world"]);

            const uploadedFile = await sc.saveFileInContainer(
              testContainerIri,
              fileContents,
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              },
            );

            testFileIri = sc.getSourceIri(uploadedFile);

            const request = await issueAccessRequest(
              {
                access: { read: true, write: true, append: true },
                resources: [testContainerIri, testFileIri],
                resourceOwner: ownerSession.info.webId as string,
                expirationDate: new Date(Date.now() + 60 * 60 * 1000),
              },
              {
                fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
                returnLegacyJsonld: false,
              },
            );

            accessGrant = await approveAccessRequest(
              request,
              {},
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
                updateAcr: false,
                returnLegacyJsonld: false,
              },
            );
            console.log(
              `Issued Access Grant ${accessGrant} as ${ownerSession.info.webId}`,
            );
          } catch (e) {
            console.error(`An error occurred: ${e}`);
          }
        });

        afterEach(async () => {
          try {
            await revokeAccessGrant(accessGrant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            });
          } catch (e) {
            // Allow console statement as this is useful to capture, either
            // running tests locally or in CI.

            console.error(
              `Revoking the Access Grant ${accessGrant} as ${ownerSession.info.webId} failed: ${e}`,
            );
          }
          const testContainer = await retryAsync(() =>
            sc.getSolidDataset(testContainerIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
          // Iterate over the contained resources because the IRI of some child resources
          // is unknown.
          await Promise.all(
            sc.getContainedResourceUrlAll(testContainer).map((childUrl) =>
              retryAsync(() =>
                sc.deleteFile(childUrl, {
                  fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
                }),
              ),
            ),
          );

          await retryAsync(() =>
            sc.deleteContainer(testContainerIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
        });

        const fileContentMatrix: [string, File | NodeFile | Blob][] = [
          ["Blob", new Blob(["new contents"])],
          ["Node File", new NodeFile(["new contents"], "file.txt")],
        ];

        const overwrittenContentMatrix: [string, Blob | File | NodeFile][] = [
          ["Blob", new Blob(["overwritten contents"])],
          ["Node File", new NodeFile(["overwritten contents"], "file.txt")],
        ];

        describe.each(fileContentMatrix)(`Using %s`, (__, newFileContents) => {
          it("can use the saveFileInContainer API to create a new file", async () => {
            const newFile = await saveFileInContainer(
              testContainerIri,
              newFileContents,
              accessGrant,
              {
                fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
              },
            );

            await expect(newFile.text()).resolves.toBe(
              await newFileContents.text(),
            );

            // Verify as the resource owner that the file was actually created:
            const fileAsResourceOwner = await sc.getFile(
              sc.getSourceUrl(newFile),
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              },
            );

            await expect(fileAsResourceOwner.text()).resolves.toBe(
              await newFileContents.text(),
            );
          });
        });

        it("can use the getFile API to get an existing file", async () => {
          // Try fetching it as the requestor of the access grant:
          const existingFile = await getFile(testFileIri, accessGrant, {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          });

          expect(sc.getSourceUrl(existingFile)).toBe(testFileIri);
          await expect(existingFile.text()).resolves.toBe(
            await fileContents.text(),
          );
        });

        describe.each(overwrittenContentMatrix)(
          `Using %s`,
          (__, newFileContents) => {
            it("can use the overwriteFile API to replace an existing file", async () => {
              const newFile = await overwriteFile(
                testFileIri,
                newFileContents,
                accessGrant,
                {
                  fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
                },
              );

              await expect(newFile.text()).resolves.toBe(
                await newFileContents.text(),
              );
              expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

              // Verify as the resource owner that the file was actually overwritten:
              const fileAsResourceOwner = await sc.getFile(testFileIri, {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              });

              await expect(fileAsResourceOwner.text()).resolves.toBe(
                await newFileContents.text(),
              );
            });
          },
        );
      });

      describeIf(
        environmentFeatures?.RECURSIVE_ACCESS_GRANTS === "true" ||
          environmentFeatures?.RECURSIVE_ACCESS_GRANTS === true,
      )("recursive access grants support", () => {
        let accessRequest: AccessRequest;
        let accessGrant: AccessGrant;
        let testFileIri: string;
        let testContainerIri: string;
        const testFileContent = "This is a test.";

        beforeEach(async () => {
          const testContainer = await retryAsync(() =>
            sc.createContainerInContainer(resourceOwnerPod, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
          testContainerIri = sc.getSourceUrl(testContainer);

          const testFile = await retryAsync(() =>
            sc.saveFileInContainer(
              testContainerIri,
              new Blob([testFileContent]),
              {
                fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              },
            ),
          );
          testFileIri = sc.getSourceUrl(testFile);

          accessRequest = await retryAsync(() =>
            issueAccessRequest(
              {
                access: { read: true, write: true, append: true },
                resourceOwner: ownerSession.info.webId as string,
                // Note that access is only requested for the container, not the contained file.
                resources: [testContainerIri],
                purpose: [
                  "https://some.purpose/not-a-nefarious-one/i-promise",
                  "https://some.other.purpose/",
                ],
                expirationDate: new Date(Date.now() + 60 * 60 * 1000),
              },
              {
                fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
                accessEndpoint: vcProvider,
              },
            ),
          );
        });

        afterEach(async () => {
          await retryAsync(() =>
            revokeAccessGrant(accessGrant, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          await retryAsync(() =>
            sc.deleteFile(testFileIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );

          await retryAsync(() =>
            sc.deleteContainer(testContainerIri, {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            }),
          );
        });

        // Only enable this test in environments supporting recursive access grants
        it("can access a contained resource with a recursive Access Grant", async () => {
          accessGrant = await approveAccessRequest(
            accessRequest,
            // Access is granted to the target container and all contained resources.
            { inherit: true },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );
          const requestorFile = await getFile(testFileIri, accessGrant, {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          });

          await expect(requestorFile.text()).resolves.toBe(testFileContent);

          // Lookup grants for the target resource, while it has been issued for the container.
          const grants = await getAccessGrantAll(
            { resource: testFileIri },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            },
          );
          expect(grants.map((grant) => grant.proof)).toContainEqual(
            accessGrant.proof,
          );
        });

        it("cannot access a contained resource with a non-recursive Access Grant", async () => {
          accessGrant = await approveAccessRequest(
            accessRequest,
            // Access is granted to the target container only.
            { inherit: false },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          await expect(
            getFile(testFileIri, accessGrant, {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            }),
          ).rejects.toThrow();

          // Lookup grants for the target resource, while it has been issued for the container.
          // There should be no matching grant, because the issued grant is not recursive.
          const grants = await getAccessGrantAll(
            { resource: testFileIri },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            },
          );
          expect(grants).not.toContainEqual(accessGrant);
        });

        it("can use the overwriteFile API to create a new file", async () => {
          // Delete the existing file as to be able to save a new file:
          await sc.deleteFile(testFileIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          accessGrant = await approveAccessRequest(
            accessRequest,
            // Access is granted to the target container and all contained resources.
            { inherit: true },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          const newFileContents = new Blob(["overwritten contents"]);

          const newFile = await overwriteFile(
            testFileIri,
            newFileContents,
            accessGrant,
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            },
          );

          await expect(newFile.text()).resolves.toBe(
            await newFileContents.text(),
          );
          expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

          // Verify as the resource owner that the file was actually created:
          const fileAsResourceOwner = await sc.getFile(testFileIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          await expect(fileAsResourceOwner.text()).resolves.toBe(
            await newFileContents.text(),
          );
        });

        it("can use the saveSolidDatasetAt API for a new dataset", async () => {
          accessGrant = await approveAccessRequest(
            accessRequest,
            // Access is granted to the target container and all contained resources.
            { inherit: true },
            {
              fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          );

          await sc.deleteFile(testFileIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          const dataset = sc.createSolidDataset();
          const newDatasetIri = testFileIri;

          const updatedDataset = await saveSolidDatasetAt(
            newDatasetIri,
            dataset,
            accessGrant,
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            },
          );

          // Fetch it back as the owner to prove the dataset was actually created:
          const updatedDatasetAsOwner = await sc.getSolidDataset(testFileIri, {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
          });

          // Serialize each to turtle:
          const updatedDatasetTtl =
            await sc.solidDatasetAsTurtle(updatedDataset);
          const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
            updatedDatasetAsOwner,
          );

          // Assert that the dataset was created correctly:
          expect(updatedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
        });
      });
    },
  );

  describeIf(environmentFeatures?.QUERY_ENDPOINT === "true")(
    "query endpoint",
    () => {
      it("can navigate the paginated results", async () => {
        const allCredentialsPageOne = await query(
          {
            pageSize: 2,
            type: "SolidAccessGrant",
            issuedWithin: "P1D",
          },
          {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            // FIXME add query endpoint discovery check.
            queryEndpoint: new URL("query", vcProvider),
          },
        );
        // We should get the expected page length.
        expect(allCredentialsPageOne.items.length).toBeLessThanOrEqual(200);
        // The first page should not have a "prev" link.
        expect(allCredentialsPageOne.prev).toBeUndefined();
        expect(allCredentialsPageOne.next).toBeDefined();

        // Go to the next result page
        const allCredentialsPageTwo = await query(allCredentialsPageOne.next!, {
          fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          // FIXME add query endpoint discovery check.
          queryEndpoint: new URL("query", vcProvider),
        });
        expect(allCredentialsPageTwo.items.length).toBeLessThanOrEqual(200);
      });

      it("can filter based on one or more criteria", async () => {
        const onType = await query(
          { type: "SolidAccessGrant", issuedWithin: "P1D" },
          {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            // FIXME add query endpoint discovery check.
            queryEndpoint: new URL("query", vcProvider),
          },
        );
        expect(onType.items).not.toHaveLength(0);
        const onTypeAndStatus = await query(
          {
            type: "SolidAccessGrant",
            status: "Active",
            issuedWithin: DURATION.ONE_DAY,
          },
          {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            // FIXME add query endpoint discovery check.
            queryEndpoint: new URL("query", vcProvider),
          },
        );
        expect(onTypeAndStatus.items).not.toHaveLength(0);
        expect(onTypeAndStatus.items.length).toBeLessThanOrEqual(
          onType.items.length,
        );
      });

      it("can iterate through pages", async () => {
        const pages = paginatedQuery(
          {
            pageSize: 2,
            type: "SolidAccessRequest",
            issuedWithin: "P1D",
          },
          {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            // FIXME add query endpoint discovery check.
            queryEndpoint: new URL("query", vcProvider),
          },
        );
        for await (const page of pages) {
          expect(page.items).not.toHaveLength(0);
        }
      }, 120_000);

      it("shows updated status for an approved request", async () => {
        // Issue an Access Request.
        const request = await issueAccessRequest(
          {
            access: { read: true },
            resourceOwner: ownerSession.info.webId as string,
            resources: [sharedFileIri],
            expirationDate: new Date(Date.now() + 60 * 60 * 1000),
          },
          {
            fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
            updateAcr: false,
            returnLegacyJsonld: false,
          },
        );
        const pendingRequests = () =>
          paginatedQuery(
            { status: "Pending", issuedWithin: "P1D" },
            {
              fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
              queryEndpoint: new URL("query", vcProvider),
            },
          );
        let foundRequest = false;
        for await (const page of pendingRequests()) {
          if (page.items.map((item) => item.id).includes(request.id)) {
            foundRequest = true;
            break;
          }
        }
        expect(foundRequest).toBe(true);
        await approveAccessRequest(
          request,
          {},
          {
            fetch: addUserAgent(ownerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
            updateAcr: false,
            returnLegacyJsonld: false,
          },
        );
        // Check the request status has been updated and is no longer "Pending"
        foundRequest = false;
        for await (const page of pendingRequests()) {
          if (page.items.map((item) => item.id).includes(request.id)) {
            foundRequest = true;
            break;
          }
        }
        expect(foundRequest).toBe(false);
      });
    },
  );
});
