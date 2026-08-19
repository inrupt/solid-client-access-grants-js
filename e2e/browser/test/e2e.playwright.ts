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
  // customFields being defined is enforced by assertions.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const record = JSON.parse(customFields!);
  expect(record["https://example.org/test-string"]).toBe("test value");

  // Revoke the access request.
  await page.getByTestId("revoke-access").click();
  await expect(page.getByTestId("access-request")).toBeHidden();

  // Cleanup the resource
  await page.getByTestId("delete-resource").click();
  await expect(page.getByTestId("resource-iri")).toBeEmpty();
});
