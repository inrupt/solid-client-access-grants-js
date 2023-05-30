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

import { test, expect } from "./fixtures";

test("Redirect to Podbrowser to accept Access Request", async ({
  page,
  auth,
  accessRequest,
}) => {
  console.log(accessRequest);
  await auth.login({ allow: true });
  // Create the resource. Note that the Promise.all prevents a race condition where
  // the request would be sent before we wait on it.
  await Promise.all([
    page.click("button[data-testid=create-resource]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch(/https:\/\/.*\.txt/);

  // TODO:
  // The test issues an access request on behalf of a requestor thru the fixture

  // Here test writes the id to a readable input text input
  await page.getByPlaceholder("Access Request URL").fill(accessRequest);

  // redirectFunction reads that id and uses it

  await Promise.all([
    page.click("button[data-testid=redirect-for-access]"),
    page.waitForRequest((request) => request.method() === "POST"),
  ]);
  // The test user is redirected to Podbrowser, and presented with the request

  // The test user grants access
  // The test user is redirected back to the test app
  // The test app collects the access grant based on the IRI in the query parameters
  // The test app sends an authenticated request to get the resource it has been granted access to
});

// eslint-disable-next-line playwright/no-skipped-test
test("Granting access to a resource, then revoking the access grant", async ({
  page,
  auth,
}) => {
  await auth.login({ allow: true });
  // Create the resource. Note that the Promise.all prevents a race condition where
  // the request would be sent before we wait on it.
  await Promise.all([
    page.click("button[data-testid=create-resource]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch(/https:\/\/.*\.txt/);

  // Grant access to the resource.
  await Promise.all([
    page.click("button[data-testid=grant-access]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("pre[data-testid=access-grant]")
  ).resolves.not.toBe("");

  // Revoke the access grant.
  await Promise.all([
    page.click("button[data-testid=revoke-access]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 204),
  ]);
  await expect(page.innerText("pre[data-testid=access-grant]")).resolves.toBe(
    ""
  );

  // Cleanup the resource
  await Promise.all([
    page.click("button[data-testid=delete-resource]"),
    page.waitForRequest((request) => request.method() === "DELETE"),
    page.waitForResponse((response) => response.status() === 204),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch("");
});
