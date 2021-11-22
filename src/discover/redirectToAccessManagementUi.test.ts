// Copyright 2021 Inrupt Inc.
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
import {
  redirectToAccessManagementUi,
  // Deprecated API:
  redirectToConsentManagementUi,
} from "./redirectToAccessManagementUi";
import {
  getAccessManagementUiFromWellKnown,
  getAccessManagementUi,
} from "./getAccessManagementUi";
import { mockAccessRequestVc } from "../manage/approveAccessRequest.mock";

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

describe("redirectToConsentManagementUi", () => {
  it("should be an alias of redirectToAccessManagementUi", () => {
    expect(redirectToConsentManagementUi).toBe(redirectToAccessManagementUi);
  });
});

describe("redirectToAccessManagementUi", () => {
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

    it("throws if the access management UI may not be discovered", async () => {
      mockAccessManagementUiDiscovery(undefined);
      await expect(
        redirectToAccessManagementUi(
          mockAccessRequestVc(),
          "https://some.redirect.iri"
        )
      ).rejects.toThrow(
        `Cannot discover access management UI URL for [${
          mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData[0]
        }]`
      );
    });

    it("throws if the access management UI may not be discovered, even if a resource owner WebID is provided", async () => {
      mockAccessManagementUiDiscovery(undefined);
      const resourceOwner = "https://some.webid";
      await expect(
        redirectToAccessManagementUi(
          mockAccessRequestVc(),
          "https://some.redirect.iri",
          {
            resourceOwner,
          }
        )
      ).rejects.toThrow(
        `Cannot discover access management UI URL for [${
          mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData[0]
        }], neither from [${resourceOwner}]`
      );
    });

    it("discovers the access management UI from the resource owner profile if provided", async () => {
      mockAccessManagementUiDiscovery("https://some.app");
      const resourceOwner = "https://some.webid";
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          resourceOwner,
        }
      );
      const targetIri = window.location.href;
      expect(targetIri).toContain("https://some.app");
    });

    it("falls back to the provided access app IRI if any", async () => {
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          fallbackAccessManagementUi: "https://some.app",
        }
      );
      const targetIri = window.location.href;
      expect(targetIri).toContain("https://some.app");
    });

    it("falls back to the provided access app IRI if any (legacy)", async () => {
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          fallbackConsentManagementUi: "https://some.app",
        }
      );
      const targetIri = window.location.href;
      expect(targetIri).toContain("https://some.app");
    });

    it("redirects to the discovered management UI IRI", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri"
      );
      expect(window.location.href).toContain("https://some.access.ui");
    });

    it("includes the VC IRI and redirect IRI as query parameters to the access UI IRI", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri"
      );
      const targetIri = new URL(window.location.href);
      const encodedVc = targetIri.searchParams.get("requestVc") as string;
      expect(JSON.parse(atob(encodedVc))).toEqual(mockAccessRequestVc());
      expect(targetIri.searchParams.get("redirectUrl")).toBe(
        "https://some.redirect.iri"
      );
    });

    it("supports the VC to be provided as an IRI", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");
      const mockedFetch = jest
        .fn(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockAccessRequestVc()))
        );
      await redirectToAccessManagementUi(
        "https://some.request-vc.url",
        new URL("https://some.redirect.iri"),
        {
          fetch: mockedFetch,
        }
      );
      const targetIri = new URL(window.location.href);
      expect(targetIri.searchParams.get("redirectUrl")).toBe(
        "https://some.redirect.iri/"
      );
    });

    it("supports the redirect IRI being a URL object", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        new URL("https://some.redirect.iri")
      );
      const targetIri = new URL(window.location.href);
      expect(targetIri.searchParams.get("redirectUrl")).toBe(
        "https://some.redirect.iri/"
      );
    });

    it("calls the redirection callback if provided", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");
      const redirectCallback = jest.fn();
      await redirectToAccessManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          redirectCallback,
        }
      );
      const redirectIri = new URL(redirectCallback.mock.calls[0][0] as string);
      expect(redirectIri.origin).toBe("https://some.access.ui");
      expect(redirectIri.searchParams.get("requestVc")).toBe(
        btoa(JSON.stringify(mockAccessRequestVc()))
      );
      expect(redirectIri.searchParams.get("redirectUrl")).toBe(
        "https://some.redirect.iri"
      );
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

    it("throws if the window", async () => {
      mockAccessManagementUiDiscovery("https://some.access.ui");
      expect(window).toBeUndefined();
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
