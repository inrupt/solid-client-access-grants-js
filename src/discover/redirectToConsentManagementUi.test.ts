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
import { redirectToConsentManagementUi } from "./redirectToConsentManagementUi";
import {
  getConsentManagementUiFromWellKnown,
  getConsentManagementUi,
} from "./getConsentManagementUi";
import { mockAccessRequestVc } from "../manage/approve.mock";

jest.mock("./getConsentManagementUi");

const mockConsentManagementUiDiscovery = (url: string | undefined) => {
  const consentUiDiscoveryModule = jest.requireMock(
    "./getConsentManagementUi"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  consentUiDiscoveryModule.getConsentManagementUiFromWellKnown = jest
    .fn(getConsentManagementUiFromWellKnown)
    .mockResolvedValueOnce(url);
  consentUiDiscoveryModule.getConsentManagementUi = jest
    .fn(getConsentManagementUi)
    .mockResolvedValueOnce(url);
};

describe("redirectToConsentManagementUi", () => {
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

    it("throws if the consent management UI may not be discovered", async () => {
      mockConsentManagementUiDiscovery(undefined);
      await expect(
        redirectToConsentManagementUi(
          mockAccessRequestVc(),
          "https://some.redirect.iri"
        )
      ).rejects.toThrow(
        `Cannot discover consent management UI URL for [${
          mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData[0]
        }]`
      );
    });

    it("throws if the consent management UI may not be discovered, even if a resource owner WebID is provided", async () => {
      mockConsentManagementUiDiscovery(undefined);
      const resourceOwner = "https://some.webid";
      await expect(
        redirectToConsentManagementUi(
          mockAccessRequestVc(),
          "https://some.redirect.iri",
          {
            resourceOwner,
          }
        )
      ).rejects.toThrow(
        `Cannot discover consent management UI URL for [${
          mockAccessRequestVc().credentialSubject.hasConsent.forPersonalData[0]
        }], neither from [${resourceOwner}]`
      );
    });

    it("discovers the consent management UI from the resource owner profile if provided", async () => {
      mockConsentManagementUiDiscovery("https://some.app");
      const resourceOwner = "https://some.webid";
      await redirectToConsentManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          resourceOwner,
        }
      );
      const targetIri = window.location.href;
      expect(targetIri).toContain("https://some.app");
    });

    it("falls back to the provided consent app IRI if any", async () => {
      await redirectToConsentManagementUi(
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
      mockConsentManagementUiDiscovery("https://some.consent.ui");
      await redirectToConsentManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri"
      );
      expect(window.location.href).toContain("https://some.consent.ui");
    });

    it("includes the VC IRI and redirect IRI as query parameters to the consent UI IRI", async () => {
      mockConsentManagementUiDiscovery("https://some.consent.ui");
      await redirectToConsentManagementUi(
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
      mockConsentManagementUiDiscovery("https://some.consent.ui");
      const mockedFetch = jest
        .fn(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockAccessRequestVc()))
        );
      await redirectToConsentManagementUi(
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
      mockConsentManagementUiDiscovery("https://some.consent.ui");
      await redirectToConsentManagementUi(
        mockAccessRequestVc(),
        new URL("https://some.redirect.iri")
      );
      const targetIri = new URL(window.location.href);
      expect(targetIri.searchParams.get("redirectUrl")).toBe(
        "https://some.redirect.iri/"
      );
    });

    it("calls the redirection callback if provided", async () => {
      mockConsentManagementUiDiscovery("https://some.consent.ui");
      const redirectCallback = jest.fn();
      await redirectToConsentManagementUi(
        mockAccessRequestVc(),
        "https://some.redirect.iri",
        {
          redirectCallback,
        }
      );
      const redirectIri = new URL(redirectCallback.mock.calls[0][0] as string);
      expect(redirectIri.origin).toBe("https://some.consent.ui");
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
      mockConsentManagementUiDiscovery("https://some.consent.ui");
      expect(window).toBeUndefined();
      await expect(
        redirectToConsentManagementUi(
          mockAccessRequestVc(),
          "https://some.redirect.iri"
        )
      ).rejects.toThrow(
        `In a non-browser environment, a redirectCallback must be provided by the user.`
      );
    });
  });
});
