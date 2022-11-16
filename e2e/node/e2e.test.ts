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

// Globals are actually not injected, so this does not shadow anything.
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";

import * as solidClient from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-node";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";
import {
  approveAccessRequest,
  getAccessGrantAll,
  isValidAccessGrant,
  issueAccessRequest,
  revokeAccessGrant,
  getFile,
  AccessGrant,
  overwriteFile,
  saveFileInContainer,
  saveSolidDatasetAt,
  getSolidDataset,
} from "../../src/index";

const env = getNodeTestingEnvironment({
  vcProvider: "",
  clientCredentials: {
    owner: { id: "", secret: "" },
    requestor: { id: "", secret: "" },
  },
});

const { idp: oidcIssuer, environment, clientCredentials, vcProvider } = env;

// For some reason, the Node jest runner throws an undefined error when
// calling to btoa. This overrides it, while keeping the actual code
// environment-agnostic.
if (!global.btoa) {
  global.btoa = (data: string) => Buffer.from(data).toString("base64");
}

// This is the content of the file uploaded manually at SHARED_FILE_IRI.
const SHARED_FILE_CONTENT = "Some content.\n";

describe(`End-to-end access grant tests for environment [${environment}}]`, () => {
  const requestorSession = new Session();
  const resourceOwnerSession = new Session();

  let resourceOwnerPod: string;
  let sharedFileIri: string;

  // Setup the shared file
  beforeAll(async () => {
    // Log both sessions in.
    await requestorSession.login({
      oidcIssuer,
      clientId: clientCredentials?.requestor?.id,
      clientSecret: clientCredentials?.requestor?.secret,
      // Note that currently, using a Bearer token (as opposed to a DPoP one)
      // is required for the UMA access token to be usable.
      tokenType: "Bearer",
    });
    await resourceOwnerSession.login({
      oidcIssuer,
      clientId: clientCredentials?.owner?.id,
      clientSecret: clientCredentials?.owner?.secret,
    });

    // Create a file in the resource owner's Pod
    const resourceOwnerPodAll = await solidClient.getPodUrlAll(
      resourceOwnerSession.info.webId as string
    );
    if (resourceOwnerPodAll.length === 0) {
      throw new Error(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root."
      );
    }
    // eslint-disable-next-line prefer-destructuring
    resourceOwnerPod = resourceOwnerPodAll[0];

    const savedFile = await solidClient.saveFileInContainer(
      resourceOwnerPodAll[0],
      Buffer.from(SHARED_FILE_CONTENT),
      {
        // The session ID is a random string, used here as a unique slug.
        slug: `${resourceOwnerSession.info.sessionId}.txt`,
        fetch: resourceOwnerSession.fetch,
      }
    );

    sharedFileIri = solidClient.getSourceUrl(savedFile);
  });

  // Cleanup the shared file
  afterAll(async () => {
    if (sharedFileIri) {
      // Remove the shared file from the resource owner's Pod.
      await solidClient.deleteFile(sharedFileIri, {
        fetch: resourceOwnerSession.fetch,
      });
    }
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

    it("can issue an access grant overriding an access request", async () => {
      const expirationDate = new Date();
      // Request a 3-month grant
      expirationDate.setMonth((expirationDate.getMonth() + 3) % 12);
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
          fetch: requestorSession.fetch,
          accessEndpoint: vcProvider,
        }
      );

      const grant = await approveAccessRequest(
        request,
        {
          // Only grant a subset of the required access.
          access: { read: true },
          requestor: requestorSession.info.webId as string,
          resources: [sharedFileIri],
          // Remove the expiration date from the grant.
          expirationDate: null,
        },
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
      expect(grant.expirationDate).toBeUndefined();
      expect(grant.credentialSubject.providedConsent.mode).toStrictEqual([
        "http://www.w3.org/ns/auth/acl#Read",
      ]);
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
            .map((vcNoPurpose) => JSON.stringify(vcNoPurpose))
            .includes(JSON.stringify(vc))
        )
      ).toBe(true);
      // Filtering on both purposes should include the results filtered on individual purposes
      expect(
        partialPurposeFilter.every((vc) =>
          bothPurposeFilter
            .map((vcWithPurpose) => JSON.stringify(vcWithPurpose))
            .includes(JSON.stringify(vc))
        )
      ).toBe(true);
      expect(
        otherPartialPurposeFilter.every((vc) =>
          bothPurposeFilter
            .map((vcWithPurpose) => JSON.stringify(vcWithPurpose))
            .includes(JSON.stringify(vc))
        )
      ).toBe(true);
    });
  });

  describe("requestor can use the resource Dataset APIs to interact with Datasets", () => {
    let accessGrant: AccessGrant;
    let testFileName: string;
    let testFileIri: string;
    let testContainerIri: string;

    beforeEach(async () => {
      const containerPath = `${resourceOwnerSession.info.sessionId}-dataset-apis`;

      testContainerIri = new URL(`${containerPath}/`, resourceOwnerPod).href;
      testFileName = "dataset.ttl";
      testFileIri = new URL(testFileName, testContainerIri).href;

      await solidClient.createContainerAt(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const newThing = solidClient.setStringNoLocale(
        solidClient.createThing({
          name: "e2e-test-thing",
        }),
        "https://arbitrary.vocab/regular-predicate",
        "initial-dataset"
      );

      const dataset = solidClient.setThing(
        solidClient.createSolidDataset(),
        newThing
      );

      await solidClient.saveSolidDatasetInContainer(testContainerIri, dataset, {
        fetch: resourceOwnerSession.fetch,
        slugSuggestion: testFileName,
      });

      const request = await issueAccessRequest(
        {
          access: { read: true, write: true, append: true },
          resourceOwner: resourceOwnerSession.info.webId as string,
          resources: [testFileIri, testContainerIri],
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

      accessGrant = await approveAccessRequest(
        request,
        {},
        {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }
      );
    });

    afterEach(async () => {
      await revokeAccessGrant(accessGrant, {
        fetch: resourceOwnerSession.fetch,
      });

      await solidClient.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await solidClient.deleteContainer(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });
    });

    it("can use the getSolidDataset API to fetch an existing dataset", async () => {
      const ownerDataset = await solidClient.getSolidDataset(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const requestorDataset = await getSolidDataset(testFileIri, accessGrant, {
        fetch: requestorSession.fetch,
      });

      const ownerTtl = await solidClient.solidDatasetAsTurtle(ownerDataset);
      const requestorTtl = await solidClient.solidDatasetAsTurtle(
        requestorDataset
      );

      expect(ownerTtl).toBe(requestorTtl);
    });

    it("can use the saveSolidDatasetAt API for an existing dataset", async () => {
      // Here we request the dataset as the resource owner, but in real-world
      // applications, you'd need to use an Access Grant to request the dataset
      // as the requestor, this is just to limit how much of the Access Grants
      // library we're testing in a single test case:
      const dataset = await solidClient.getSolidDataset(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      // Create a thing and add it to the dataset:
      let newThing = solidClient.createThing({
        name: "e2e-test-thing",
      });
      newThing = solidClient.setBoolean(
        newThing,
        "https://arbitrary.vocab/regular-predicate",
        true
      );
      const datasetUpdate = solidClient.setThing(dataset, newThing);

      // Try to update the dataset as a requestor of the Access Grant:
      const updatedDataset = await saveSolidDatasetAt(
        testFileIri,
        datasetUpdate,
        accessGrant,
        {
          fetch: requestorSession.fetch,
        }
      );

      // Fetch it back as the owner to prove the dataset was actually updated:
      const updatedDatasetAsOwner = await solidClient.getSolidDataset(
        testFileIri,
        {
          fetch: resourceOwnerSession.fetch,
        }
      );

      // Serialize each to turtle:
      const updatedDatasetTtl = await solidClient.solidDatasetAsTurtle(
        updatedDataset
      );
      const existingDatasetAsOwnerTtl = await solidClient.solidDatasetAsTurtle(
        dataset
      );
      const updatedDatasetAsOwnerTtl = await solidClient.solidDatasetAsTurtle(
        updatedDatasetAsOwner
      );

      // Assert that the dataset changed:
      expect(updatedDatasetTtl).not.toBe(existingDatasetAsOwnerTtl);
      expect(updatedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
    });

    it.skip("can use the saveSolidDatasetAt API for a new dataset", async () => {
      // FIXME: this deletes the resources' ACRs, so this test case will fail (SDK-2792)
      // Delete the dataset created in the beforeEach:
      await solidClient.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const dataset = solidClient.createSolidDataset();
      const newDatasetIri = testFileIri;

      const updatedDataset = await saveSolidDatasetAt(
        newDatasetIri,
        dataset,
        accessGrant,
        {
          fetch: requestorSession.fetch,
        }
      );

      // Fetch it back as the owner to prove the dataset was actually created:
      const updatedDatasetAsOwner = await solidClient.getSolidDataset(
        testFileIri,
        {
          fetch: resourceOwnerSession.fetch,
        }
      );

      // Serialize each to turtle:
      const updatedDatasetTtl = await solidClient.solidDatasetAsTurtle(
        updatedDataset
      );
      const updatedDatasetAsOwnerTtl = await solidClient.solidDatasetAsTurtle(
        updatedDatasetAsOwner
      );

      // Assert that the dataset was created correctly:
      expect(updatedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
    });
  });

  describe("requestor can use the resource File APIs to interact with resources", () => {
    let accessGrant: AccessGrant;
    let testFileName: string;
    let testFileIri: string;
    let testContainerIri: string;
    let fileContents: Buffer;

    beforeEach(async () => {
      const containerPath = `${resourceOwnerSession.info.sessionId}-file-apis`;

      testContainerIri = new URL(`${containerPath}/`, resourceOwnerPod).href;
      testFileName = `upload-${Date.now()}.txt`;
      testFileIri = new URL(testFileName, testContainerIri).href;

      fileContents = Buffer.from("hello world", "utf-8");

      await solidClient.createContainerAt(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await solidClient.saveFileInContainer(testContainerIri, fileContents, {
        fetch: resourceOwnerSession.fetch,
        slug: testFileName,
      });

      const request = await issueAccessRequest(
        {
          access: { read: true, write: true, append: true },
          resources: [testContainerIri, testFileIri],
          resourceOwner: resourceOwnerSession.info.webId as string,
        },
        {
          fetch: requestorSession.fetch,
          accessEndpoint: vcProvider,
        }
      );

      accessGrant = await approveAccessRequest(
        request,
        {},
        {
          fetch: resourceOwnerSession.fetch,
          accessEndpoint: vcProvider,
        }
      );
    });

    afterEach(async () => {
      await revokeAccessGrant(accessGrant, {
        fetch: resourceOwnerSession.fetch,
      });

      await solidClient.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await solidClient.deleteContainer(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });
    });

    it("can use the saveFileInContainer API to create a new file", async () => {
      // Delete the existing file as to be able to save a new file:
      await solidClient.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const newFileContents = Buffer.from("new contents", "utf-8");

      const newFile = await saveFileInContainer(
        testContainerIri,
        newFileContents,
        accessGrant,
        {
          fetch: requestorSession.fetch,
          slug: testFileName,
        }
      );

      expect(newFile.toString("utf-8")).toBe(newFileContents.toString());
      expect(solidClient.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually created:
      const fileAsResourceOwner = await solidClient.getFile(
        solidClient.getSourceUrl(newFile),
        {
          fetch: resourceOwnerSession.fetch,
        }
      );

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        newFileContents.toString()
      );
    });

    it("can use the getFile API to get an existing file", async () => {
      // Try fetching it as the requestor of the access grant:
      const existingFile = await getFile(testFileIri, accessGrant, {
        fetch: requestorSession.fetch,
      });

      expect(solidClient.getSourceUrl(existingFile)).toBe(testFileIri);
      await expect(existingFile.text()).resolves.toBe(fileContents.toString());
    });

    it("can use the overwriteFile API to replace an existing file", async () => {
      const newFileContents = Buffer.from("overwritten contents", "utf-8");

      const newFile = await overwriteFile(
        testFileIri,
        newFileContents,
        accessGrant,
        {
          fetch: requestorSession.fetch,
        }
      );

      expect(newFile.toString("utf-8")).toBe(newFileContents.toString());
      expect(solidClient.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually overwritten:
      const fileAsResourceOwner = await solidClient.getFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        newFileContents.toString()
      );
    });

    it.skip("can use the overwriteFile API to create a new file", async () => {
      // FIXME: this deletes the resources' ACRs, so this test case will fail (SDK-2792)
      // Delete the existing file as to be able to save a new file:
      await solidClient.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const newFileContents = Buffer.from("overwritten contents", "utf-8");

      const newFile = await overwriteFile(
        testFileIri,
        newFileContents,
        accessGrant,
        {
          fetch: requestorSession.fetch,
        }
      );

      expect(newFile.toString("utf-8")).toBe(newFileContents.toString());
      expect(solidClient.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually created:
      const fileAsResourceOwner = await solidClient.getFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        newFileContents.toString()
      );
    });
  });
});
