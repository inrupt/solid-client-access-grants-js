//
// Copyright Inrupt Inc.
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
  idp,
}) => {
  // Initial login
  await auth.login({ allow: true });
  // The test issues an access request on behalf of a requestor thru the fixture
  // then the test writes the id to a readable input text input
  await page.getByTestId("access-request-id").fill(accessRequest);

  // Playwright test reads that access grant id
  // The test user clicks to be redirected to Podbrowser
  await Promise.all([
    page.click("button[data-testid=redirect-for-access]"),
    page.waitForURL("https://podbrowser.inrupt.com/*"),
  ]);

  // PodBrowser requires you to select which IDP session to use as we proceed
  await page.getByTestId("other-providers-button").click();
  await page.getByTestId("login-field").fill(idp);
  await page.getByTestId("go-button").click();
  await page.getByRole("button", { name: "Allow" }).click();

  // We validate the request fields are editable before we confirm access
  // Select our permissions
  await page.getByRole("checkbox").nth(1).check();

  // Select our resources for allowing access
  await page.getByTestId("request-select-all").click();

  // The test user confirms the access they selected and is redirected back to app
  await Promise.all([
    page.getByRole("button", { name: "Confirm Access" }).click(),
    page.waitForURL("http://localhost:3000/?accessGrantUrl=*"),
  ]);

  // Reauthenticate into test application
  await Promise.all([
    await page.getByTestId("identityProviderInput").fill(idp),
    page.getByTestId("loginButton").click(),
    page.getByRole("button", { name: "Allow" }).click(),
  ]);

  // Parse the accessGrantUrl from the query params
  await page.getByTestId("handle-grant-response").click();

  // Confirm we received an accessGrantURL
  await expect(
    page.innerText("pre[data-testid=access-grant]")
  ).resolves.not.toBe("");

  // The test app sends an authenticated request to get the resource it has been granted access to
  await Promise.all([
    page.click("button[data-testid=get-authed-grant]"),
    page.waitForResponse((response) => response.status() === 200),
  ]);
});

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
