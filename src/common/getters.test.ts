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

import { it, expect, describe, beforeAll } from "@jest/globals";
import { Store, DataFactory } from "n3";
import { promisifyEventEmitter } from "event-emitter-promisify";
import {
  mockAccessGrantVc as mockGConsentGrant,
  mockAccessRequestVc as mockGConsentRequest,
} from "../gConsent/util/access.mock";
import {
  AccessGrantWrapper,
  getAccessModes,
  getConsent,
  getCredentialSubject,
  getExpirationDate,
  getId,
  getInherit,
  getIssuanceDate,
  getIssuer,
  getPurposes,
  getRequestor,
  getResourceOwner,
  getResources,
  getTypes,
} from "./getters";
import type { AccessGrant, AccessRequest } from "../gConsent";
import { TYPE, gc } from "./constants";

const { quad, namedNode, literal, blankNode } = DataFactory;

describe("getters", () => {
  let mockedGConsentGrant: AccessGrant;
  let mockedGConsentRequest: AccessRequest;

  beforeAll(async () => {
    mockedGConsentGrant = await mockGConsentGrant();
    mockedGConsentRequest = await mockGConsentRequest();
  });

  describe("getResources", () => {
    it("gets the resources from a gConsent access grant", async () => {
      expect(getResources(mockedGConsentGrant)).toEqual(
        mockedGConsentGrant.credentialSubject.providedConsent.forPersonalData,
      );
    });

    it("errors when resources are not NamedNodes", async () => {
      const store = new Store([
        ...mockedGConsentGrant,
        quad(
          getConsent(mockedGConsentGrant),
          gc.forPersonalData,
          literal("hello world"),
        ),
      ]);

      expect(() =>
        getResources(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow(
        "Expected resource to be a Named Node. Instead got [hello world] with term type [Literal]",
      );
    });

    it("gets the resources from a gConsent access request", async () => {
      expect(getResources(mockedGConsentRequest)).toEqual(
        mockedGConsentRequest.credentialSubject.hasConsent.forPersonalData,
      );
    });
  });

  describe("getPurposes", () => {
    it("gets the purposes from a gConsent access grant as empty list when there are no purposes", async () => {
      expect(getPurposes(mockedGConsentGrant)).toEqual(
        mockedGConsentGrant.credentialSubject.providedConsent.forPurpose ?? [],
      );
    });

    it("gets the purposes from a gConsent access grant when there are multiple purposes", async () => {
      const purposes = [
        "http://example.org/example/1",
        "http://example.org/example/2",
      ];

      expect(
        getPurposes(
          await mockGConsentGrant(undefined, (grant) => {
            // eslint-disable-next-line no-param-reassign
            grant.credentialSubject.providedConsent.forPurpose = purposes;
          }),
        ),
      ).toEqual(purposes);
    });

    it("gets the purposes from a gConsent access grant", async () => {
      expect(
        getPurposes(
          await mockGConsentGrant(undefined, (object) => {
            // eslint-disable-next-line no-param-reassign
            object.credentialSubject.providedConsent.forPurpose = [
              "https://some.purpose",
            ];
          }),
        ),
      ).toEqual(["https://some.purpose"]);
    });

    it("gets the purposes from a gConsent access request", async () => {
      expect(getPurposes(mockedGConsentRequest)).toEqual(
        mockedGConsentRequest.credentialSubject.hasConsent.forPurpose ?? [],
      );
    });

    it("errors when purposes are not NamedNodes", async () => {
      const store = new Store([
        ...mockedGConsentGrant,
        quad(
          getConsent(mockedGConsentGrant),
          gc.forPurpose,
          literal("hello world"),
        ),
      ]);

      expect(() =>
        getPurposes(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow(
        "Expected purpose to be Named Node. Instead got [hello world] with term type [Literal]",
      );
    });

    it("errors if there are multiple consents present", async () => {
      const store = new Store([
        ...mockedGConsentGrant,
        quad(
          getCredentialSubject(mockedGConsentGrant),
          gc.providedConsent,
          blankNode(),
        ),
        quad(
          getCredentialSubject(mockedGConsentGrant),
          gc.hasConsent,
          blankNode(),
        ),
      ]);

      expect(() =>
        getPurposes(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow("Expected exactly 1 consent value. Found 3.");
    });

    it("errors if the consent is a NamedNode", async () => {
      const store = new Store([...mockedGConsentGrant]);

      await promisifyEventEmitter(
        store.removeMatches(
          getCredentialSubject(mockedGConsentGrant) as any,
          gc.providedConsent,
        ),
      );

      store.add(
        quad(
          getCredentialSubject(mockedGConsentGrant),
          gc.hasConsent,
          literal("hello world"),
        ),
      );

      expect(() =>
        getPurposes(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow(
        "Expected consent to be a Named Node or Blank Node, instead got [Literal].",
      );
    });
  });

  describe("getResourceOwner", () => {
    it("gets the resource owner from a gConsent access grant", async () => {
      expect(getResourceOwner(mockedGConsentGrant)).toBe(
        mockedGConsentGrant.credentialSubject.id,
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
      const gConsentRequest = await mockGConsentRequest({
        resourceOwner: null,
      });
      expect(getResourceOwner(gConsentRequest)).toBeUndefined();
    });
  });

  describe("getRequestor", () => {
    it("gets the recipient of a gConsent access grant", async () => {
      expect(getRequestor(mockedGConsentGrant)).toBe(
        mockedGConsentGrant.credentialSubject.providedConsent.isProvidedTo,
      );
    });

    it("errors if there are multiple requestors", async () => {
      const store = new Store([...mockedGConsentGrant]);

      store.addQuad(
        getConsent(mockedGConsentGrant),
        gc.isProvidedTo,
        namedNode("http://example.org/another/requestor"),
      );

      expect(() =>
        getRequestor(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow("Expected exactly one result. Found 2.");
    });

    it("errors if there are multiple consent objects", async () => {
      const store = new Store([...mockedGConsentGrant]);

      store.addQuad(
        getCredentialSubject(mockedGConsentGrant),
        gc.providedConsent,
        namedNode("http://example.org/another/consent"),
      );

      expect(() =>
        getRequestor(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow("Expected exactly one result. Found 2.");
    });

    it("gets the resource owner from a gConsent access request", async () => {
      expect(getRequestor(mockedGConsentRequest)).toBe(
        mockedGConsentRequest.credentialSubject.id,
      );
    });
  });

  describe("getAccessModes", () => {
    it("gets the access modes of a gConsent access grant", async () => {
      expect(
        mockedGConsentGrant.credentialSubject.providedConsent.mode,
      ).toStrictEqual(["http://www.w3.org/ns/auth/acl#Read"]);
      expect(getAccessModes(mockedGConsentGrant)).toStrictEqual({
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

  describe("getId", () => {
    it("gets the gConsent access grant id", async () => {
      expect(getId(mockedGConsentGrant)).toBe(mockedGConsentGrant.id);
    });

    it("gets the gConsent access request id", async () => {
      expect(getId(mockedGConsentRequest)).toBe(mockedGConsentRequest.id);
    });
  });

  describe("getTypes", () => {
    it("gets the gConsent access grant types", async () => {
      for (const type of mockedGConsentGrant.type) {
        expect(getTypes(mockedGConsentGrant)).toContainEqual(type);
      }
    });

    it("errors if there are non NamedNode grant types", async () => {
      const store = new Store([
        ...mockedGConsentGrant,
        quad(
          namedNode(mockedGConsentGrant.id),
          TYPE,
          literal("this is a literal"),
        ),
      ]);

      expect(() =>
        getTypes(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow(
        "Expected every type to be a Named Node, but found [this is a literal] with term type [Literal]",
      );
    });

    it("gets the gConsent access request id", async () => {
      for (const type of mockedGConsentRequest.type) {
        expect(getTypes(mockedGConsentRequest)).toContainEqual(type);
      }
    });

    it("errors if there are non NamedNode request types", async () => {
      const store = new Store([
        ...mockedGConsentRequest,
        quad(
          namedNode(mockedGConsentRequest.id),
          TYPE,
          literal("this is a literal"),
        ),
      ]);

      expect(() =>
        getTypes(Object.assign(store, { id: mockedGConsentRequest.id })),
      ).toThrow(
        "Expected every type to be a Named Node, but found [this is a literal] with term type [Literal]",
      );
    });
  });

  describe("getIssuanceDate", () => {
    it("gets the gConsent access issuance date", async () => {
      const issuanceDate = new Date().toString();
      const gConsentGrant = await mockGConsentGrant(undefined, (obj) => {
        // eslint-disable-next-line no-param-reassign
        obj.issuanceDate = issuanceDate;
      });
      expect(getIssuanceDate(gConsentGrant)).toStrictEqual(
        new Date(issuanceDate),
      );
    });

    it("gets the gConsent access request issuance date", async () => {
      const issuanceDate = new Date().toString();
      const gConsentRequest = await mockGConsentRequest(undefined, (obj) => {
        // eslint-disable-next-line no-param-reassign
        obj.issuanceDate = issuanceDate;
      });
      expect(getIssuanceDate(gConsentRequest)).toStrictEqual(
        new Date(issuanceDate),
      );
    });
  });

  describe("getExpirationDate", () => {
    it("gets the gConsent access expiration date", async () => {
      const expirationDate = new Date().toString();
      const gConsentGrant = await mockGConsentGrant(undefined, (obj) => {
        // eslint-disable-next-line no-param-reassign
        obj.expirationDate = expirationDate;
      });
      expect(getExpirationDate(gConsentGrant)).toStrictEqual(
        new Date(expirationDate),
      );
    });

    it("errors if the expiration date is a NamedNode", async () => {
      const store = new Store([...mockedGConsentGrant]);

      store.addQuad(
        namedNode(getId(mockedGConsentGrant)),
        namedNode("https://www.w3.org/2018/credentials#expirationDate"),
        namedNode("http://example.org/this/is/a/date"),
      );

      expect(() =>
        getExpirationDate(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow(
        "Expected expiration date to be a Literal. Found [http://example.org/this/is/a/date] of type [NamedNode].",
      );
    });

    it("errors if the expiration date is a literal without xsd:type", async () => {
      const store = new Store([...mockedGConsentGrant]);

      store.addQuad(
        namedNode(getId(mockedGConsentGrant)),
        namedNode("https://www.w3.org/2018/credentials#expirationDate"),
        literal("boo"),
      );

      expect(() =>
        getExpirationDate(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow(
        "Expected date to be a dateTime; recieved [http://www.w3.org/2001/XMLSchema#string]",
      );
    });

    it("gets the gConsent access request expiration date", async () => {
      const expirationDate = new Date().toString();
      const gConsentRequest = await mockGConsentRequest(undefined, (obj) => {
        // eslint-disable-next-line no-param-reassign
        obj.expirationDate = expirationDate;
      });
      expect(getExpirationDate(gConsentRequest)).toStrictEqual(
        new Date(expirationDate),
      );
    });
  });

  describe("getIssuer", () => {
    it("gets the gConsent access grant issuer", async () => {
      expect(getIssuer(mockedGConsentGrant)).toStrictEqual(
        mockedGConsentGrant.issuer,
      );
    });

    it("gets the gConsent access request issuer", async () => {
      expect(getIssuer(mockedGConsentRequest)).toStrictEqual(
        mockedGConsentRequest.issuer,
      );
    });
  });

  describe("getInherit", () => {
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

  describe("AccessGrant", () => {
    it("wraps calls to the underlying functions", async () => {
      const wrappedConsentRequest = new AccessGrantWrapper(
        mockedGConsentRequest,
      );
      expect(wrappedConsentRequest.getAccessModes()).toStrictEqual(
        getAccessModes(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getExpirationDate()).toStrictEqual(
        getExpirationDate(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getId()).toStrictEqual(
        getId(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getIssuanceDate()).toStrictEqual(
        getIssuanceDate(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getIssuer()).toStrictEqual(
        getIssuer(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getRequestor()).toStrictEqual(
        getRequestor(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getResourceOwner()).toStrictEqual(
        getResourceOwner(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getResources()).toStrictEqual(
        getResources(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getTypes()).toStrictEqual(
        getTypes(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getInherit()).toStrictEqual(
        getInherit(mockedGConsentRequest),
      );
    });
  });
});
