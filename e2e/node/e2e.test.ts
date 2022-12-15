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
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Session } from "@inrupt/solid-client-authn-node";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";
// Making a named import here to avoid confusion with the wrapped functions from
// the access grant API
import * as sc from "@inrupt/solid-client";
import {
  AccessGrant,
  approveAccessRequest,
  createContainerInContainer,
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
  beforeEach(async () => {
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
    const resourceOwnerPodAll = await sc.getPodUrlAll(
      resourceOwnerSession.info.webId as string
    );
    if (resourceOwnerPodAll.length === 0) {
      throw new Error(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root."
      );
    }
    // eslint-disable-next-line prefer-destructuring
    resourceOwnerPod = resourceOwnerPodAll[0];

    const savedFile = await sc.saveFileInContainer(
      resourceOwnerPodAll[0],
      Buffer.from(SHARED_FILE_CONTENT),
      {
        // The session ID is a random string, used here as a unique slug.
        slug: `${resourceOwnerSession.info.sessionId}.txt`,
        fetch: resourceOwnerSession.fetch,
      }
    );

    sharedFileIri = sc.getSourceUrl(savedFile);
  });

  // Cleanup the shared file
  afterEach(async () => {
    if (sharedFileIri) {
      // Remove the shared file from the resource owner's Pod.
      await sc.deleteFile(sharedFileIri, {
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

    it("will issue an access request, grant access to a resource, but will not update the ACR if the updateAcr flag is set to false", async () => {
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
          updateAcr: false,
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

      const sharedFileWithAcr = await sc.acp_ess_2.getFileWithAcr(
        sharedFileIri,
        {
          fetch: resourceOwnerSession.fetch,
        }
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
        })
      );
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
          updateAcr: false,
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

      const sharedFileWithAcr = await sc.acp_ess_2.getFileWithAcr(
        sharedFileIri,
        {
          fetch: resourceOwnerSession.fetch,
        }
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
        })
      );
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
    let testContainerIriChild: string;

    beforeEach(async () => {
      const containerPath = `${resourceOwnerSession.info.sessionId}-dataset-apis`;
      testContainerIri = new URL(`${containerPath}/`, resourceOwnerPod).href;
      testFileName = "dataset.ttl";
      testFileIri = new URL(testFileName, testContainerIri).href;

      await sc.createContainerAt(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const newThing = sc.setStringNoLocale(
        sc.createThing({
          name: "e2e-test-thing",
        }),
        "https://arbitrary.vocab/regular-predicate",
        "initial-dataset"
      );

      const dataset = sc.setThing(sc.createSolidDataset(), newThing);

      await sc.saveSolidDatasetInContainer(testContainerIri, dataset, {
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

      await sc.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      if (testContainerIriChild !== undefined) {
        // This resource is only created in some tests, but cleaning it up here
        // rather than in the test ensures it is properly removed even on test
        // failure.
        await sc.deleteContainer(testContainerIriChild, {
          fetch: resourceOwnerSession.fetch,
        });
      }

      await sc.deleteContainer(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });
    });

    it("can use the getSolidDataset API to fetch an existing dataset", async () => {
      const ownerDataset = await sc.getSolidDataset(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const requestorDataset = await getSolidDataset(testFileIri, accessGrant, {
        fetch: requestorSession.fetch,
      });

      const ownerTtl = await sc.solidDatasetAsTurtle(ownerDataset);
      const requestorTtl = await sc.solidDatasetAsTurtle(requestorDataset);

      expect(ownerTtl).toBe(requestorTtl);
    });

    it("can use the saveSolidDatasetAt API for an existing dataset", async () => {
      // Here we request the dataset as the resource owner, but in real-world
      // applications, you'd need to use an Access Grant to request the dataset
      // as the requestor, this is just to limit how much of the Access Grants
      // library we're testing in a single test case:
      const dataset = await sc.getSolidDataset(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      // Create a thing and add it to the dataset:
      let newThing = sc.createThing({
        name: "e2e-test-thing",
      });
      newThing = sc.setBoolean(
        newThing,
        "https://arbitrary.vocab/regular-predicate",
        true
      );
      const datasetUpdate = sc.setThing(dataset, newThing);

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
      const updatedDatasetAsOwner = await sc.getSolidDataset(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      // Serialize each to turtle:
      const updatedDatasetTtl = await sc.solidDatasetAsTurtle(updatedDataset);
      const existingDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(dataset);
      const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
        updatedDatasetAsOwner
      );

      // Assert that the dataset changed:
      expect(updatedDatasetTtl).not.toBe(existingDatasetAsOwnerTtl);
      expect(updatedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
    });

    it("can use the createContainerInContainer API to create a new container", async () => {
      const containerNameSuggestion = "newTestContainer";
      const newChildContainer = await createContainerInContainer(
        testContainerIri,
        accessGrant,
        {
          fetch: requestorSession.fetch,
          slugSuggestion: containerNameSuggestion,
        }
      );

      const parentContainer = await sc.getSolidDataset(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });
      const parentContainerContainsAll = sc.getUrlAll(
        sc.getThing(
          parentContainer,
          sc.getSourceUrl(parentContainer)
        ) as sc.Thing,
        "http://www.w3.org/ns/ldp#contains"
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
      await sc.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const testDataset = sc.createSolidDataset();
      const savedDataset = await saveSolidDatasetInContainer(
        testContainerIri,
        testDataset,
        accessGrant,
        {
          fetch: requestorSession.fetch,
          slugSuggestion: testFileName,
        }
      );

      const datasetInPodAsResourceOwner = await sc.getSolidDataset(
        sc.getSourceIri(savedDataset),
        {
          fetch: resourceOwnerSession.fetch,
        }
      );

      // We cannot request the newly created dataset using our existing Access
      // Grant because of ACR inheritance. When we delete the file containing
      // the dataset at the start of this testcase it also deletes the datasets'
      // ACRs, so this test case will fail (SDK-2792).

      // const datasetInPodAsRequestor = await
      // getSolidDataset( testFileIri, accessGrant,
      //   {
      //     fetch: requestorSession.fetch,
      //   }
      // );

      const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
        datasetInPodAsResourceOwner
      );
      const savedDatasetTtl = await sc.solidDatasetAsTurtle(savedDataset);
      expect(savedDatasetTtl).toBe(updatedDatasetAsOwnerTtl);
    });

    it.skip("can use the saveSolidDatasetAt API for a new dataset", async () => {
      // FIXME: this deletes the resources' ACRs, so this test case will fail (SDK-2792)
      // Delete the dataset created in the beforeEach:
      await sc.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      const dataset = sc.createSolidDataset();
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
      const updatedDatasetAsOwner = await sc.getSolidDataset(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      // Serialize each to turtle:
      const updatedDatasetTtl = await sc.solidDatasetAsTurtle(updatedDataset);
      const updatedDatasetAsOwnerTtl = await sc.solidDatasetAsTurtle(
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

      await sc.createContainerAt(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await sc.saveFileInContainer(testContainerIri, fileContents, {
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

      await sc.deleteFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await sc.deleteContainer(testContainerIri, {
        fetch: resourceOwnerSession.fetch,
      });
    });

    it("can use the saveFileInContainer API to create a new file", async () => {
      // Delete the existing file as to be able to save a new file:
      await sc.deleteFile(testFileIri, {
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
      expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually created:
      const fileAsResourceOwner = await sc.getFile(sc.getSourceUrl(newFile), {
        fetch: resourceOwnerSession.fetch,
      });

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        newFileContents.toString()
      );
    });

    it("can use the getFile API to get an existing file", async () => {
      // Try fetching it as the requestor of the access grant:
      const existingFile = await getFile(testFileIri, accessGrant, {
        fetch: requestorSession.fetch,
      });

      expect(sc.getSourceUrl(existingFile)).toBe(testFileIri);
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
      expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually overwritten:
      const fileAsResourceOwner = await sc.getFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        newFileContents.toString()
      );
    });

    it.skip("can use the overwriteFile API to create a new file", async () => {
      // FIXME: this deletes the resources' ACRs, so this test case will fail (SDK-2792)
      // Delete the existing file as to be able to save a new file:
      await sc.deleteFile(testFileIri, {
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
      expect(sc.getSourceUrl(newFile)).toBe(testFileIri);

      // Verify as the resource owner that the file was actually created:
      const fileAsResourceOwner = await sc.getFile(testFileIri, {
        fetch: resourceOwnerSession.fetch,
      });

      await expect(fileAsResourceOwner.text()).resolves.toBe(
        newFileContents.toString()
      );
    });
  });
});
