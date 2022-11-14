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
import {
  AccessGrant,
  getAccessModes,
  getExpirationDate,
  getId,
  getIssuanceDate,
  getIssuer,
  getRequestor,
  getResourceOwner,
  getResources,
  getTypes,
} from "./getter";

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

describe("getRequestor", () => {
  describe("gConsent data model", () => {
    it("gets the recipient of a gConsent access grant", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(getRequestor(gConsentGrant)).toBe(
        gConsentGrant.credentialSubject.providedConsent.isProvidedTo
      );
    });

    it("gets the resource owner from a gConsent access request", () => {
      const gConsentRequest = mockGConsentRequest();
      expect(getRequestor(gConsentRequest)).toBe(
        gConsentRequest.credentialSubject.id
      );
    });
  });
});

describe("getAccessModes", () => {
  it("gets the access modes of a gConsent access grant", () => {
    const gConsentGrant = mockGConsentGrant();
    expect(gConsentGrant.credentialSubject.providedConsent.mode).toStrictEqual([
      "http://www.w3.org/ns/auth/acl#Read",
    ]);
    expect(getAccessModes(gConsentGrant)).toStrictEqual({
      read: true,
      append: false,
      write: false,
    });
  });

  it("gets the access modes from a gConsent access request", () => {
    const gConsentRequest = mockGConsentRequest({
      modes: [
        "http://www.w3.org/ns/auth/acl#Append",
        "http://www.w3.org/ns/auth/acl#Read",
        "http://www.w3.org/ns/auth/acl#Write",
      ],
    });
    expect(getAccessModes(gConsentRequest)).toStrictEqual({
      read: true,
      append: true,
      write: true,
    });
  });
});

describe("getId", () => {
  it("gets the gConsent access grant id", () => {
    const gConsentGrant = mockGConsentGrant();
    expect(getId(gConsentGrant)).toBe(gConsentGrant.id);
  });

  it("gets the gConsent access request id", () => {
    const gConsentRequest = mockGConsentRequest();
    expect(getId(gConsentRequest)).toBe(gConsentRequest.id);
  });
});

describe("getTypes", () => {
  it("gets the gConsent access grant types", () => {
    const gConsentGrant = mockGConsentGrant();
    expect(getTypes(gConsentGrant)).toBe(gConsentGrant.type);
  });

  it("gets the gConsent access request id", () => {
    const gConsentRequest = mockGConsentRequest();
    expect(getTypes(gConsentRequest)).toBe(gConsentRequest.type);
  });
});

describe("getIssuanceDate", () => {
  it("gets the gConsent access issuance date", () => {
    const gConsentGrant = mockGConsentGrant();
    gConsentGrant.issuanceDate = new Date().toString();
    expect(getIssuanceDate(gConsentGrant)).toStrictEqual(
      new Date(gConsentGrant.issuanceDate)
    );
  });

  it("gets the gConsent access request issuance date", () => {
    const gConsentRequest = mockGConsentRequest();
    gConsentRequest.issuanceDate = new Date().toString();
    expect(getIssuanceDate(gConsentRequest)).toStrictEqual(
      new Date(gConsentRequest.issuanceDate)
    );
  });
});

describe("getExpirationDate", () => {
  it("gets the gConsent access expiration date", () => {
    const gConsentGrant = mockGConsentGrant();
    gConsentGrant.expirationDate = new Date().toString();
    expect(getExpirationDate(gConsentGrant)).toStrictEqual(
      new Date(gConsentGrant.expirationDate)
    );
  });

  it("gets the gConsent access request expiration date", () => {
    const gConsentRequest = mockGConsentRequest();
    gConsentRequest.expirationDate = new Date().toString();
    expect(getExpirationDate(gConsentRequest)).toStrictEqual(
      new Date(gConsentRequest.expirationDate)
    );
  });
});

describe("getIssuer", () => {
  it("gets the gConsent access grant issuer", () => {
    const gConsentGrant = mockGConsentGrant();
    expect(getIssuer(gConsentGrant)).toStrictEqual(gConsentGrant.issuer);
  });

  it("gets the gConsent access request issuer", () => {
    const gConsentRequest = mockGConsentRequest();
    expect(getIssuer(gConsentRequest)).toStrictEqual(gConsentRequest.issuer);
  });
});

describe("AccessGrant", () => {
  it("wraps calls to the underlying functions", () => {
    const gConsentRequest = mockGConsentRequest();
    const wrappedConsentRequest = new AccessGrant(gConsentRequest);
    expect(wrappedConsentRequest.getAccessModes()).toStrictEqual(
      getAccessModes(gConsentRequest)
    );
    expect(wrappedConsentRequest.getExpirationDate()).toStrictEqual(
      getExpirationDate(gConsentRequest)
    );
    expect(wrappedConsentRequest.getId()).toStrictEqual(getId(gConsentRequest));
    expect(wrappedConsentRequest.getIssuanceDate()).toStrictEqual(
      getIssuanceDate(gConsentRequest)
    );
    expect(wrappedConsentRequest.getIssuer()).toStrictEqual(
      getIssuer(gConsentRequest)
    );
    expect(wrappedConsentRequest.getRequestor()).toStrictEqual(
      getRequestor(gConsentRequest)
    );
    expect(wrappedConsentRequest.getResourceOwner()).toStrictEqual(
      getResourceOwner(gConsentRequest)
    );
    expect(wrappedConsentRequest.getResources()).toStrictEqual(
      getResources(gConsentRequest)
    );
    expect(wrappedConsentRequest.getTypes()).toStrictEqual(
      getTypes(gConsentRequest)
    );
  });
});
