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

/* eslint-disable no-shadow */
import {
  it,
  describe,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
/* eslint-enable no-shadow */
import { redirectToAccessManagementUi } from "./redirectToAccessManagementUi";
import {
  getAccessManagementUiFromWellKnown,
  getAccessManagementUi,
} from "./getAccessManagementUi";
import { mockAccessRequestVc } from "../util/access.mock";
import { base64url } from "jose";

jest.mock("./getAccessManagementUi");

const mockAccessManagementUiDiscovery = (url: string | undefined) => {
  const accessUiDiscoveryModule = jest.requireMock(
    "./getAccessManagementUi"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  accessUiDiscoveryModule.getAccessManagementUiFromWellKnown = jest
    .fn(getAccessManagementUiFromWellKnown)
    .mockResolvedValueOnce(url);
  accessUiDiscoveryModule.getAccessManagementUi = jest
    .fn(getAccessManagementUi)
    .mockResolvedValueOnce(url);
};

describe("redirectToAccessManagementUi", () => {
  describe("in a Node environment", () => {
    it("throws if the window", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");

      await expect(
        redirectToAccessManagementUi(
          mockAccessRequestVc(),
          "https://some.redirect.iri"
        )
      ).rejects.toThrow(
        `In a non-browser environment, a redirectCallback must be provided by the user.`
      );
    });
  });
});
