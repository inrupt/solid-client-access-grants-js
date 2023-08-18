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

import {
  jest,
  it,
  describe,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

import { redirectToRequestor } from "./redirectToRequestor";

describe("redirectToRequestor", () => {
  describe("in a browser environment", () => {
    const { location: savedLocation } = window;

    beforeEach(() => {
      // location and history aren't optional on window, which makes TS complain
      // (rightfully) when we delete them. However, they are deleted on purpose
      // here just for testing.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete window.location;
      window.location = {
        href: "https://some.site",
      } as Location;
    });

    afterEach(() => {
      window.location = savedLocation;
    });

    it("redirects to the provided redirect IRI", async () => {
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.
      // eslint-disable-next-line no-void
      void redirectToRequestor(
        "https://some.grant-vc.iri",
        "https://some.redirect.iri",
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      const targetIri = window.location.href;
      expect(targetIri).toContain("https://some.redirect.iri");
    });

    it("includes the VC IRI as query parameters to the redirect IRI", async () => {
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.
      // eslint-disable-next-line no-void
      void redirectToRequestor(
        "https://some.grant-vc.iri",
        "https://some.redirect.iri",
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      const targetIri = new URL(window.location.href);
      expect(
        decodeURIComponent(
          targetIri.searchParams.get("accessGrantUrl") as string,
        ),
      ).toBe("https://some.grant-vc.iri");
    });

    it("supports the redirect IRI and VC ID being URL objects", async () => {
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.
      // eslint-disable-next-line no-void
      void redirectToRequestor(
        new URL("https://some.grant-vc.iri"),
        new URL("https://some.redirect.iri"),
      );
      // Yield the event loop to make sure the blocking promises completes.
      // FIXME: Why is setImmediate undefined in this context ?
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      const targetIri = new URL(window.location.href);
      expect(
        decodeURIComponent(
          targetIri.searchParams.get("accessGrantUrl") as string,
        ),
      ).toBe("https://some.grant-vc.iri/");
      expect(targetIri.href).toContain("https://some.redirect.iri");
    });

    it("calls the redirection callback if provided", async () => {
      const redirectCallback = jest.fn();
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.
      // eslint-disable-next-line no-void
      void redirectToRequestor(
        "https://some.grant-vc.iri",
        "https://some.redirect.iri",
        {
          redirectCallback,
        },
      );
      // Yield the event loop to make sure the blocking promises completes.
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      const redirectIri = new URL(redirectCallback.mock.calls[0][0] as string);
      expect(redirectIri.origin).toBe("https://some.redirect.iri");
      expect(
        decodeURIComponent(
          redirectIri.searchParams.get("accessGrantUrl") as string,
        ),
      ).toBe("https://some.grant-vc.iri");
      expect(window.location.href).toBe("https://some.site");
    });
  });

  describe("in a Node environment", () => {
    const windowSpy = jest.spyOn(window, "window", "get");

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      windowSpy.mockImplementation(() => undefined);
    });

    afterEach(() => {
      windowSpy.mockRestore();
    });

    it("throws if the callback is undefined", async () => {
      expect(window).toBeUndefined();
      await expect(
        redirectToRequestor(
          "https://some.grant-vc.iri",
          "https://some.redirect.iri",
        ),
      ).rejects.toThrow(
        `In a non-browser environment, a redirectCallback must be provided by the user.`,
      );
    });
  });
});
