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

import { jest, it, describe, expect } from "@jest/globals";
// jsdom (>= 21, bundled with jest-environment-jsdom 30) makes window.location
// non-configurable and turns assignments to location.href into real (unimplemented)
// navigations, so it can no longer be replaced by hand. jest-location-mock shadows
// window.location with a mock that captures these assignments.
import "jest-location-mock";

import { redirectToRequestor } from "./redirectToRequestor";

describe("redirectToRequestor", () => {
  describe("in a browser environment", () => {
    it("redirects to the provided redirect IRI", async () => {
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.

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
      // The callback is expected to be used instead of navigating the browser.
      const initialHref = window.location.href;
      // redirectToAccessManagementUi never resolves, which prevents checking values
      // if it is awaited.

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
      expect(window.location.href).toBe(initialHref);
    });
  });

  // The non-browser environment (window === undefined) is covered in
  // redirectToRequestor.node.test.ts, since jsdom no longer allows window to be
  // spied on / undefined within the browser test environment.
});
