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

// This file includes experimental API objects, which are camel cased.
/* eslint-disable camelcase */

import { test as base } from "@inrupt/internal-playwright-helpers";

import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";
import {
  getSourceUrl,
  saveFileInContainer,
  getPodUrlAll,
  createContainerInContainer,
} from "@inrupt/solid-client";

import { Session } from "@inrupt/solid-client-authn-node";
import issueAccessRequest from "../../../src/gConsent/request/issueAccessRequest";

export { expect } from "@inrupt/internal-playwright-helpers";

export type Fixtures = {
  accessRequest: string;
};
const saveTextFile = async (options: {
  name: string;
  contents: string;
  containerUrl: string;
  session: Session;
}): Promise<string> => {
  const data = Buffer.from(options.contents, "utf-8");

  const file = await saveFileInContainer(options.containerUrl, data, {
    contentType: "application/json",
    fetch: options.session.fetch,
  });

  const url = getSourceUrl(file);

  return url;
};

const createAccessRequest = async (
  id,
  secret,
  issuer,
  vc_provider,
  owner,
  resource
) => {
  const session = new Session();
  console.log("creating an access request");

  await session.login({
    clientId: id,
    clientSecret: secret,
    oidcIssuer: issuer,
  });

  try {
    const accessRequest = await issueAccessRequest(
      {
        access: { read: true },
        purpose: [
          "https://w3c.github.io/dpv/dpv/#UserInterfacePersonalisation",
          "https://w3c.github.io/dpv/dpv/#OptimiseUserInterface",
        ],
        resourceOwner: owner,
        resources: [resource],
      },
      {
        fetch: session.fetch,
        accessEndpoint: vc_provider,
      }
    );
    // console.log(JSON.stringify(accessRequest, null, 2));
    return accessRequest;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const test = base.extend<Fixtures>({
  // playwright expects the first argument to be a destructuring pattern.
  // eslint-disable-next-line no-empty-pattern
  accessRequest: async ({}, use) => {
    const ownerSession = new Session();
    const setupEnvironment = getNodeTestingEnvironment();
    try {
      await ownerSession.login({
        oidcIssuer: setupEnvironment.idp,
        clientId: setupEnvironment.clientCredentials.owner.id,
        clientSecret: setupEnvironment.clientCredentials.owner.secret,
        // DPoP is the default, but prints a warning on node.js that pollutes
        // the test output; we can do what we need with Bearer tokens.
        tokenType: "Bearer",
      });
    } catch (err) {
      throw new Error(`Failed to login: ${(err as Error).message}`);
    }

    if (!ownerSession.info.isLoggedIn || !ownerSession.info.webId) {
      throw new Error("Failed to login when creating test container");
    }

    const pods = await getPodUrlAll(ownerSession.info.webId, {
      fetch: ownerSession.fetch,
    });

    // Create the container:
    const testContainer = await createContainerInContainer(
      // Usually there's only a single Pod URL on the test accounts, so this *should* be fine:
      pods[0],
      {
        fetch: ownerSession.fetch,
      }
    );

    const testContainerUrl = getSourceUrl(testContainer);

    const publicFileText = "This is a publicly readable file";
    const publicFileUrl = await saveTextFile({
      name: "public.txt",
      contents: publicFileText,
      containerUrl: testContainerUrl,
      session: ownerSession,
    });

    const accessRequest = await createAccessRequest(
      setupEnvironment.clientCredentials.requestor?.id,
      setupEnvironment.clientCredentials.requestor?.secret,
      setupEnvironment.idp,
      setupEnvironment.vcProvider,
      ownerSession.info.webId,
      publicFileUrl
    );
    await use(accessRequest.id);
  },
});
