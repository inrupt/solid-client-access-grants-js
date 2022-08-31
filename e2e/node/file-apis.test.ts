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

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";

import * as solidClient from "@inrupt/solid-client";
import {
  createAccessGrant,
  setupSessions,
  teardownSessions,
  TestResourceTracker,
  TestSessions,
} from "./shared";

import { AccessGrant, revokeAccessGrant } from "../../src";

describe.only("File APIs for Access Grants", () => {
  let testSessions: TestSessions;
  let resourceTracker: TestResourceTracker;

  beforeAll(async () => {
    testSessions = await setupSessions();
    resourceTracker = new TestResourceTracker(testSessions);

    await resourceTracker.setup();

    resourceTracker.debug();
  });

  afterAll(async () => {
    await resourceTracker?.teardown();
    await teardownSessions(testSessions);
  });

  describe("with resources that exist", () => {
    let accessGrant: AccessGrant;

    let testContainerIri: string;
    let testFileIri: string;

    beforeEach(async () => {
      testContainerIri = await resourceTracker.setupTest();

      const testFile = await solidClient.saveFileInContainer(
        testContainerIri,
        Buffer.from("test file contents", "utf-8"),
        {
          fetch: testSessions.resourceOwnerSession.fetch,
          slug: "test-file.txt",
        }
      );

      testFileIri = resourceTracker.trackResource(testFile);

      const result = await createAccessGrant({
        access: { read: true, write: true, append: true },
        resources: [testFileIri],
        testSessions,
      });

      accessGrant = result.accessGrant;
    });

    afterEach(async () => {
      await resourceTracker?.teardownTest(testContainerIri);

      if (accessGrant) {
        await revokeAccessGrant(accessGrant, {
          fetch: testSessions.resourceOwnerSession.fetch,
        });
      }
    });

    test("getFile", async () => {
      console.log("test running...");
      expect(true).toBe(false);
    });
  });

  describe.skip("with resources that don't yet exist", () => {});
});
