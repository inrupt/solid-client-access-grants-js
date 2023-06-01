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
  console.log(`accessrequest: ${accessRequest}`);
  await auth.login({ allow: true });
  // The test issues an access request on behalf of a requestor thru the fixture
  // then the test writes the id to a readable input text input
  await page.getByPlaceholder("Access Request URL").fill(accessRequest);

  // Playwright test reads that id and uses it
  // The test user clicks to be redirected to Podbrowser,
  await Promise.all([
    page.click("button[data-testid=redirect-for-access]"),
    page.waitForURL("https://podbrowser.inrupt.com/*"),
  ]);
  // and presented with the request
  // We validate the request fields are editable before we confirm access
  await page.getByTestId("login-button").click();
  await page.getByRole("button", { name: "Allow" }).click();

  // Select our permissions
  await page.getByRole("checkbox").nth(1).check();

  // Select our resources for allowing access
  await page.getByTestId("request-select-all").click();

  // // The test user confirms the access they selected and is redirected back to app
  await Promise.all([
    page.getByRole("button", { name: "Confirm Access" }).click(),
    page.waitForURL("https://localhost:3000/*"),
  ]);
  await expect(
    page.innerText("pre[data-testid=access-grant]")
  ).resolves.not.toBe("");

  await Promise.all([
    page.click("button[data-testid=get-authed-grant]"),
    page.waitForResponse((response) => response.status() === 200),
  ]);

  // The test app collects the access grant based on the IRI in the query parameters
  // The test app sends an authenticated request to get the resource it has been granted access to
});

// eslint-disable-next-line playwright/no-skipped-test
test.skip("Granting access to a resource, then revoking the access grant", async ({
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
