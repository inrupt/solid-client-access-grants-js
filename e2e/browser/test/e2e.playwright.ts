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

import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

const clickOpenIdPrompt = async (page: Page) => {
  // Class-based selector that will remain compatible with previous code
  const classBasedSelector = page.locator(".allow-button");
  // Testid-based selector that will be compatible with newer releases
  const testidBasedSelector = page.getByTestId("prompt-continue");
  // Once we no longer support ESS 2.1, we can remove the class-based selector and only use the testid-based one.
  await expect(classBasedSelector.or(testidBasedSelector)).toBeVisible({
    timeout: 15_000,
  });
  // Fallback selector to support class attributes, until testid supports is fully deployed.
  // eslint-disable-next-line playwright/no-conditional-in-test
  const correctSelector = (await testidBasedSelector.isVisible())
    ? testidBasedSelector
    : classBasedSelector;
  await correctSelector.click();
};

test("Redirect to AMC to accept Access Request", async ({
  page,
  auth,
  accessRequest,
  idp,
}) => {
  // Initial login
  await auth.login({ allow: true });
  // The test issues an access request on behalf of a requestor through the fixture,
  // and then writes its URL to a text input.
  await page.getByTestId("access-request-id").fill(accessRequest);

  // Playwright test reads that access grant id
  // The test user clicks to be redirected to Podbrowser
  await Promise.all([
    page.click("button[data-testid=redirect-for-access]"),
    page.waitForURL("https://amc.inrupt.com/*"),
  ]);

  await page.getByTestId("advanced-login").click();
  // AMC requires you to select which IDP session to use as we proceed
  await page.getByTestId("identityProviderInput").fill(idp);
  await page.getByTestId("loginButton").click();

  // At this point, the user is already logged into the OpenID Provider.
  await clickOpenIdPrompt(page);
  // select the first toggle purpose (all deselected by default)
  await page.click('[data-testid="toggle-purpose"]');
  // Select all modes (all deselected by default)
  await page.getByTestId("select-all-modes-button").click();
  await page.getByTestId("confirm-access").click();

  // The test user confirms the access they selected and is redirected back to app
  await Promise.all([
    // eslint-disable-next-line playwright/no-force-option
    page.getByTestId("modal-primary-action").click(),
    page.waitForURL("http://localhost:3000/?accessGrantUrl=*"),
  ]);

  // Reauthenticate into test application
  await Promise.all([
    await page.getByTestId("identityProviderInput").fill(idp),
    page.getByTestId("loginButton").click(),
    clickOpenIdPrompt(page),
  ]);

  // Parse the accessGrantUrl from the query params
  await page.getByTestId("handle-grant-response").click();

  // Confirm we received an accessGrantURL
  await expect(page.getByTestId("access-grant")).not.toBeEmpty();

  // The test app sends an authenticated request to get the resource it has been granted access to
  await Promise.all([
    page.waitForResponse((response) => response.status() === 200),
    page.getByTestId("get-authed-grant").click(),
  ]);
});

test("Issue an access request, then revoking the access request", async ({
  page,
  auth,
}) => {
  await auth.login({ allow: true });
  await page.getByTestId("create-resource").click();
  await expect(page.getByTestId("resource-iri")).toContainText(
    /https:\/\/.*\.txt/,
    { timeout: 30_000 },
  );

  await page
    .getByTestId("input-custom-string-url")
    .fill("https://example.org/test-string");

  await page.getByTestId("input-custom-string").fill("test value");

  // Issue an access request to the resource.
  await page.getByTestId("issue-access").click();
  await expect(page.getByTestId("access-request")).not.toBeEmpty();
  const customFields = await page
    .getByTestId("credential-custom")
    .textContent();
  expect(customFields).not.toBeNull();
  const record = JSON.parse(customFields!);
  expect(record["https://example.org/test-string"]).toBe("test value");

  // Revoke the access request.
  await page.getByTestId("revoke-access").click();
  await expect(page.getByTestId("access-request")).toBeHidden();

  // Cleanup the resource
  await page.getByTestId("delete-resource").click();
  await expect(page.getByTestId("resource-iri")).toBeEmpty();
});
