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

import { it, expect, describe } from "@jest/globals";
import {
  mockAccessGrantVc as mockGConsentGrant,
  mockAccessRequestVc as mockGConsentRequest,
} from "../gConsent/util/access.mock";
import { getResourceOwner, getResources } from "./getter";

describe("getResources", () => {
  describe("gConsent data model", () => {
    it("gets the resources from a gConsent access grant", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(getResources(gConsentGrant)).toBe(
        gConsentGrant.credentialSubject.providedConsent.forPersonalData
      );
    });

    it("gets the resources from a gConsent access request", () => {
      const gConsentRequest = mockGConsentRequest();
      expect(getResources(gConsentRequest)).toBe(
        gConsentRequest.credentialSubject.hasConsent.forPersonalData
      );
    });
  });
});

describe("getResourceOwner", () => {
  describe("gConsent data model", () => {
    it("gets the resource owner from a gConsent access grant", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(getResourceOwner(gConsentGrant)).toBe(
        gConsentGrant.credentialSubject.id
      );
    });

    it("gets the resource owner from a gConsent access request if present", () => {
      const gConsentRequest = mockGConsentRequest({
        resourceOwner: "https://example.org/some-owner",
      });
      expect(getResourceOwner(gConsentRequest)).toBe(
        gConsentRequest.credentialSubject.hasConsent.isConsentForDataSubject
      );
    });

    it("returns undefined if the resource owner is absent from a gConsent access request", () => {
      const gConsentRequest = mockGConsentRequest({ resourceOwner: null });
      expect(getResourceOwner(gConsentRequest)).toBeUndefined();
    });
  });
});

describe("getRequestor", () => {});

describe("getAccessModes", () => {});

describe("getId", () => {});

describe("getTypes", () => {});

describe("getIssuanceDate", () => {});

describe("getExpirationDate", () => {});

describe("getIssuer", () => {});

describe("AccessGrant", () => {});