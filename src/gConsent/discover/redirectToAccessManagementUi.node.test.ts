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

import { it, describe, expect, jest } from "@jest/globals";
import { redirectToAccessManagementUi } from "./redirectToAccessManagementUi";
import {
  getAccessManagementUiFromWellKnown,
  getAccessManagementUi,
} from "./getAccessManagementUi";
import { mockAccessRequestVc } from "../util/access.mock";

jest.mock("./getAccessManagementUi");

const mockAccessManagementUiDiscovery = (url: string | undefined) => {
  const accessUiDiscoveryModule = jest.requireMock(
    "./getAccessManagementUi",
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
          await mockAccessRequestVc(),
          "https://some.redirect.iri",
        ),
      ).rejects.toThrow(
        `In a non-browser environment, a redirectCallback must be provided by the user.`,
      );
    });

    it("throws if the access management UI may not be discovered", async () => {
      mockAccessManagementUiDiscovery(undefined);
      await expect(
        redirectToAccessManagementUi(
          await mockAccessRequestVc(),
          "https://some.redirect.iri",
          {
            redirectCallback: () => {},
          },
        ),
      ).rejects.toThrow(
        `Cannot discover access management UI URL for [${
          (await mockAccessRequestVc()).credentialSubject.hasConsent
            .forPersonalData[0]
        }]`,
      );
    });

    it("throws if the access management UI may not be discovered, even if a resource owner WebID is provided", async () => {
      mockAccessManagementUiDiscovery(undefined);
      const resourceOwner = "https://some.webid";
      await expect(
        redirectToAccessManagementUi(
          await mockAccessRequestVc(),
          "https://some.redirect.iri",
          {
            resourceOwner,
            redirectCallback: () => {},
          },
        ),
      ).rejects.toThrow(
        `Cannot discover access management UI URL for [${
          (await mockAccessRequestVc()).credentialSubject.hasConsent
            .forPersonalData[0]
        }], neither from [${resourceOwner}]`,
      );
    });

    it("discovers the access management UI from the resource owner profile if provided", async () => {
      mockAccessManagementUiDiscovery("https://some.app");
      const resourceOwner = "https://some.webid";
      const redirectCallback = jest.fn();
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.

      void redirectToAccessManagementUi(
        await mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          resourceOwner,
          redirectCallback,
        },
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(redirectCallback).toHaveBeenCalledWith(
        "https://some.app/?requestVcUrl=https%3A%2F%2Fsome.credential&redirectUrl=https%3A%2F%2Fsome.redirect.iri",
      );
    });

    it("discovers the access management UI from the resource owner profile if provided from plain JSON", async () => {
      mockAccessManagementUiDiscovery("https://some.app");
      const resourceOwner = "https://some.webid";
      const redirectCallback = jest.fn();
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.

      void redirectToAccessManagementUi(
        JSON.parse(JSON.stringify(await mockAccessRequestVc())),
        "https://some.redirect.iri",
        {
          resourceOwner,
          redirectCallback,
        },
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(redirectCallback).toHaveBeenCalledWith(
        "https://some.app/?requestVcUrl=https%3A%2F%2Fsome.credential&redirectUrl=https%3A%2F%2Fsome.redirect.iri",
      );
    });

    it("falls back to the provided access app IRI if any", async () => {
      const redirectCallback = jest.fn();
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.

      void redirectToAccessManagementUi(
        await mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          fallbackAccessManagementUi: "https://some.app",
          redirectCallback,
        },
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(redirectCallback).toHaveBeenCalledWith(
        "https://some.app/?requestVcUrl=https%3A%2F%2Fsome.credential&redirectUrl=https%3A%2F%2Fsome.redirect.iri",
      );
    });

    it("falls back to the provided access app IRI if any from plain JSON", async () => {
      const redirectCallback = jest.fn();
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.

      void redirectToAccessManagementUi(
        JSON.parse(JSON.stringify(await mockAccessRequestVc())),
        "https://some.redirect.iri",
        {
          fallbackAccessManagementUi: "https://some.app",
          redirectCallback,
        },
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(redirectCallback).toHaveBeenCalledWith(
        "https://some.app/?requestVcUrl=https%3A%2F%2Fsome.credential&redirectUrl=https%3A%2F%2Fsome.redirect.iri",
      );
    });
  });
});
