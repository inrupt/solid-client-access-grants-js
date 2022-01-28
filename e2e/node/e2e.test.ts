import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  approveAccessRequest,
  getAccessGrantAll,
  isValidAccessGrant,
  issueAccessRequest,
  revokeAccessGrant,
  getFile,
} from "../../src/index";
import { Session } from "@inrupt/solid-client-authn-node";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import { getTestingEnvironment } from "../e2e-setup";

const {
  idp: oidcIssuer,
  environment,
  requestor,
  resourceOwner,
  vcProvider,
} = getTestingEnvironment();

const SHARED_FILE_IRI =
  "https://storage.dev-next.inrupt.com/eb2f327b-7bb4-4ba2-9b4b-678a4d7e3551/somefile.txt";

// This is the content of the file uploaded manually at SHARED_FILE_IRI.
const SHARED_FILE_CONTENT = "Some content.\n";

describe(`End-to-end access grant tests for environment [${environment}}]`, () => {
  const requestorSession = new Session();
  const resourceOwnerSession = new Session();

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await requestorSession.logout();
    await resourceOwnerSession.logout();
  });

  it("can issue an access request, grant access to a resource, and revoke the granted access", async () => {
    const request = await issueAccessRequest(
      {
        access: { read: true },
        requestor: requestorSession.info.webId as string,
        resourceOwner: resourceOwnerSession.info.webId as string,
        resources: [SHARED_FILE_IRI],
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

    const grantedAccess = await getAccessGrantAll(SHARED_FILE_IRI, undefined, {
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

    const sharedFile = await getFile(SHARED_FILE_IRI, grant, {
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

  it("can filter VCs held by the service based on requestor", async () => {
    await expect(
      getAccessGrantAll(
        SHARED_FILE_IRI,
        { requestor: requestorSession.info.webId as string },
        {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }
      )
    ).resolves.not.toHaveLength(0);
    await expect(
      getAccessGrantAll(
        SHARED_FILE_IRI,
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
      getAccessGrantAll(SHARED_FILE_IRI, undefined, {
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
      getAccessGrantAll(SHARED_FILE_IRI, undefined, {
        fetch: resourceOwnerSession.fetch,
        accessEndpoint: vcProvider,
      }),
      getAccessGrantAll(
        SHARED_FILE_IRI,
        { purpose: ["https://some.purpose/not-a-nefarious-one/i-promise"] },
        {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }
      ),
      getAccessGrantAll(
        SHARED_FILE_IRI,
        { purpose: ["https://some.other.purpose/"] },
        {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }
      ),
      getAccessGrantAll(
        SHARED_FILE_IRI,
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
        SHARED_FILE_IRI,
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
