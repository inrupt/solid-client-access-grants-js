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

// Globals are actually not injected, so this does not shadow anything.
import { File as NodeFile } from "buffer";
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { Session } from "@inrupt/solid-client-authn-node";
import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  getNodeTestingEnvironment,
  getAuthenticatedSession,
} from "@inrupt/internal-test-env";
// Making a named import here to avoid confusion with the wrapped functions from
// the access grant API
import * as sc from "@inrupt/solid-client";
import { custom } from "openid-client";
import type { AccessGrant, AccessRequest } from "../../src/index";
import {
  approveAccessRequest,
  createContainerInContainer,
  denyAccessRequest,
  getAccessApiEndpoint,
  getAccessGrantAll,
  getFile,
  getSolidDataset,
  issueAccessRequest,
  isValidAccessGrant,
  overwriteFile,
  revokeAccessGrant,
  saveFileInContainer,
  saveSolidDatasetAt,
  saveSolidDatasetInContainer,
} from "../../src/index";

async function retryAsync<T>(
  callback: () => Promise<T>,
  maxRetries = 5,
  interval = 5_000,
): Promise<T> {
  let tries = 0;
  const errors: Error[] = [];
  while (tries < maxRetries) {
    try {
      // The purpose here is to retry an async operation, not to parallelize.
      // Awaiting the callback will throw on error before returning.
      // eslint-disable-next-line no-await-in-loop
      return await callback();
    } catch (e: unknown) {
      errors.push(e as Error);
      tries += 1;
      // eslint-disable-next-line no-await-in-loop
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
  vcProvider: true,
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
/* eslint-disable jest/no-standalone-expect */

// For some reason, the Node jest runner throws an undefined error when
// calling to btoa. This overrides it, while keeping the actual code
// environment-agnostic.
if (!global.btoa) {
  global.btoa = (data: string) => Buffer.from(data).toString("base64");
}

// This is the content of the file uploaded manually at SHARED_FILE_IRI.
const SHARED_FILE_CONTENT = "Some content.\n";

const nodeVersion = process.versions.node.split(".");
const nodeMajor = Number(nodeVersion[0]);

async function toString(input: File | NodeFile | Buffer): Promise<string> {
  if (input instanceof Buffer) return input.toString("utf-8");

  return input.text();
}

describe(`End-to-end access grant tests for environment [${environment}]`, () => {
  let sharedFileIri: string;

  const requestorSession = new Session();
  let resourceOwnerSession: Session;
  let resourceOwnerPod: string;
  let vcProvider: string;

  async function getSharedFile() {
    // setup the shared file
    const savedFile = await retryAsync(() =>
      sc.saveFileInContainer(
        resourceOwnerPod,
        Buffer.from(SHARED_FILE_CONTENT),
        {
          fetch: addUserAgent(
            addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
          addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          TEST_USER_AGENT,
        ),
      }),
    );
  }

  beforeAll(async () => {
    // Log both sessions in.
    await retryAsync(() =>
      requestorSession.login({
        oidcIssuer,
        clientId: clientCredentials?.requestor?.id,
        clientSecret: clientCredentials?.requestor?.secret,
        // Note that currently, using a Bearer token (as opposed to a DPoP one)
        // is required for the UMA access token to be usable.
        tokenType: "Bearer",
      }),
    );
    resourceOwnerSession = await retryAsync(() => getAuthenticatedSession(env));

    // Create a file in the resource owner's Pod
    const resourceOwnerPodAll = await retryAsync(() =>
      sc.getPodUrlAll(resourceOwnerSession.info.webId as string),
    );
    if (resourceOwnerPodAll.length === 0) {
      throw new Error(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root.",
      );
    }
    [resourceOwnerPod] = resourceOwnerPodAll;

    vcProvider = await retryAsync(() => getAccessApiEndpoint(resourceOwnerPod));

    sharedFileIri = await getSharedFile();
  });

  afterAll(async () => {
    await deleteSharedFile(sharedFileIri);
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await Promise.all([
      requestorSession.logout(),
      resourceOwnerSession.logout(),
    ]);
  });

  describe("access request, grant and exercise flow", () => {
    it("can issue an access request, grant access to a resource, and revoke the granted access", async () => {
      const request = await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [sharedFileIri],
          purpose: [
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ],
          expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      await expect(
        isValidAccessGrant(grant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: new URL("verify", vcProvider).href,
        }),
      ).resolves.toMatchObject({ errors: [] });

      const grantedAccess = await getAccessGrantAll(sharedFileIri, undefined, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        accessEndpoint: vcProvider,
      });

      // Test that looking up the access grants for the given resource returns
      // the access we just granted.
      // The issuer and query service return the grants with a slight difference
      // in the value order in arrays, so we can't use deep comparison to verify
      // if the issued grant is part of the query result set. Matching on the proofs
      // is sufficient, as proofs are generated on canonicalized datasets.
      expect(
        grantedAccess.map((matchingGrant) => matchingGrant.proof),
      ).toContainEqual(grant.proof);

      const sharedFile = await getFile(sharedFileIri, grant, {
        fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
      });
      await expect(sharedFile.text()).resolves.toBe(SHARED_FILE_CONTENT);

      await revokeAccessGrant(grant, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });
      expect(
        (
          await isValidAccessGrant(grant, {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            // FIXME: Ditto verification endpoint discovery.
            verificationEndpoint: new URL("verify", vcProvider).href,
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
      const expirationDate = new Date(Date.now() + 120 * 60 * 1000);
      const request = await issueAccessRequest(
        {
          access: { read: true, append: true },
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [sharedFileIri],
          purpose: [
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ],
          expirationDate,
        },
        {
          fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      const expirationMs = Date.now() + 55 * 60 * 10000;

      const grant = await approveAccessRequest(
        request,
        {
          // Only grant a subset of the required access.
          access: { read: true },
          requestor: requestorSession.info.webId as string,
          resources: [sharedFileIri],
          // Remove the expiration date from the grant.
          expirationDate: new Date(expirationMs),
        },
        {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      await expect(
        isValidAccessGrant(grant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: new URL("verify", vcProvider).href,
        }),
      ).resolves.toMatchObject({ errors: [] });
      expect(grant.expirationDate && Date.parse(grant.expirationDate)).toEqual(
        expirationMs,
      );
      expect(["http://www.w3.org/ns/auth/acl#Read", "Read"]).toContain(
        grant.credentialSubject.providedConsent.mode[0],
      );
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );
      await expect(
        isValidAccessGrant(grant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: new URL("verify", vcProvider).href,
        }),
      ).resolves.toMatchObject({ errors: [] });
      expect(grant.credentialSubject.providedConsent.inherit).toBe(false);
    });

    it("will issue an access request, grant access to a resource, but will not update the ACR if the updateAcr flag is set to false", async () => {
      const sharedFile2Iri = await getSharedFile();
      const request = await issueAccessRequest(
        {
          access: { read: true },
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [sharedFile2Iri],
          purpose: [
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ],
          expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
          updateAcr: false,
        },
      );

      await expect(
        isValidAccessGrant(grant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: new URL("verify", vcProvider).href,
        }),
      ).resolves.toMatchObject({ errors: [] });

      const sharedFileWithAcr = await retryAsync(() =>
        sc.acp_ess_2.getFileWithAcr(sharedFile2Iri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [sharedFileIri],
          purpose: [
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ],
          expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
          updateAcr: true,
        },
      );

      await expect(
        isValidAccessGrant(grant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: new URL("verify", vcProvider).href,
        }),
      ).resolves.toMatchObject({ errors: [] });

      const sharedFileWithAcr = await retryAsync(() =>
        sc.acp_ess_2.getFileWithAcr(sharedFileIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
  });

  describe("access request, deny flow", () => {
    it("can issue an access grant denying an access request", async () => {
      // Request a 2hr grant
      const expirationMs = Date.now() + 120 * 60 * 1000;
      const expirationDate = new Date(expirationMs);
      const request: VerifiableCredential = await issueAccessRequest(
        {
          access: { read: true, append: true },
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [sharedFileIri],
          purpose: [
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ],
          expirationDate,
        },
        {
          fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      const grant = await denyAccessRequest(
        resourceOwnerSession.info.webId as string,
        request,
        {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      await expect(
        isValidAccessGrant(grant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: new URL("verify", vcProvider).href,
        }),
      ).resolves.toMatchObject({ errors: [] });

      if (env.environment !== "ESS Dev-2-2") {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(grant.expirationDate).toBeUndefined();
      }

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
            resourceOwner: resourceOwnerSession.info.webId as string,
            resources: [sharedFilterTestIri],
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
            expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
              fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
              accessEndpoint: vcProvider,
            },
          ),
        ),
        retryAsync(() =>
          denyAccessRequest(request.id, {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          }),
        ),
      ]);
    });

    afterAll(async () => {
      await deleteSharedFile(sharedFilterTestIri);
      await retryAsync(() =>
        revokeAccessGrant(accessGrant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
    });

    it("can filter VCs held by the service based on requestor", async () => {
      await expect(
        getAccessGrantAll(
          sharedFilterTestIri,
          { requestor: requestorSession.info.webId as string },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
      ).resolves.not.toHaveLength(0);
      await expect(
        getAccessGrantAll(
          sharedFilterTestIri,
          { requestor: "https://some.unknown.requestor" },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
      ).resolves.toHaveLength(0);
    });

    it("can filter VCs held by the service based on target resource", async () => {
      await expect(
        getAccessGrantAll(sharedFilterTestIri, undefined, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        }),
      ).resolves.not.toHaveLength(0);
      await expect(
        getAccessGrantAll("https://some.unkown.resource", undefined, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        }),
      ).resolves.toHaveLength(0);
    });

    it("can filter VCs held by the service based on status", async () => {
      const [granted, denied, both, unspecified] = await Promise.all([
        getAccessGrantAll(
          sharedFilterTestIri,
          {
            status: "granted",
          },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
        getAccessGrantAll(
          sharedFilterTestIri,
          {
            status: "denied",
          },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
        getAccessGrantAll(
          sharedFilterTestIri,
          { status: "all" },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
        getAccessGrantAll(
          sharedFilterTestIri,
          {},
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
      ]);

      // Currently not specifying the status should be equivalent to setting it to granted
      expect(unspecified).toHaveLength(granted.length);
      expect(granted).toHaveLength(1);
      expect(denied).toHaveLength(1);
      expect(both).toHaveLength(granted.length + denied.length);

      expect(denied).toMatchObject([
        {
          ...denyGrant,
          credentialSubject: {
            ...denyGrant.credentialSubject,
            providedConsent: {
              ...(denyGrant.credentialSubject.providedConsent as any),
              forPersonalData: [
                (denyGrant.credentialSubject.providedConsent as any)
                  .forPersonalData,
              ],
            },
          },
        },
      ]);
    });

    it("can filter VCs held by the service based on purpose", async () => {
      const [
        noPurposeFilter,
        partialPurposeFilter,
        otherPartialPurposeFilter,
        bothPurposeFilter,
        unknownPurposeFilter,
      ] = await Promise.all([
        getAccessGrantAll(sharedFilterTestIri, undefined, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        }),
        getAccessGrantAll(
          sharedFilterTestIri,
          { purpose: ["https://some.purpose/not-a-nefarious-one/i-promise"] },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
        getAccessGrantAll(
          sharedFilterTestIri,
          { purpose: ["https://some.other.purpose/"] },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
        getAccessGrantAll(
          sharedFilterTestIri,
          {
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
          },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
        getAccessGrantAll(
          sharedFilterTestIri,
          { purpose: ["https://some.unknown.purpose/"] },
          {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );

      testResourceIri = sc.getSourceUrl(persistedDataset);

      const request = await retryAsync(() =>
        issueAccessRequest(
          {
            access: { read: true, write: true, append: true },
            resourceOwner: resourceOwnerSession.info.webId as string,
            resources: [testResourceIri, testContainerIri],
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
            expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
      );
    });

    afterEach(async () => {
      await retryAsync(() =>
        revokeAccessGrant(accessGrant, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );

      await retryAsync(() =>
        sc.deleteFile(testResourceIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );

      const testContainer = await retryAsync(() =>
        sc.getSolidDataset(testContainerIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
      // Iterate over the contained resources because the IRI of some child resources
      // is unknown.
      await Promise.all(
        sc.getContainedResourceUrlAll(testContainer).map((childUrl) =>
          retryAsync(() =>
            sc.deleteSolidDataset(childUrl, {
              fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            }),
          ),
        ),
      );
    });

    it("can use the getSolidDataset API to fetch an existing dataset", async () => {
      const ownerDataset = await sc.getSolidDataset(testResourceIri, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
      const updatedDatasetAsOwner = await sc.getSolidDataset(testResourceIri, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });

      // Serialize each to turtle:
      const updatedDatasetTtl = await sc.solidDatasetAsTurtle(updatedDataset);
      const existingDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(dataset);
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
    let accessGrant: AccessGrant;
    let testFileIri: string;
    let testContainerIri: string;
    let fileContents: Buffer;

    beforeEach(async () => {
      const fileApisContainer = await retryAsync(() =>
        sc.createContainerInContainer(resourceOwnerPod, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
      testContainerIri = sc.getSourceIri(fileApisContainer);

      fileContents = Buffer.from("hello world", "utf-8");

      const uploadedFile = await retryAsync(() =>
        sc.saveFileInContainer(testContainerIri, fileContents, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );

      testFileIri = sc.getSourceIri(uploadedFile);

      const request = await retryAsync(() =>
        issueAccessRequest(
          {
            access: { read: true, write: true, append: true },
            resources: [testContainerIri, testFileIri],
            resourceOwner: resourceOwnerSession.info.webId as string,
            expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            accessEndpoint: vcProvider,
          },
        ),
      );
    });

    afterEach(async () => {
      try {
        await retryAsync(() =>
          revokeAccessGrant(accessGrant, {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          }),
        );
      } catch (e) {
        // Allow console statement as this is useful to capture, either
        // running tests locally or in CI.
        // eslint-disable-next-line no-console
        console.error(`Revoking the Access Grant failed: ${e}`);
      }
      const testContainer = await retryAsync(() =>
        sc.getSolidDataset(testContainerIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
      // Iterate over the contained resources because the IRI of some child resources
      // is unknown.
      await Promise.all(
        sc.getContainedResourceUrlAll(testContainer).map((childUrl) =>
          retryAsync(() =>
            sc.deleteFile(childUrl, {
              fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
            }),
          ),
        ),
      );

      await retryAsync(() =>
        sc.deleteContainer(testContainerIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
    });

    const fileContentMatrix: [string, Buffer | File | NodeFile][] = [
      ["Buffer", Buffer.from("new contents", "utf-8")],
    ];

    const overwrittenContentMatrix: [string, Buffer | File | NodeFile][] = [
      ["Buffer", Buffer.from("overwritten contents", "utf-8")],
    ];

    if (nodeMajor >= 18) {
      fileContentMatrix.push(
        // ["File", new File(["new contents"], "file.txt")],
        ["Node File", new NodeFile(["new contents"], "file.txt")],
      );
      overwrittenContentMatrix.push(
        // ["File", new File(["overwritten contents"], "file.txt")],
        ["Node File", new NodeFile(["overwritten contents"], "file.txt")],
      );
    }

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

        expect(await toString(newFile)).toBe(await toString(newFileContents));

        // Verify as the resource owner that the file was actually created:
        const fileAsResourceOwner = await sc.getFile(sc.getSourceUrl(newFile), {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        });

        await expect(fileAsResourceOwner.text()).resolves.toBe(
          await toString(newFileContents),
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
        await toString(fileContents),
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

          expect(await toString(newFile)).toBe(await toString(newFileContents));
          expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

          // Verify as the resource owner that the file was actually overwritten:
          const fileAsResourceOwner = await sc.getFile(testFileIri, {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          });

          await expect(fileAsResourceOwner.text()).resolves.toBe(
            await toString(newFileContents),
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
    let testContainerIriChild: string;
    const testFileContent = "This is a test.";

    beforeEach(async () => {
      const testContainer = await retryAsync(() =>
        sc.createContainerInContainer(resourceOwnerPod, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
      testContainerIri = sc.getSourceUrl(testContainer);

      const testFile = await retryAsync(() =>
        sc.saveFileInContainer(testContainerIri, Buffer.from(testFileContent), {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );
      testFileIri = sc.getSourceUrl(testFile);

      accessRequest = await retryAsync(() =>
        issueAccessRequest(
          {
            access: { read: true, write: true, append: true },
            resourceOwner: resourceOwnerSession.info.webId as string,
            // Note that access is only requested for the container, not the contained file.
            resources: [testContainerIri],
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
            expirationDate: new Date(Date.now() + 60 * 60 * 10000),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );

      await retryAsync(() =>
        sc.deleteFile(testFileIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
        }),
      );

      if (testContainerIriChild !== undefined) {
        // This resource is only created in some tests, but cleaning it up here
        // rather than in the test ensures it is properly removed even on test
        // failure.
        await retryAsync(() =>
          sc.deleteContainer(testContainerIriChild, {
            fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          }),
        );
      }

      await retryAsync(() =>
        sc.deleteContainer(testContainerIri, {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );
      const requestorFile = await getFile(testFileIri, accessGrant, {
        fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
      });

      await expect(requestorFile.text()).resolves.toBe(testFileContent);

      // Lookup grants for the target resource, while it has been issued for the container.
      const grants = await getAccessGrantAll(testFileIri, undefined, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });
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
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
      const grants = await getAccessGrantAll(testFileIri, undefined, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });
      expect(grants).not.toContainEqual(accessGrant);
    });

    it("can use the overwriteFile API to create a new file", async () => {
      // Delete the existing file as to be able to save a new file:
      await sc.deleteFile(testFileIri, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });

      accessGrant = await approveAccessRequest(
        accessRequest,
        // Access is granted to the target container and all contained resources.
        { inherit: true },
        {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      const newFileContents = Buffer.from("overwritten contents", "utf-8");

      const newFile = await overwriteFile(
        testFileIri,
        newFileContents,
        accessGrant,
        {
          fetch: addUserAgent(requestorSession.fetch, TEST_USER_AGENT),
        },
      );

      expect(await toString(newFile)).toBe(await toString(newFileContents));
      expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually created:
      const fileAsResourceOwner = await sc.getFile(testFileIri, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        await toString(newFileContents),
      );
    });

    it("can use the saveSolidDatasetAt API for a new dataset", async () => {
      accessGrant = await approveAccessRequest(
        accessRequest,
        // Access is granted to the target container and all contained resources.
        { inherit: true },
        {
          fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
          accessEndpoint: vcProvider,
        },
      );

      await sc.deleteFile(testFileIri, {
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
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
        fetch: addUserAgent(resourceOwnerSession.fetch, TEST_USER_AGENT),
      });

      // Serialize each to turtle:
      const updatedDatasetTtl = await sc.solidDatasetAsTurtle(updatedDataset);
      const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
        updatedDatasetAsOwner,
      );

      // Assert that the dataset was created correctly:
      expect(updatedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
    });
  });
});
