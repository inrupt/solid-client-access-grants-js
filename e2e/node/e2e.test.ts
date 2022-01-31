import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "@jest/globals";
import {
  saveFileInContainer,
  getPodUrlAll,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-node";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  approveAccessRequest,
  getAccessGrantAll,
  isValidAccessGrant,
  issueAccessRequest,
  revokeAccessGrant,
  getFile,
} from "../../src/index";
import { getTestingEnvironment } from "../e2e-setup";

const {
  idp: oidcIssuer,
  environment,
  requestor,
  resourceOwner,
  vcProvider,
} = getTestingEnvironment();

// This is the content of the file uploaded manually at SHARED_FILE_IRI.
const SHARED_FILE_CONTENT = "Some content.\n";

describe(`End-to-end access grant tests for environment [${environment}}]`, () => {
  const requestorSession = new Session();
  const resourceOwnerSession = new Session();

  let sharedFileIri: string;

  // Setup the shared file
  beforeAll(async () => {
    // Log both sessions in.
    await requestorSession.login({
      oidcIssuer,
      clientId: requestor.id,
      clientSecret: requestor.secret,
      // Note that currently, using a Bearer token (as opposed to a DPoP one)
      // is required for the UMA access token to be usable.
      tokenType: "Bearer",
    });
    await resourceOwnerSession.login({
      oidcIssuer,
      clientId: resourceOwner.id,
      clientSecret: resourceOwner.secret,
    });

    // Create a file in the resource owner's Pod
    const resourceOwnerPodAll = await getPodUrlAll(
      resourceOwnerSession.info.webId as string
    );
    if (resourceOwnerPodAll.length === 0) {
      throw new Error(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root."
      );
    }
    const savedFile = await saveFileInContainer(
      resourceOwnerPodAll[0],
      Buffer.from(SHARED_FILE_CONTENT),
      {
        // The session ID is a random string, used here as a unique slug.
        slug: `${resourceOwnerSession.info.sessionId}.txt`,
        fetch: resourceOwnerSession.fetch,
      }
    );
    sharedFileIri = getSourceUrl(savedFile);
  });

  // Cleanup the shared file
  afterAll(async () => {
    // Remove the shared file from the resource owner's Pod.
    deleteFile(sharedFileIri, {
      fetch: resourceOwnerSession.fetch,
    });
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await requestorSession.logout();
    await resourceOwnerSession.logout();
  });

  describe("access request, grant and exercise flow", () => {
    it("can issue an access request, grant access to a resource, and revoke the granted access", async () => {
      const request = await issueAccessRequest(
        {
          access: { read: true },
          requestor: requestorSession.info.webId as string,
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [sharedFileIri],
          purpose: [
            "https://some.purpose/not-a-nefarious-one/i-promise",
            "https://some.other.purpose/",
          ],
        },
        {
          fetch: requestorSession.fetch,
          accessEndpoint: vcProvider,
        }
      );
      expect(isVerifiableCredential(request)).toBe(true);

      const grant = await approveAccessRequest(
        resourceOwnerSession.info.webId as string,
        request,
        {},
        {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }
      );

      await expect(
        isValidAccessGrant(grant, {
          fetch: resourceOwnerSession.fetch,
          // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
          // It is an issue documented in the VC library e2e test, and in a ticket
          // to be fixed.
          verificationEndpoint: `${vcProvider}/verify`,
        })
      ).resolves.toMatchObject({ errors: [] });

      const grantedAccess = await getAccessGrantAll(sharedFileIri, undefined, {
        fetch: resourceOwnerSession.fetch,
        accessEndpoint: vcProvider,
      });

      // Test that looking up the access grants for the given resource returns
      // the access we just granted.
      expect(grantedAccess).toContainEqual(grant);

      // For some reason, the Node jest runner throws an undefined error when
      // calling to btoa. This overrides it, while keeping the actual code
      // environment-agnostic.
      global.btoa = (str: string) => Buffer.from(str).toString("base64");

      const sharedFile = await getFile(sharedFileIri, grant, {
        fetch: requestorSession.fetch,
      });
      await expect(sharedFile.text()).resolves.toBe(SHARED_FILE_CONTENT);

      await revokeAccessGrant(grant, {
        fetch: resourceOwnerSession.fetch,
      });
      expect(
        (
          await isValidAccessGrant(grant, {
            fetch: resourceOwnerSession.fetch,
            // FIXME: Ditto verification endpoint discovery.
            verificationEndpoint: `${vcProvider}/verify`,
          })
        ).errors
      ).toHaveLength(1);
    });
  });

  describe("resource owner interaction with VC provider", () => {
    it("can filter VCs held by the service based on requestor", async () => {
      await expect(
        getAccessGrantAll(
          sharedFileIri,
          { requestor: requestorSession.info.webId as string },
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcProvider,
          }
        )
      ).resolves.not.toHaveLength(0);
      await expect(
        getAccessGrantAll(
          sharedFileIri,
          { requestor: "https://some.unknown.requestor" },
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcProvider,
          }
        )
      ).resolves.toHaveLength(0);
    });

    it("can filter VCs held by the service based on target resource", async () => {
      await expect(
        getAccessGrantAll(sharedFileIri, undefined, {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        })
      ).resolves.not.toHaveLength(0);
      await expect(
        getAccessGrantAll("https://some.unkown.resource", undefined, {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        })
      ).resolves.toHaveLength(0);
    });

    it("can filter VCs held by the service based on purpose", async () => {
      const [
        noPurposeFilter,
        partialPurposeFilter,
        otherPartialPurposeFilter,
        bothPurposeFilter,
        unknownPurposeFilter,
      ] = await Promise.all([
        getAccessGrantAll(sharedFileIri, undefined, {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }),
        getAccessGrantAll(
          sharedFileIri,
          { purpose: ["https://some.purpose/not-a-nefarious-one/i-promise"] },
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcProvider,
          }
        ),
        getAccessGrantAll(
          sharedFileIri,
          { purpose: ["https://some.other.purpose/"] },
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcProvider,
          }
        ),
        getAccessGrantAll(
          sharedFileIri,
          {
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
          },
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcProvider,
          }
        ),
        getAccessGrantAll(
          sharedFileIri,
          { purpose: ["https://some.unknown.purpose/"] },
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcProvider,
          }
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
            .map((vc) => JSON.stringify(vc))
            .includes(JSON.stringify(vc))
        )
      ).toBe(true);
      // Filtering on both purposes should include the results filtered on individual purposes
      expect(
        partialPurposeFilter.every((vc) =>
          bothPurposeFilter
            .map((vc) => JSON.stringify(vc))
            .includes(JSON.stringify(vc))
        )
      ).toBe(true);
      expect(
        otherPartialPurposeFilter.every((vc) =>
          bothPurposeFilter
            .map((vc) => JSON.stringify(vc))
            .includes(JSON.stringify(vc))
        )
      ).toBe(true);
    });
  });
});
