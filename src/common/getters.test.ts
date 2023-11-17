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

import { it, expect, describe, jest } from "@jest/globals";
import {
  mockAccessGrantVc as mockGConsentGrant,
  mockAccessRequestVc as mockGConsentRequest,
} from "../gConsent/util/access.mock";
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

jest.mock("@inrupt/universal-fetch", () => ({
  fetch: (async (...args) => {
    throw new Error(`tried to fetch ${args[0]}`);
  }) as typeof fetch,
}));

describe("getResources", () => {
  describe("gConsent data model", () => {
    it("gets the resources from a gConsent access grant", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(getResources(gConsentGrant)).toEqual(
        gConsentGrant.credentialSubject.providedConsent.forPersonalData,
      );
    });

    it("gets the resources from a gConsent access request", async () => {
      const gConsentRequest = await mockGConsentRequest();
      expect(getResources(gConsentRequest)).toEqual(
        gConsentRequest.credentialSubject.hasConsent.forPersonalData,
      );
    });
  });
});

describe("getResourceOwner", () => {
  describe("gConsent data model", () => {
    it("gets the resource owner from a gConsent access grant", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(getResourceOwner(gConsentGrant)).toBe(
        gConsentGrant.credentialSubject.id,
      );
    });

    it("gets the resource owner from a gConsent access request if present", async () => {
      const gConsentRequest = await mockGConsentRequest({
        resourceOwner: "https://example.org/some-owner",
      });
      expect(getResourceOwner(gConsentRequest)).toBe(
        gConsentRequest.credentialSubject.hasConsent.isConsentForDataSubject,
      );
    });

    it("returns undefined if the resource owner is absent from a gConsent access request", async () => {
      const gConsentRequest = await mockGConsentRequest(
        {
          resourceOwner: null,
        },
        {
          // The resource owner is actually required on access requests
          skipValidation: true,
        },
      );
      expect(getResourceOwner(gConsentRequest)).toBeUndefined();
    });
  });
});

describe("getRequestor", () => {
  describe("gConsent data model", () => {
    it("gets the recipient of a gConsent access grant", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(getRequestor(gConsentGrant)).toBe(
        gConsentGrant.credentialSubject.providedConsent.isProvidedTo,
      );
    });

    it("gets the resource owner from a gConsent access request", async () => {
      const gConsentRequest = await mockGConsentRequest();
      expect(getRequestor(gConsentRequest)).toBe(
        gConsentRequest.credentialSubject.id,
      );
    });
  });
});

describe("getAccessModes", () => {
  describe("gConsent data model", () => {
    it("gets the access modes of a gConsent access grant", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(
        gConsentGrant.credentialSubject.providedConsent.mode,
      ).toStrictEqual(["http://www.w3.org/ns/auth/acl#Read"]);
      expect(getAccessModes(gConsentGrant)).toStrictEqual({
        read: true,
        append: false,
        write: false,
      });
    });

    it("gets the access modes from a gConsent access request", async () => {
      const gConsentRequest = await mockGConsentRequest({
        modes: ["Append", "Read", "Write"],
      });
      expect(getAccessModes(gConsentRequest)).toStrictEqual({
        read: true,
        append: true,
        write: true,
      });
    });
  });
});

describe("getId", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant id", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(getId(gConsentGrant)).toBe(gConsentGrant.id);
    });

    it("gets the gConsent access request id", async () => {
      const gConsentRequest = await mockGConsentRequest();
      expect(getId(gConsentRequest)).toBe(gConsentRequest.id);
    });
  });
});

describe("getTypes", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant types", async () => {
      const gConsentGrant = await mockGConsentGrant();
      for (const type of gConsentGrant.type) {
        expect(getTypes(gConsentGrant)).toContainEqual(type);
      }
    });

    it("gets the gConsent access request id", async () => {
      const gConsentRequest = await mockGConsentRequest();
      for (const type of gConsentRequest.type) {
        expect(getTypes(gConsentRequest)).toContainEqual(type);
      }
    });
  });
});

describe("getIssuanceDate", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access issuance date", async () => {
      const issuanceDate = new Date().toString();
      const gConsentGrant = await mockGConsentGrant(
        undefined,
        undefined,
        (obj) => {
          // eslint-disable-next-line no-param-reassign
          obj.issuanceDate = issuanceDate;
        },
      );
      expect(getIssuanceDate(gConsentGrant)).toStrictEqual(
        new Date(issuanceDate),
      );
    });

    it("gets the gConsent access request issuance date", async () => {
      const issuanceDate = new Date().toString();
      const gConsentRequest = await mockGConsentRequest(
        undefined,
        undefined,
        (obj) => {
          // eslint-disable-next-line no-param-reassign
          obj.issuanceDate = issuanceDate;
        },
      );
      expect(getIssuanceDate(gConsentRequest)).toStrictEqual(
        new Date(issuanceDate),
      );
    });
  });
});

describe("getExpirationDate", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access expiration date", async () => {
      const expirationDate = new Date().toString();
      const gConsentGrant = await mockGConsentGrant(
        undefined,
        undefined,
        (obj) => {
          // eslint-disable-next-line no-param-reassign
          obj.expirationDate = expirationDate;
        },
      );
      expect(getExpirationDate(gConsentGrant)).toStrictEqual(
        new Date(expirationDate),
      );
    });

    it("gets the gConsent access request expiration date", async () => {
      const expirationDate = new Date().toString();
      const gConsentRequest = await mockGConsentRequest(
        undefined,
        undefined,
        (obj) => {
          // eslint-disable-next-line no-param-reassign
          obj.expirationDate = expirationDate;
        },
      );
      expect(getExpirationDate(gConsentRequest)).toStrictEqual(
        new Date(expirationDate),
      );
    });
  });
});

describe("getIssuer", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant issuer", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(getIssuer(gConsentGrant)).toStrictEqual(gConsentGrant.issuer);
    });

    it("gets the gConsent access request issuer", async () => {
      const gConsentRequest = await mockGConsentRequest();
      expect(getIssuer(gConsentRequest)).toStrictEqual(gConsentRequest.issuer);
    });
  });
});

describe("getInherit", () => {
  describe("gConsent data model", () => {
    it("gets the gConsent access grant issuer", async () => {
      const gConsentGrant = await mockGConsentGrant({ inherit: false });
      expect(getIssuer(gConsentGrant)).toStrictEqual(gConsentGrant.issuer);
    });

    it("defaults the recursive nature from a gConsent access grant to true", async () => {
      const gConsentGrant = await mockGConsentGrant({ inherit: undefined });
      expect(getInherit(gConsentGrant)).toBe(true);
    });

    it("gets the recursive nature from a gConsent access request", async () => {
      const gConsentRequest = await mockGConsentRequest({ inherit: false });
      expect(getInherit(gConsentRequest)).toBe(false);
    });

    it("defaults the recursive nature from a gConsent access request to true", async () => {
      const gConsentRequest = await mockGConsentRequest({ inherit: undefined });
      expect(getInherit(gConsentRequest)).toBe(true);
    });
  });
});

describe("AccessGrant", () => {
  it("wraps calls to the underlying functions", async () => {
    const gConsentRequest = await mockGConsentRequest();
    const wrappedConsentRequest = new AccessGrantWrapper(gConsentRequest);
    expect(wrappedConsentRequest.getAccessModes()).toStrictEqual(
      getAccessModes(gConsentRequest),
    );
    expect(wrappedConsentRequest.getExpirationDate()).toStrictEqual(
      getExpirationDate(gConsentRequest),
    );
    expect(wrappedConsentRequest.getId()).toStrictEqual(getId(gConsentRequest));
    expect(wrappedConsentRequest.getIssuanceDate()).toStrictEqual(
      getIssuanceDate(gConsentRequest),
    );
    expect(wrappedConsentRequest.getIssuer()).toStrictEqual(
      getIssuer(gConsentRequest),
    );
    expect(wrappedConsentRequest.getRequestor()).toStrictEqual(
      getRequestor(gConsentRequest),
    );
    expect(wrappedConsentRequest.getResourceOwner()).toStrictEqual(
      getResourceOwner(gConsentRequest),
    );
    expect(wrappedConsentRequest.getResources()).toStrictEqual(
      getResources(gConsentRequest),
    );
    expect(wrappedConsentRequest.getTypes()).toStrictEqual(
      getTypes(gConsentRequest),
    );
  });
});
