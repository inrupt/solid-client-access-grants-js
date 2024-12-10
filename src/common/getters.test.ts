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
  getCustomBoolean,
  getConsent,
  getCredentialSubject,
  getCustomFields,
  getCustomFloat,
  getExpirationDate,
  getId,
  getInbox,
  getInherit,
  getCustomInteger,
  getIssuanceDate,
  getIssuer,
  getPurposes,
  getRequestor,
  getResourceOwner,
  getResources,
  getCustomString,
  getTypes,
  getCustomIntegers,
  getCustomBooleans,
  getCustomFloats,
  getCustomStrings,
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

    it("supports alternate gc:isProvidedToPerson", async () => {
      const store = new Store([...mockedGConsentGrant]);
      const isProvidedToQuad = store
        .match(null, gc.isProvidedTo, null, null)
        .read();
      if (isProvidedToQuad !== null) {
        store.removeQuad(
          isProvidedToQuad.subject,
          isProvidedToQuad.predicate,
          isProvidedToQuad.object,
        );
      }
      store.addQuad(
        getConsent(mockedGConsentGrant),
        gc.isProvidedToPerson,
        namedNode("http://example.org/another/requestorPerson"),
      );

      expect(
        getRequestor(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toBe("http://example.org/another/requestorPerson");
    });

    it("supports alternate gc:isProvidedToController", async () => {
      const store = new Store([...mockedGConsentGrant]);
      const isProvidedToQuad = store
        .match(null, gc.isProvidedTo, null, null)
        .read();
      if (isProvidedToQuad !== null) {
        store.removeQuad(
          isProvidedToQuad.subject,
          isProvidedToQuad.predicate,
          isProvidedToQuad.object,
        );
      }
      store.addQuad(
        getConsent(mockedGConsentGrant),
        gc.isProvidedToController,
        namedNode("http://example.org/another/requestorController"),
      );

      expect(
        getRequestor(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toBe("http://example.org/another/requestorController");
    });

    it("errors out if more than one alternate predicate is present", async () => {
      const store = new Store([...mockedGConsentGrant]);
      store.addQuad(
        getConsent(mockedGConsentGrant),
        gc.isProvidedToController,
        namedNode("http://example.org/another/requestorController"),
      );

      store.addQuad(
        getConsent(mockedGConsentGrant),
        gc.isProvidedToPerson,
        namedNode("http://example.org/another/requestorPerson"),
      );

      expect(() =>
        getRequestor(Object.assign(store, { id: mockedGConsentGrant.id })),
      ).toThrow("Too many requestors found.");
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

  describe("getInbox", () => {
    it("returns the inbox if available", async () => {
      const gConsentGrant = await mockGConsentGrant({
        inbox: "https://some.inbox",
      });
      expect(getInbox(gConsentGrant)).toBe("https://some.inbox");
    });

    it("returns undefined if the inbox if not available", async () => {
      const gConsentGrant = await mockGConsentGrant();
      expect(getInbox(gConsentGrant)).toBeUndefined();
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

  describe("getCustomFields", () => {
    it("gets all the custom fields from an access request", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: "customValue",
        },
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: true,
        },
        {
          key: new URL("https://example.org/ns/customInt"),
          value: 1,
        },
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: 1.1,
        },
        {
          key: new URL("https://example.org/ns/customStringArray"),
          value: ["customValue", "otherCustomValue"],
        },
        {
          key: new URL("https://example.org/ns/customBooleanArray"),
          value: [true, false],
        },
        {
          key: new URL("https://example.org/ns/customIntArray"),
          value: [1, 2],
        },
        {
          key: new URL("https://example.org/ns/customFloatArray"),
          value: [1.1, 2.2],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(getCustomFields(gConsentRequest)).toEqual({
        "https://example.org/ns/customString": "customValue",
        "https://example.org/ns/customBoolean": true,
        "https://example.org/ns/customInt": 1,
        "https://example.org/ns/customFloat": 1.1,
        "https://example.org/ns/customStringArray": [
          "customValue",
          "otherCustomValue",
        ],
        "https://example.org/ns/customBooleanArray": [true, false],
        "https://example.org/ns/customIntArray": [1, 2],
        "https://example.org/ns/customFloatArray": [1.1, 2.2],
      });
    });

    it("returns an empty object if no custom fields are found", async () => {
      expect(getCustomFields(await mockGConsentRequest())).toStrictEqual({});
    });

    it("supports the custom fields being arrays of mixed types", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customField"),
          value: "customValue",
        },
        {
          key: new URL("https://example.org/ns/customField"),
          value: true,
        },
        {
          key: new URL("https://example.org/ns/customField"),
          value: 1,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(getCustomFields(gConsentRequest)).toEqual({
        "https://example.org/ns/customField": ["customValue", true, 1],
      });
    });
  });

  describe("getCustomIntegers", () => {
    it("gets an integer array value from an access grant custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: [1],
        },
      ];
      const gConsentRequest = await mockGConsentGrant({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const i: number[] = getCustomIntegers(
        gConsentRequest,
        new URL("https://example.org/ns/customInt"),
      );
      expect(i).toEqual([1]);
    });

    it("does not collapse similar values", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: [1, 1, 1],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const i: number[] = getCustomIntegers(
        gConsentRequest,
        new URL("https://example.org/ns/customInt"),
      );
      expect(i).toEqual([1, 1, 1]);
    });

    it("throws on mixed types", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: [1],
        },
        {
          key: new URL("https://example.org/ns/customInt"),
          value: "not an int",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomIntegers(
          gConsentRequest,
          new URL("https://example.org/ns/customInt"),
        ),
      ).toThrow();
    });

    it("gets an empty value from an access request without custom field", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const i: number[] = getCustomIntegers(
        gConsentRequest,
        new URL("https://example.org/ns/customInt"),
      );
      expect(i).toHaveLength(0);
    });
  });

  describe("getCustomBooleans", () => {
    it("gets a boolean array value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: [true],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const b: boolean[] = getCustomBooleans(
        gConsentRequest,
        new URL("https://example.org/ns/customBoolean"),
      );
      expect(b).toEqual([true]);
    });

    it("does not collapse similar values", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: [true, true, true],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const b: boolean[] = getCustomBooleans(
        gConsentRequest,
        new URL("https://example.org/ns/customBoolean"),
      );
      expect(b).toEqual([true, true, true]);
    });

    it("throws on mixed types", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: true,
        },
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: "not a boolean",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomBooleans(
          gConsentRequest,
          new URL("https://example.org/ns/customBoolean"),
        ),
      ).toThrow();
    });

    it("gets an empty value from an access request without custom field", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const b: boolean[] = getCustomBooleans(
        gConsentRequest,
        new URL("https://example.org/ns/customBoolean"),
      );
      expect(b).toHaveLength(0);
    });
  });

  describe("getCustomFloats", () => {
    it("gets a float array value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: [1.1],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const d: number[] = getCustomFloats(
        gConsentRequest,
        new URL("https://example.org/ns/customFloat"),
      );
      expect(d).toEqual([1.1]);
    });

    it("does not collapse similar values", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: [1.1, 1.1, 1.1],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const d: number[] = getCustomFloats(
        gConsentRequest,
        new URL("https://example.org/ns/customFloat"),
      );
      expect(d).toEqual([1.1, 1.1, 1.1]);
    });

    it("throws on mixed types", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: 1.1,
        },
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: "not a float",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomFloats(
          gConsentRequest,
          new URL("https://example.org/ns/customFloat"),
        ),
      ).toThrow();
    });

    it("gets an empty value from an access request without custom field", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const d: number[] = getCustomFloats(
        gConsentRequest,
        new URL("https://example.org/ns/customFloat"),
      );
      expect(d).toHaveLength(0);
    });
  });

  describe("getCustomStrings", () => {
    it("gets a string array value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: ["custom value"],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const s: string[] = getCustomStrings(
        gConsentRequest,
        new URL("https://example.org/ns/customString"),
      );
      expect(s).toEqual(["custom value"]);
    });

    it("does not collapse similar values", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: ["some value", "some value", "some value"],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const s: string[] = getCustomStrings(
        gConsentRequest,
        new URL("https://example.org/ns/customString"),
      );
      expect(s).toEqual(["some value", "some value", "some value"]);
    });

    it("throws on mixed types", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: "some value",
        },
        {
          key: new URL("https://example.org/ns/customString"),
          // Not a string
          value: false,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomFloats(
          gConsentRequest,
          new URL("https://example.org/ns/customString"),
        ),
      ).toThrow();
    });

    it("gets an empty value from an access request without custom field", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const s: string[] = getCustomStrings(
        gConsentRequest,
        new URL("https://example.org/ns/customString"),
      );
      expect(s).toHaveLength(0);
    });
  });

  describe("getCustomInteger", () => {
    it("gets an integer value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: 1,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const i: number | undefined = getCustomInteger(
        gConsentRequest,
        new URL("https://example.org/ns/customInt"),
      );
      expect(i).toBe(1);
    });

    it("returns undefined if no matching custom field is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: 1,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const i: number | undefined = getCustomInteger(
        gConsentRequest,
        new URL("https://example.org/ns/anotherCustomInt"),
      );
      expect(i).toBeUndefined();
    });

    it("returns undefined if no custom field is available", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const i: number | undefined = getCustomInteger(
        gConsentRequest,
        new URL("https://example.org/ns/customInt"),
      );
      expect(i).toBeUndefined();
    });

    it("throws if more than one value is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: [1, 2],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomInteger(
          gConsentRequest,
          new URL("https://example.org/ns/customInt"),
        ),
      ).toThrow();
    });

    it("throws on type mismatch", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customInt"),
          value: "not an int",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomInteger(
          gConsentRequest,
          new URL("https://example.org/ns/customInt"),
        ),
      ).toThrow();
    });
  });

  describe("getCustomBoolean", () => {
    it("gets a boolean value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: true,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const bool: boolean | undefined = getCustomBoolean(
        gConsentRequest,
        new URL("https://example.org/ns/customBoolean"),
      );
      expect(bool).toBe(true);
    });

    it("returns undefined if no matching custom field is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: true,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const b: boolean | undefined = getCustomBoolean(
        gConsentRequest,
        new URL("https://example.org/ns/anotherCustomBoolean"),
      );
      expect(b).toBeUndefined();
    });

    it("returns undefined if no custom field is available", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const b: boolean | undefined = getCustomBoolean(
        gConsentRequest,
        new URL("https://example.org/ns/customBoolean"),
      );
      expect(b).toBeUndefined();
    });

    it("throws if more than one value is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: [true, false],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomBoolean(
          gConsentRequest,
          new URL("https://example.org/ns/customBoolean"),
        ),
      ).toThrow();
    });

    it("throws on type mismatch", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customBoolean"),
          value: "not a boolean",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomBoolean(
          gConsentRequest,
          new URL("https://example.org/ns/customBoolean"),
        ),
      ).toThrow();
    });
  });

  describe("getCustomFloat", () => {
    it("gets a float value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: 1.1,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const d: number | undefined = getCustomFloat(
        gConsentRequest,
        new URL("https://example.org/ns/customFloat"),
      );
      expect(d).toBe(1.1);
    });

    it("returns undefined if no matching custom field is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: true,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const d: number | undefined = getCustomFloat(
        gConsentRequest,
        new URL("https://example.org/ns/anotherCustomFloat"),
      );
      expect(d).toBeUndefined();
    });

    it("returns undefined if no custom field is available", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const d: number | undefined = getCustomFloat(
        gConsentRequest,
        new URL("https://example.org/ns/customFloat"),
      );
      expect(d).toBeUndefined();
    });

    it("throws if more than one value is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: [1.1, 2.2],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomFloat(
          gConsentRequest,
          new URL("https://example.org/ns/customFloat"),
        ),
      ).toThrow();
    });

    it("throws on type mismatch", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customFloat"),
          value: "not a float",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomFloat(
          gConsentRequest,
          new URL("https://example.org/ns/customFloat"),
        ),
      ).toThrow();
    });
  });

  describe("getCustomString", () => {
    it("gets a string value from an access request custom field", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: "some value",
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const s: string | undefined = getCustomString(
        gConsentRequest,
        new URL("https://example.org/ns/customString"),
      );
      expect(s).toBe("some value");
    });

    it("returns undefined if no matching custom field is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: true,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      // This shows the typing of the return is correct.
      const s: string | undefined = getCustomString(
        gConsentRequest,
        new URL("https://example.org/ns/anotherCustomString"),
      );
      expect(s).toBeUndefined();
    });

    it("returns undefined if no custom field is available", async () => {
      const gConsentRequest = await mockGConsentRequest();
      // This shows the typing of the return is correct.
      const s: string | undefined = getCustomString(
        gConsentRequest,
        new URL("https://example.org/ns/customString"),
      );
      expect(s).toBeUndefined();
    });

    it("throws if more than one value is available", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          value: ["some value", "some other value"],
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomString(
          gConsentRequest,
          new URL("https://example.org/ns/customString"),
        ),
      ).toThrow();
    });

    it("throws on type mismatch", async () => {
      const customFields = [
        {
          key: new URL("https://example.org/ns/customString"),
          // Not a string
          value: false,
        },
      ];
      const gConsentRequest = await mockGConsentRequest({
        custom: customFields,
      });
      expect(() =>
        getCustomString(
          gConsentRequest,
          new URL("https://example.org/ns/customString"),
        ),
      ).toThrow();
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
      expect(wrappedConsentRequest.getPurposes()).toStrictEqual(
        getPurposes(mockedGConsentRequest),
      );
      expect(wrappedConsentRequest.getInbox()).toStrictEqual(
        getInbox(mockedGConsentRequest),
      );
    });
  });
});
