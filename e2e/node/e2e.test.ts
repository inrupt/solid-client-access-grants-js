/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  approveAccessRequest,
  approveAccessRequestWithConsent,
  getAccessGrantAll,
  isValidAccessGrant,
  issueAccessRequest,
  revokeAccessGrant,
} from "../../src/index";
import { Session } from "@inrupt/solid-client-authn-node";
import { isVerifiableCredential } from "@inrupt/solid-client-vc";
import { config } from "dotenv-flow";

// Load environment variables from .env.test.local if available:
config({
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

type OidcIssuer = string;
type VcService = string;
type Requestor = string;
type ResourceOwner = string;
type ClientId = string;
type ClientSecret = string;
type AuthDetails = [
  OidcIssuer,
  VcService,
  Requestor,
  ResourceOwner,
  ClientId,
  ClientSecret,
  ClientId,
  ClientSecret
];
// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // dev-next.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_DEV_NEXT_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_VC_SERVICE!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_REQUESTOR!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_RESOURCE_OWNER!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_REQUESTOR_CLIENT_ID!,
    process.env.E2E_TEST_ESS_REQUESTOR_CLIENT_SECRET!,
    process.env.E2E_TEST_ESS_RESOURCE_OWNER_CLIENT_ID!,
    process.env.E2E_TEST_ESS_RESOURCE_OWNER_CLIENT_SECRET!,
  ],
];

const SHARED_IMAGE_IRI =
  "https://storage.dev-next.inrupt.com/eb2f327b-7bb4-4ba2-9b4b-678a4d7e3551/adminadmin.jpg";

describe.each(serversUnderTest)(
  "Access grant client end-to-end tests authenticated to [%s], issuing from [%s] for [%s]",
  (
    oidcIssuerDisplay,
    vcServiceDisplay,
    requestorDisplay,
    resourceOwnerDisplay,
    requestorClientId,
    requestorClientSecret,
    resourceOwnerClientId,
    resourceOwnerClientSecret
  ) => {
    const oidcIssuer = new URL(`https://${oidcIssuerDisplay}`).href;
    const vcService = new URL(`https://${vcServiceDisplay}`).href;
    const requestor = new URL(`https://${requestorDisplay}`).href;
    const resourceOwner = new URL(`https://${resourceOwnerDisplay}`).href;

    it("has the appropriate environment variables", () => {
      expect(oidcIssuer).not.toBeUndefined();
      expect(requestorClientId).not.toBeUndefined();
      expect(requestorClientSecret).not.toBeUndefined();
      expect(resourceOwnerClientId).not.toBeUndefined();
      expect(resourceOwnerClientSecret).not.toBeUndefined();
      expect(vcService).not.toBeUndefined();
      expect(requestor).not.toBeUndefined();
      expect(resourceOwner).not.toBeUndefined();
    });

    describe("overall flow", () => {
      const requestorSession = new Session();
      const resourceOwnerSession = new Session();

      beforeEach(async () => {
        await requestorSession.login({
          oidcIssuer,
          clientId: requestorClientId,
          clientSecret: requestorClientSecret,
        });
        await resourceOwnerSession.login({
          oidcIssuer,
          clientId: resourceOwnerClientId,
          clientSecret: resourceOwnerClientSecret,
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
            requestor,
            requestorInboxUrl: "https://some.bogus.inbox",
            resourceOwner,
            resources: [SHARED_IMAGE_IRI],
            purpose: [
              "https://some.purpose/not-a-nefarious-one/i-promise",
              "https://some.other.purpose/",
            ],
          },
          {
            fetch: requestorSession.fetch,
            accessEndpoint: vcService,
          }
        );
        expect(isVerifiableCredential(request)).toBe(true);

        const grant = await approveAccessRequestWithConsent(
          resourceOwner,
          request,
          {},
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcService,
          }
        );
        await expect(
          isValidAccessGrant(grant, {
            fetch: resourceOwnerSession.fetch,
            // FIXME: Currently looking up JSON-LD doesn't work in jest tests.
            // It is an issue documented in the VC library e2e test, and in a ticket
            // to be fixed.
            verificationEndpoint: `${vcService}/verify`,
          })
        ).resolves.toMatchObject({ errors: [] });

        const grantedAccess = await getAccessGrantAll(
          SHARED_IMAGE_IRI,
          undefined,
          {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcService,
          }
        );
        // Test that looking up the access grants for the given resource returns
        // the access we just granted.
        expect(grantedAccess).toContainEqual(grant);

        await revokeAccessGrant(grant, {
          fetch: resourceOwnerSession.fetch,
        });
        expect(
          (
            await isValidAccessGrant(grant, {
              fetch: resourceOwnerSession.fetch,
              // FIXME: Ditto verification endpoint discovery.
              verificationEndpoint: `${vcService}/verify`,
            })
          ).errors
        ).toHaveLength(1);
      });

      it("can filter VCs held by the service based on requestor", async () => {
        await expect(
          getAccessGrantAll(
            SHARED_IMAGE_IRI,
            { requestor },
            {
              fetch: resourceOwnerSession.fetch,
              accessEndpoint: vcService,
            }
          )
        ).resolves.not.toHaveLength(0);
        await expect(
          getAccessGrantAll(
            SHARED_IMAGE_IRI,
            { requestor: "https://some.unknown.requestor" },
            {
              fetch: resourceOwnerSession.fetch,
              accessEndpoint: vcService,
            }
          )
        ).resolves.toHaveLength(0);
      });

      it("can filter VCs held by the service based on target resource", async () => {
        await expect(
          getAccessGrantAll(SHARED_IMAGE_IRI, undefined, {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcService,
          })
        ).resolves.not.toHaveLength(0);
        await expect(
          getAccessGrantAll("https://some.unkown.resource", undefined, {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcService,
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
          getAccessGrantAll(SHARED_IMAGE_IRI, undefined, {
            fetch: resourceOwnerSession.fetch,
            accessEndpoint: vcService,
          }),
          getAccessGrantAll(
            SHARED_IMAGE_IRI,
            { purpose: ["https://some.purpose/not-a-nefarious-one/i-promise"] },
            {
              fetch: resourceOwnerSession.fetch,
              accessEndpoint: vcService,
            }
          ),
          getAccessGrantAll(
            SHARED_IMAGE_IRI,
            { purpose: ["https://some.other.purpose/"] },
            {
              fetch: resourceOwnerSession.fetch,
              accessEndpoint: vcService,
            }
          ),
          getAccessGrantAll(
            SHARED_IMAGE_IRI,
            {
              purpose: [
                "https://some.purpose/not-a-nefarious-one/i-promise",
                "https://some.other.purpose/",
              ],
            },
            {
              fetch: resourceOwnerSession.fetch,
              accessEndpoint: vcService,
            }
          ),
          getAccessGrantAll(
            SHARED_IMAGE_IRI,
            { purpose: ["https://some.unknown.purpose/"] },
            {
              fetch: resourceOwnerSession.fetch,
              accessEndpoint: vcService,
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
  }
);
