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
import type { DatasetWithId } from "@inrupt/solid-client-vc";
import {
  getCredentialSubject,
  getExpirationDate,
  getId,
  getIssuanceDate,
  getIssuer,
} from "@inrupt/solid-client-vc";
import type {
  BlankNode,
  DatasetCore,
  Literal,
  NamedNode,
  Term,
} from "@rdfjs/types";
import { DataFactory } from "n3";
import type { AccessGrantGConsent } from "../gConsent/type/AccessGrant";
import type { AccessModes } from "../type/AccessModes";
import { INHERIT, TYPE, XSD_BOOLEAN, acl, gc, ldp } from "./constants";

const { namedNode, defaultGraph, quad, literal } = DataFactory;

/**
 * @internal
 */
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "NamedNode",
): NamedNode;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "NamedNode",
  required: false,
): NamedNode | undefined;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "Literal",
  required: false,
): Literal | undefined;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "BlankNode",
): BlankNode;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "Literal",
): Literal;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
): NamedNode | BlankNode;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: undefined,
  required: false,
): NamedNode | BlankNode | undefined;
export function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type?: Term["termType"],
  required = true,
): Term | undefined {
  const results = [...vc.match(subject, predicate, null, defaultGraph())];

  if (results.length === 0 && !required) {
    return undefined;
  }

  if (results.length !== 1) {
    throw new Error(`Expected exactly one result. Found ${results.length}.`);
  }

  const [{ object }] = results;
  const expectedTypes = type ? [type] : ["NamedNode", "BlankNode"];
  if (!expectedTypes.includes(object.termType)) {
    throw new Error(
      `Expected [${object.value}] to be a ${expectedTypes.join(
        " or ",
      )}. Found [${object.termType}]`,
    );
  }

  return object;
}
export {
  getCredentialSubject,
  getExpirationDate,
  getId,
  getIssuanceDate,
  getIssuer,
};

/**
 * @internal
 */
export function getConsent(vc: DatasetWithId) {
  const credentialSubject = getCredentialSubject(vc);
  const consents = [
    ...vc.match(credentialSubject, gc.providedConsent, null, defaultGraph()),
    ...vc.match(credentialSubject, gc.hasConsent, null, defaultGraph()),
  ];
  if (consents.length !== 1) {
    throw new Error(
      `Expected exactly 1 consent value. Found ${consents.length}.`,
    );
  }
  const [{ object }] = consents;
  if (object.termType !== "BlankNode" && object.termType !== "NamedNode") {
    throw new Error(
      `Expected consent to be a Named Node or Blank Node, instead got [${object.termType}].`,
    );
  }
  return object;
}

/**
 * Get the resources to which an Access Grant/Request applies.
 *
 * @example
 *
 * ```
 * const resources = getResources(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The resources IRIs
 */
export function getResources(vc: DatasetWithId): string[] {
  const resources: string[] = [];

  for (const { object } of vc.match(
    getConsent(vc),
    gc.forPersonalData,
    null,
    defaultGraph(),
  )) {
    if (object.termType !== "NamedNode") {
      throw new Error(
        `Expected resource to be a Named Node. Instead got [${object.value}] with term type [${object.termType}]`,
      );
    }
    resources.push(object.value);
  }

  return resources;
}

/**
 * Get the purposes for which an Access Grant/Request applies.
 *
 * @example
 *
 * ```
 * const purposes = getPurposes(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The purpose IRIs
 */
export function getPurposes(vc: DatasetWithId): string[] {
  const consent = getConsent(vc);
  const purposes: string[] = [];

  for (const { object } of vc.match(
    consent,
    gc.forPurpose,
    null,
    defaultGraph(),
  )) {
    if (object.termType !== "NamedNode") {
      throw new Error(
        `Expected purpose to be Named Node. Instead got [${object.value}] with term type [${object.termType}]`,
      );
    }
    purposes.push(object.value);
  }

  return purposes;
}

/**
 * Reads the custom string value with the provided name in the consent section of the provided Access Credential.
 *
 * @example
 * ```
 * const accessRequest = await issueAccessRequest({...}, {
 *  ...,
 *  customFields: new Set([
 *     {
 *       key: new URL("https://example.org/ns/customString"),
 *       value: "custom value",
 *     },
 *   ]),
 * });
 * // s is "custom value"
 * const s = getStringCustomField(accessRequest, new URL("https://example.org/ns/customString"));
 * ```
 *
 * @param accessCredential The Access Credential (Access Grant or Access request)
 * @returns the value of the custom field with the provided name if it is a string, undefined otherwise.
 */
export function getStringCustomField(
  vc: DatasetWithId,
  field: URL,
): string | undefined {
  return Array.from(
    vc.match(getConsent(vc), namedNode(field.href), null, defaultGraph()),
  )[0]?.object.value;
}

function deserializeBoolean(serialized: string): boolean | undefined {
  if (serialized === "true") {
    return true;
  }
  if (serialized === "false") {
    return false;
  }
  return undefined;
}

/**
 * Reads the custom boolean value with the provided name in the consent section of the provided Access Credential.
 *
 * @example
 * ```
 * const accessRequest = await issueAccessRequest({...}, {
 *  ...,
 *  customFields: new Set([
 *     {
 *       key: new URL("https://example.org/ns/customBoolean"),
 *       value: true,
 *     },
 *   ]),
 * });
 * // s is true
 * const s = getStringCustomField(accessRequest, new URL("https://example.org/ns/customBoolean"));
 * ```
 *
 * @param accessCredential The Access Credential (Access Grant or Access request)
 * @returns the value of the custom field with the provided name if it is a boolean, undefined otherwise.
 */
export function getBooleanCustomField(
  vc: DatasetWithId,
  field: URL,
): boolean | undefined {
  const val = Array.from(
    vc.match(getConsent(vc), namedNode(field.href), null, defaultGraph()),
  )[0]?.object.value;
  return deserializeBoolean(val);
}

function deserizalizeInteger(serialized: string): number | undefined {
  const val = Number.parseInt(serialized, 10);
  return Number.isNaN(val) ? undefined : val;
}

/**
 * Reads the custom integer value with the provided name in the consent section of the provided Access Credential.
 *
 * @example
 * ```
 * const accessRequest = await issueAccessRequest({...}, {
 *  ...,
 *  customFields: new Set([
 *     {
 *       key: new URL("https://example.org/ns/customInteger"),
 *       value: 1,
 *     },
 *   ]),
 * });
 * // i is 1
 * const i = getStringCustomField(accessRequest, new URL("https://example.org/ns/customInteger"));
 * ```
 *
 * @param accessCredential The Access Credential (Access Grant or Access request)
 * @returns the value of the custom field with the provided name if it is a boolean, undefined otherwise.
 */
export function getIntegerCustomField(
  vc: DatasetWithId,
  field: URL,
): number | undefined {
  const val = Array.from(
    vc.match(getConsent(vc), namedNode(field.href), null, defaultGraph()),
  )[0]?.object.value;
  return deserizalizeInteger(val);
}

function deserizalizeDouble(serialized: string): number | undefined {
  const val = Number.parseFloat(serialized);
  return Number.isNaN(val) ? undefined : val;
}

/**
 * Reads the custom double value with the provided name in the consent section of the provided Access Credential.
 *
 * @example
 * ```
 * const accessRequest = await issueAccessRequest({...}, {
 *  ...,
 *  customFields: new Set([
 *     {
 *       key: new URL("https://example.org/ns/customDouble"),
 *       value: 1.1,
 *     },
 *   ]),
 * });
 * // d is 1.1
 * const d = getStringCustomField(accessRequest, new URL("https://example.org/ns/customDouble"));
 * ```
 *
 * @param accessCredential The Access Credential (Access Grant or Access request)
 * @returns the value of the custom field with the provided name if it is a boolean, undefined otherwise.
 */
export function getDoubleCustomField(
  vc: DatasetWithId,
  field: URL,
): number | undefined {
  const val = Array.from(
    vc.match(getConsent(vc), namedNode(field.href), null, defaultGraph()),
  )[0]?.object.value;
  return deserizalizeDouble(val);
}

const xmlSchemaTypes = {
  boolean: namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
  double: namedNode("http://www.w3.org/2001/XMLSchema#double"),
  integer: namedNode("http://www.w3.org/2001/XMLSchema#integer"),
  string: namedNode("http://www.w3.org/2001/XMLSchema#string"),
} as const;

function castLiteral(lit: Literal): unknown {
  if (lit.datatype.equals(xmlSchemaTypes.boolean)) {
    return deserializeBoolean(lit.value);
  }
  if (lit.datatype.equals(xmlSchemaTypes.double)) {
    return deserizalizeDouble(lit.value);
  }
  if (lit.datatype.equals(xmlSchemaTypes.integer)) {
    return deserizalizeInteger(lit.value);
  }
  if (lit.datatype.equals(xmlSchemaTypes.string)) {
    return lit.value;
  }
  throw new Error(`Unsupported literal type ${lit.datatype.value}`);
}

const WELL_KNOWN_FIELDS = [
  gc.forPersonalData,
  gc.forPurpose,
  gc.isProvidedTo,
  gc.isProvidedToController,
  gc.isProvidedToPerson,
  acl.mode,
  INHERIT,
];

/**
 * Reads all the custom fields in the consent section of the provided Access Credential.
 *
 * @example
 * ```
 * const accessRequest = await issueAccessRequest({...}, {
 *  ...,
 *  customFields: new Set([
 *     {
 *       key: new URL("https://example.org/ns/customString"),
 *       value: "custom value",
 *     },
 *     {
 *       key: new URL("https://example.org/ns/customInteger"),
 *       value: 1,
 *     },
 *   ]),
 * });
 * const customFields = getCustomFields(accessRequest);
 * // s is "custom value"
 * const s = customFields["https://example.org/ns/customString"];
 * // i is 1
 * const i = customFields["https://example.org/ns/custominteger"];
 * ```
 *
 * @param accessCredential The Access Credential (Access Grant or Access request)
 * @returns an object keyed by the custom fields names, associated to their values.
 */
export function getCustomFields(
  accessCredential: DatasetWithId,
): Record<string, unknown> {
  const consent = getConsent(accessCredential);
  return Array.from(accessCredential.match(consent, null, null, defaultGraph()))
    .filter(
      ({ predicate, object }) =>
        // The Access Grant data model is known, so by elimination any unknown
        // field is a custom one.
        !WELL_KNOWN_FIELDS.some((wellKnown) => wellKnown.equals(predicate)) &&
        // Nested objects are not supported.
        object.termType === "Literal",
    )
    .map(({ predicate, object }) => ({
      // The type assertion is okay, because we filter on the term type.
      [`${predicate.value}`]: castLiteral(object as Literal),
    }))
    .reduce((acc, cur) => ({ ...acc, ...cur }), {} as Record<string, unknown>);
}

export function isGConsentAccessGrant(vc: DatasetWithId): boolean {
  const credentialSubject = getCredentialSubject(vc);
  const providedConsent = getSingleObject(
    vc,
    credentialSubject,
    gc.providedConsent,
    undefined,
    false,
  );

  if (!providedConsent) return false;

  const gcStatus = getSingleObject(
    vc,
    providedConsent,
    gc.hasStatus,
    undefined,
    false,
  );

  return (
    gcStatus !== undefined &&
    (vc.has(quad(providedConsent, gc.hasStatus, gc.ConsentStatusDenied)) ||
      vc.has(
        quad(providedConsent, gc.hasStatus, gc.ConsentStatusExplicitlyGiven),
      )) &&
    getSingleObject(vc, providedConsent, gc.isProvidedTo, undefined, false)
      ?.termType === "NamedNode"
  );
}

/**
 * Get the resource owner granting access to their resources from an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const ownerWebId = getResourceOwner(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The resource owner WebID
 */
export function getResourceOwner(vc: AccessGrantGConsent): string;
export function getResourceOwner(vc: DatasetWithId): string | undefined;
export function getResourceOwner(vc: DatasetWithId): string | undefined {
  const credentialSubject = getCredentialSubject(vc);
  if (isGConsentAccessGrant(vc)) {
    return credentialSubject.value;
  }
  return getSingleObject(
    vc,
    getSingleObject(vc, credentialSubject, gc.hasConsent),
    gc.isConsentForDataSubject,
    "NamedNode",
    false,
  )?.value;
}

/**
 * Get the requestor asking for access to a resources with an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const requestorWebId = getRequestor(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The requestor WebID
 */
export function getRequestor(vc: DatasetWithId): string {
  const credentialSubject = getCredentialSubject(vc);
  const providedConsent = getSingleObject(
    vc,
    credentialSubject,
    gc.providedConsent,
    undefined,
    false,
  );

  if (!providedConsent) return credentialSubject.value;

  const supportedPredicates = [
    gc.isProvidedTo,
    gc.isProvidedToPerson,
    gc.isProvidedToController,
  ];
  const candidateResults: Array<string> = [];
  supportedPredicates.forEach((predicate) => {
    const candidate = getSingleObject(
      vc,
      providedConsent,
      predicate,
      "NamedNode",
      false,
    );
    if (candidate !== undefined) {
      candidateResults.push(candidate.value);
    }
  });

  if (candidateResults.length === 1) {
    return candidateResults[0];
  }

  if (candidateResults.length > 1) {
    throw new Error(
      `Too many requestors found. Expected one, found ${candidateResults}`,
    );
  }

  throw new Error(`No requestor found.`);
}

/**
 * Get the inbox of the requestor of an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const inbox = getInbox(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The requestors inbox
 */
export function getInbox(vc: DatasetWithId): string | undefined {
  try {
    return getSingleObject(vc, getCredentialSubject(vc), ldp.inbox, "NamedNode")
      .value;
  } catch {
    return undefined;
  }
}

/**
 * Get the access modes granted to a resources via an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const modes = getAccessModes(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The access modes the grant recipient can exercise.
 */
export function getAccessModes(vc: DatasetWithId): AccessModes {
  const consent = getConsent(vc);
  return {
    read: vc.has(quad(consent, acl.mode, acl.Read, defaultGraph())),
    write: vc.has(quad(consent, acl.mode, acl.Write, defaultGraph())),
    append: vc.has(quad(consent, acl.mode, acl.Append, defaultGraph())),
  };
}

const shorthand = {
  "http://www.w3.org/ns/solid/vc#SolidAccessRequest": "SolidAccessRequest",
  "http://www.w3.org/ns/solid/vc#SolidAccessDenial": "SolidAccessDenial",
  "http://www.w3.org/ns/solid/vc#SolidAccessGrant": "SolidAccessGrant",
  "https://www.w3.org/2018/credentials#VerifiableCredential":
    "VerifiableCredential",
  "https://www.w3.org/2018/credentials#VerifiablePresentation":
    "VerifiablePresentation",
};

/**
 * Get the VC types of an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const types = getTypes(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The VC types
 */
export function getTypes(vc: DatasetWithId): string[] {
  const results = [
    ...vc.match(namedNode(getId(vc)), TYPE, undefined, defaultGraph()),
  ].map((res) => res.object);

  const types: string[] = [];

  for (const result of results) {
    if (result.termType !== "NamedNode") {
      throw new Error(
        `Expected every type to be a Named Node, but found [${result.value}] with term type [${result.termType}]`,
      );
    }
    types.push(result.value);
    if (result.value in shorthand) {
      types.push(shorthand[result.value as keyof typeof shorthand]);
    }
  }

  return types;
}

/**
 * Check whether a given Access Grant applies recursively to child resources or not.
 *
 * @example
 *
 * ```
 * const isInherited = getInherit(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns true if the Grant applies to contained resources, false otherwise.
 */
export function getInherit(vc: DatasetWithId): boolean {
  return !vc.has(
    quad(
      getConsent(vc),
      INHERIT,
      literal("false", XSD_BOOLEAN),
      defaultGraph(),
    ),
  );
}

/**
 * This class wraps all the accessor functions on a raw Access Grant JSON object.
 * It wraps all the supported Access Grants data models, namely GConsent.
 *
 * @example
 *
 * ```
 * const rawGrant = await getAccessGrantFromRedirectUrl(someUrl, { fetch: session.fetch });
 * const grant = new AccessGrant(grant);
 * const grantOwner = grant.getResourceOwner();
 * ```
 */
export class AccessGrantWrapper {
  private vc: DatasetWithId;

  constructor(vc: DatasetWithId) {
    this.vc = vc;
  }

  getPurposes(): ReturnType<typeof getResources> {
    return getPurposes(this.vc);
  }

  getInbox(): ReturnType<typeof getInbox> {
    return getInbox(this.vc);
  }

  getResources(): ReturnType<typeof getResources> {
    return getResources(this.vc);
  }

  getResourceOwner(): ReturnType<typeof getResourceOwner> {
    return getResourceOwner(this.vc);
  }

  getRequestor(): ReturnType<typeof getRequestor> {
    return getRequestor(this.vc);
  }

  getAccessModes(): ReturnType<typeof getAccessModes> {
    return getAccessModes(this.vc);
  }

  getId(): ReturnType<typeof getId> {
    return getId(this.vc);
  }

  getTypes(): ReturnType<typeof getTypes> {
    return getTypes(this.vc);
  }

  getIssuanceDate(): ReturnType<typeof getIssuanceDate> {
    return getIssuanceDate(this.vc);
  }

  getExpirationDate(): ReturnType<typeof getExpirationDate> {
    return getExpirationDate(this.vc);
  }

  getIssuer(): ReturnType<typeof getIssuer> {
    return getIssuer(this.vc);
  }

  getInherit(): ReturnType<typeof getInherit> {
    return getInherit(this.vc);
  }
}
