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
import type {
  BlankNode,
  DatasetCore,
  Literal,
  NamedNode,
  Term,
} from "@rdfjs/types";
import { DataFactory } from "n3";
import type { AccessGrantGConsent } from "../gConsent/type/AccessGrant";
import type { AccessRequestGConsent } from "../gConsent/type/AccessRequest";
import type { AccessModes } from "../type/AccessModes";
import {
  APPEND,
  CREDENTIAL_SUBJECT,
  EXPIRATION_DATE,
  INHERIT,
  ISSUANCE_DATE,
  ISSUER,
  MODE,
  READ,
  WRITE,
  XSD_BOOLEAN,
  assertTermType,
  getSingleQuad,
  gc
} from "./constants";
import { GC_CONSENT_STATUS_DENIED, GC_CONSENT_STATUS_EXPLICITLY_GIVEN, GC_FOR_PERSONAL_DATA, GC_HAS_STATUS } from "../gConsent/constants";

const { namedNode, defaultGraph, quad, literal } = DataFactory;

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
export function getResources(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string[] {
  const resources: string[] = [];

  for (const { object } of vc.match(getConsent(vc), namedNode(GC_FOR_PERSONAL_DATA), null, defaultGraph())) {
    if (object.termType !== 'NamedNode') {
      throw new Error(`Expected resource to be a Named Node. Instead got [${object.value}] with term type [${object.termType}]`)
    }
    resources.push(object.value);
  }

  return resources;
}

export function isGConsentAccessGrant(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): boolean {
  const credentialSubject = getCredentialSubject(vc);
  try {
    const providedConsent = getSingleObject(vc, credentialSubject, gc.providedConsent, 'BlankNode');
    return (
      (
        vc.has(quad(providedConsent, namedNode(GC_HAS_STATUS), namedNode(GC_CONSENT_STATUS_DENIED)))
        || vc.has(quad(providedConsent, namedNode(GC_HAS_STATUS), namedNode(GC_CONSENT_STATUS_EXPLICITLY_GIVEN)))
        // Because of the getSingleObject the try / catch is also needed to wrap this as well as getting the provided consent
      ) && !!getSingleObject(vc, providedConsent, gc.isProvidedTo)
    )
  } catch (e) {
    return false;
  }
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
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string | undefined;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string | undefined {
  try {
    const credentialSubject = getCredentialSubject(vc);
    if (isGConsentAccessGrant(vc)) {
      return credentialSubject.value;
    }
    return getSingleObject(
      vc,
      // We should probably allow this to be Blank or Named Node
      getSingleObject(vc, credentialSubject, gc.hasConsent, 'BlankNode'),
      gc.isConsentForDataSubject
    ).value
  } catch (e) {
    return undefined;
  }
}

function getCredentialSubject(vc: AccessGrantGConsent | AccessRequestGConsent) {
  return getSingleObject(vc, namedNode(getId(vc)), CREDENTIAL_SUBJECT);
}

function getConsent(vc: AccessGrantGConsent | AccessRequestGConsent) {
  const credentialSubject = getCredentialSubject(vc);
  const consents = [
    ...vc.match(credentialSubject, gc.providedConsent, null, defaultGraph()),
    ...vc.match(credentialSubject, gc.hasConsent, null, defaultGraph())
  ];
  if (consents.length !== 1) {
    throw new Error(`Expected exactly 1 consent value. Found ${consents.length}.`)
  }
  const [{ object }] = consents;
  if (object.termType !== "BlankNode" && object.termType !== "NamedNode") {
    throw new Error(`Expected consent to be a Named Node or Blank Node, instead got ${object.termType}`)
  }
  return object
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
export function getRequestor(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string {
  const credentialSubject = getCredentialSubject(vc);
  try {
    const providedConsent = getSingleObject(
      vc,
      credentialSubject,
      gc.providedConsent,
      "BlankNode",
    );
    return getSingleObject(vc, providedConsent, gc.isProvidedTo).value;
  } catch (e) {
    // noop
  }

  return credentialSubject.value;
}

function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
): NamedNode;
function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "BlankNode",
): BlankNode;
function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: "Literal",
): Literal;
function getSingleObject(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type?: Term["termType"],
) {
  return assertTermType(
    getSingleQuad([...vc.match(subject, predicate, null, defaultGraph())])
      .object,
    type,
  );
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
export function getAccessModes(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): AccessModes {
  const consent = getConsent(vc);
  return {
    read: vc.has(quad(consent, MODE, READ, defaultGraph())),
    write: vc.has(quad(consent, MODE, WRITE, defaultGraph())),
    append: vc.has(quad(consent, MODE, APPEND, defaultGraph())),
  };
}

/**
 * Get the ID (URL) of an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const id = getId(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The VC ID URL
 */
export function getId(vc: AccessGrantGConsent | AccessRequestGConsent): string {
  return vc.id;
}

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
export function getTypes(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string[] {
  return vc.type;
}

function wrapDate(date: Literal) {
  if (
    !date.datatype.equals(
      namedNode("http://www.w3.org/2001/XMLSchema#dateTime"),
    )
  ) {
    throw new Error(
      `Expected date to be a dateTime; recieved [${date.datatype.value}]`,
    );
  }
  return new Date(date.value);
}

/**
 * Get the issuance date of an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const date = getIssuanceDate(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The issuance date
 */
export function getIssuanceDate(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): Date {
  return wrapDate(
    getSingleObject(vc, namedNode(getId(vc)), ISSUANCE_DATE, "Literal"),
  );
}

/**
 * Get the expiration date of an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const date = getExpirationDate(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The expiration date
 */
export function getExpirationDate(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): Date | undefined {
  const expirationDate = [
    ...vc.match(namedNode(getId(vc)), EXPIRATION_DATE, null, defaultGraph()),
  ];

  if (expirationDate.length > 1) {
    throw new Error(
      `Expected at most one expiration date. Found ${expirationDate.length}`,
    );
  }

  if (expirationDate.length === 1) {
    return wrapDate(assertTermType(expirationDate[0].object, "Literal"));
  }

  return undefined;
}

/**
 * Get the issuer of an Access Grant/Request.
 *
 * @example
 *
 * ```
 * const date = getIssuer(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The VC issuer
 */
export function getIssuer(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string {
  return getSingleObject(vc, namedNode(getId(vc)), ISSUER).value;
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
export function getInherit(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): boolean {
  return !vc.has(quad(getConsent(vc), INHERIT, literal("false", XSD_BOOLEAN), defaultGraph()));
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
  private vc: AccessGrantGConsent | AccessRequestGConsent;

  constructor(vc: AccessGrantGConsent | AccessRequestGConsent) {
    this.vc = vc;
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
