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

import { it, expect, describe } from "@jest/globals";
import {
  mockAccessGrantVc as mockGConsentGrant,
  mockAccessRequestVc as mockGConsentRequest,
} from "../gConsent/util/access.mock";
import { mockOdrlGrant } from "../odrl/util/access.mock";
import {
  AccessGrantWrapper,
  getAccessModes,
  getExpirationDate,
  getId,
  getInherit,
  getIssuanceDate,
  getIssuer,
  getRequestor,
  getResourceOwner,
  getResources,
  getTypes,
} from "./getters";

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
  describe("ODRL data model", () => {
    it("gets the resources from an ODRL access grant", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getResources(odrlGrant)).toEqual([
        odrlGrant.credentialSubject.permission[0].target,
      ]);
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

  describe("ODRL data model", () => {
    it("gets the resource owner from an ODRL access grant", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getResourceOwner(odrlGrant)).toBe(odrlGrant.credentialSubject.id);
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
  describe("ODRL data model", () => {
    it("gets the recipient of an ODRL access grant", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getRequestor(odrlGrant)).toBe(
        odrlGrant.credentialSubject.assignee
      );
    });
  });
});

describe("getAccessModes", () => {
  describe("gConsent data model", () => {
    it("gets the access modes of a gConsent access grant", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(
        gConsentGrant.credentialSubject.providedConsent.mode
      ).toStrictEqual(["http://www.w3.org/ns/auth/acl#Read"]);
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
  describe("ODRL data model", () => {
    it("gets the access modes of an ODRL access grant", () => {
      const odrlGrant = mockOdrlGrant();
      expect(odrlGrant.credentialSubject.permission[0].action).toStrictEqual([
        "http://www.w3.org/ns/auth/acl#Read",
        "http://www.w3.org/ns/auth/acl#Write",
      ]);
      expect(getAccessModes(odrlGrant)).toStrictEqual({
        read: true,
        append: false,
        write: true,
      });
    });
  });
});

describe("getId", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant id", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(getId(gConsentGrant)).toBe(gConsentGrant.id);
    });

    it("gets the gConsent access request id", () => {
      const gConsentRequest = mockGConsentRequest();
      expect(getId(gConsentRequest)).toBe(gConsentRequest.id);
    });
  });
  describe("ODRL data model", () => {
    it("gets the ODRL access grant id", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getId(odrlGrant)).toBe(odrlGrant.id);
    });
  });
});

describe("getTypes", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant types", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(getTypes(gConsentGrant)).toBe(gConsentGrant.type);
    });

    it("gets the gConsent access request id", () => {
      const gConsentRequest = mockGConsentRequest();
      expect(getTypes(gConsentRequest)).toBe(gConsentRequest.type);
    });
  });
  describe("ODRL data model", () => {
    it("gets the ODRL access grant types", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getTypes(odrlGrant)).toBe(odrlGrant.type);
    });
  });
});

describe("getIssuanceDate", () => {
  describe("gConsent data model", () => {
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
  describe("ODRL data model", () => {
    it("gets the ODRL access issuance date", () => {
      const odrlGrant = mockOdrlGrant();
      odrlGrant.issuanceDate = new Date().toString();
      expect(getIssuanceDate(odrlGrant)).toStrictEqual(
        new Date(odrlGrant.issuanceDate)
      );
    });
  });
});

describe("getExpirationDate", () => {
  describe("gConsent data model", () => {
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
  describe("ODRL data model", () => {
    it("gets the ODRL access expiration date", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getExpirationDate(odrlGrant)).toStrictEqual(
        new Date(odrlGrant.expirationDate as string)
      );
    });
  });
});

describe("getIssuer", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant issuer", () => {
      const gConsentGrant = mockGConsentGrant();
      expect(getIssuer(gConsentGrant)).toStrictEqual(gConsentGrant.issuer);
    });

    it("gets the gConsent access request issuer", () => {
      const gConsentRequest = mockGConsentRequest();
      expect(getIssuer(gConsentRequest)).toStrictEqual(gConsentRequest.issuer);
    });
  });
  describe("ODRL data model", () => {
    it("gets the ODRL access grant issuer", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getIssuer(odrlGrant)).toStrictEqual(odrlGrant.issuer);
    });
  });
});

describe("getInherit", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant issuer", () => {
      const gConsentGrant = mockGConsentGrant({ inherit: false });
      expect(getIssuer(gConsentGrant)).toStrictEqual(gConsentGrant.issuer);
    });

    it("defaults the recursive nature from a gConsent access grant to true", () => {
      const gConsentGrant = mockGConsentGrant({ inherit: undefined });
      expect(getInherit(gConsentGrant)).toBe(true);
    });

    it("gets the recursive nature from a gConsent access request", () => {
      const gConsentRequest = mockGConsentRequest({ inherit: false });
      expect(getInherit(gConsentRequest)).toBe(false);
    });

    it("defaults the recursive nature from a gConsent access request to true", () => {
      const gConsentRequest = mockGConsentRequest({ inherit: undefined });
      expect(getInherit(gConsentRequest)).toBe(true);
    });
  });

  describe("ODRL data model", () => {
    it("gets the recursive nature of an ODRL access grant", () => {
      const odrlGrant = mockOdrlGrant();
      expect(getInherit(odrlGrant)).toBe(true);
    });
  });
});

describe("AccessGrant", () => {
  it("wraps calls to the underlying functions", () => {
    const gConsentRequest = mockGConsentRequest();
    const wrappedConsentRequest = new AccessGrantWrapper(gConsentRequest);
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
