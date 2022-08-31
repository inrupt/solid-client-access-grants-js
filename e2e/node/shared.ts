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

import { randomUUID } from "crypto";

import {
  createContainerAt,
  deleteContainer,
  deleteFile,
  getPodUrlAll,
  getSourceIri,
  WithResourceInfo,
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-node";

import {
  AccessGrant,
  AccessModes,
  AccessRequest,
  approveAccessRequest,
  issueAccessRequest,
} from "../../src";

import { getTestingEnvironmentNode } from "../e2e-setup";

const {
  idp: oidcIssuer,
  requestor: requestorOptions,
  resourceOwner: resourceOwnerOptions,
  vcProvider,
} = getTestingEnvironmentNode();

export interface TestSessions {
  resourceOwnerSession: Session;
  requestorSession: Session;
}

export async function setupSessions(): Promise<TestSessions> {
  const requestorSession = new Session();

  await requestorSession.login({
    oidcIssuer,
    clientId: requestorOptions.id,
    clientSecret: requestorOptions.secret,
    // Note that currently, using a Bearer token (as opposed to a DPoP one)
    // is required for the UMA access token to be usable.
    tokenType: "Bearer",
  });

  const resourceOwnerSession = new Session();

  await resourceOwnerSession.login({
    oidcIssuer,
    clientId: resourceOwnerOptions.id,
    clientSecret: resourceOwnerOptions.secret,
  });

  return {
    resourceOwnerSession,
    requestorSession,
  };
}

export async function teardownSessions(
  testSessions: TestSessions
): Promise<void> {
  await testSessions.resourceOwnerSession.logout();
  await testSessions.requestorSession.logout();
}

interface CreateAccessGrantOptions {
  resources: string[];
  access: AccessModes;
  testSessions: TestSessions;
}

interface CreateAccessGrantResult {
  accessGrant: AccessGrant;
  accessRequest: AccessRequest;
}

export async function createAccessGrant(
  options: CreateAccessGrantOptions
): Promise<CreateAccessGrantResult> {
  const {
    access,
    resources,
    testSessions: { resourceOwnerSession, requestorSession },
  } = options;
  const accessRequest = await issueAccessRequest(
    {
      access,
      resources,
      resourceOwner: resourceOwnerSession.info.webId as string,
    },
    {
      fetch: requestorSession.fetch,
      accessEndpoint: vcProvider,
    }
  );

  const accessGrant = await approveAccessRequest(
    accessRequest,
    {},
    {
      fetch: resourceOwnerSession.fetch,
      accessEndpoint: vcProvider,
    }
  );

  return {
    accessRequest,
    accessGrant,
  };
}

export class TestResourceTracker {
  private id: string;

  private resourceOwnerSession: Session;

  private fetchOptions: { fetch: typeof fetch };

  private rootContainerIri?: string;

  private containers: Set<string> = new Set();

  private resources: Set<string> = new Set();

  private debugPrefixes: Set<string> = new Set();

  constructor(resourceOwnerSession: Session) {
    this.id = randomUUID();

    this.resourceOwnerSession = resourceOwnerSession;

    this.fetchOptions = {
      fetch: resourceOwnerSession.fetch,
    };
  }

  log(iri: string, ...msg: unknown[]) {
    if (this.shouldDebug(iri)) {
      console.log(...msg);
    }
  }

  private shouldDebug(iri: string): boolean {
    for (const prefix of this.debugPrefixes) {
      if (iri.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  private debug(containerIri?: string) {
    if (containerIri) {
      this.debugPrefixes.add(containerIri);
    } else if (this.rootContainerIri) {
      this.debugPrefixes.add(this.rootContainerIri);
    }
  }

  async setup(options?: { debug: boolean }) {
    const resourceOwnerPodAll = await getPodUrlAll(
      this.resourceOwnerSession.info.webId as string
    );

    if (resourceOwnerPodAll.length === 0) {
      throw new Error(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root."
      );
    }

    // eslint-disable-next-line prefer-destructuring
    const resourceOwnerPodIri = resourceOwnerPodAll[0];

    this.rootContainerIri = new URL(
      `test-${this.id}/`,
      resourceOwnerPodIri
    ).href;

    await createContainerAt(this.rootContainerIri, this.fetchOptions);

    if (options?.debug) {
      this.debug(this.rootContainerIri);
    }

    this.log(
      this.rootContainerIri,
      `Created Container: ${this.rootContainerIri}`
    );
  }

  async setupTest(options?: { debug: boolean }): Promise<string> {
    if (!this.rootContainerIri) {
      throw new Error(
        "resourceTrack.setup() appears to have never been called"
      );
    }

    const testContainerIri = this.getContainerIri();
    if (options?.debug) {
      this.debug(testContainerIri);
    }

    await createContainerAt(testContainerIri, this.fetchOptions);
    this.log(testContainerIri, "Created Test Container:", testContainerIri);

    return testContainerIri;
  }

  async teardownTest(testContainerIri: string) {
    const resources = Array.from(this.resources).filter((resourceIri) =>
      resourceIri.startsWith(testContainerIri)
    );
    const containers = Array.from(this.containers).filter(
      (containerIri) =>
        containerIri.startsWith(testContainerIri) &&
        containerIri !== testContainerIri
    );

    await Promise.all(
      resources.map((resourceIri) => {
        const op = deleteFile(resourceIri, this.fetchOptions);

        op.then(() => {
          this.log(resourceIri, `Deleted resource:`, resourceIri);
          this.resources.delete(resourceIri);
        }).catch(() => {});

        return op;
      })
    );

    await Promise.all(
      containers.map((containerIri) => {
        const op = deleteContainer(containerIri, this.fetchOptions);

        op.then(() => {
          this.log(containerIri, `Deleted container:`, containerIri);
          this.resources.delete(containerIri);
        }).catch(() => {});

        return op;
      })
    );

    await deleteContainer(testContainerIri, this.fetchOptions);
    this.containers.delete(testContainerIri);
    this.log(testContainerIri, "Deleted Test Container:", testContainerIri);
  }

  async teardown() {
    if (!this.rootContainerIri) {
      throw new Error(
        "resourceTrack.setup() appears to have never been called"
      );
    }

    this.log(this.rootContainerIri, "Deleting any remaining resources...");

    await Promise.all(
      Array.from(this.resources).map((resourceIri) => {
        this.log(resourceIri, `Deleting resource:`, resourceIri);
        return deleteFile(resourceIri, this.fetchOptions);
      })
    );

    await Promise.all(
      Array.from(this.containers).map((containerIri) => {
        this.log(containerIri, `Deleting container:`, containerIri);
        return deleteContainer(containerIri, this.fetchOptions);
      })
    );

    await deleteContainer(this.rootContainerIri, this.fetchOptions);

    this.log(
      this.rootContainerIri,
      "Deleted Test Container:",
      this.rootContainerIri
    );
  }

  getTestContainerIri(): string {
    if (!this.rootContainerIri) {
      throw new Error(
        "resourceTrack.setup() appears to have never been called"
      );
    }

    return this.rootContainerIri;
  }

  trackContainerIri(containerIri: string): string {
    this.containers.add(containerIri);
    this.log(containerIri, `Tracking container:`, containerIri);

    return containerIri;
  }

  trackResourceIri(resourceIri: string): string {
    this.resources.add(resourceIri);
    this.log(resourceIri, `Tracking resource:`, resourceIri);

    return resourceIri;
  }

  trackResource(resource: WithResourceInfo): string {
    const resourceIri = getSourceIri(resource);
    this.trackResourceIri(resourceIri);

    return resourceIri;
  }

  getContainerIri(containerName?: string, parentContainerIri?: string): string {
    const parentContainer = parentContainerIri ?? this.rootContainerIri;
    let containerIri = "";

    if (containerName) {
      containerIri = new URL(
        containerName.endsWith("/") ? containerName : `${containerName}/`,
        parentContainer
      ).href;
    } else {
      containerIri = new URL(`${randomUUID()}/`, parentContainer).href;
    }

    this.trackContainerIri(containerIri);

    return containerIri;
  }

  getResourceIri(resourceName: string, parentContainer?: string): string {
    let containerIri: string;
    if (parentContainer) {
      containerIri = parentContainer;
    } else if (this.rootContainerIri) {
      containerIri = this.rootContainerIri;
    } else {
      throw new Error(
        "Missing parentContainer or resourceTracker.setup() was never called"
      );
    }

    const resourceIri = new URL(resourceName, containerIri).href;

    if (!containerIri.endsWith("/")) {
      throw new Error(
        `Parent container does not end with a trailing slash when creating resource ${resourceName}: ${containerIri}`
      );
    }

    if (
      !this.containers.has(containerIri) &&
      containerIri !== this.rootContainerIri
    ) {
      this.trackContainerIri(containerIri);
    }

    return this.trackResourceIri(resourceIri);
  }
}
