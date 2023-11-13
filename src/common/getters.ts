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
import { BlankNode, DatasetCore, Literal, NamedNode, Quad_Subject, Term } from "@rdfjs/types";
import { DataFactory } from "n3";
import { isAccessGrant as isGConsentAccessGrant } from "../gConsent/guard/isAccessGrant";
import type { AccessGrantGConsent } from "../gConsent/type/AccessGrant";
import type { AccessRequestGConsent } from "../gConsent/type/AccessRequest";
import type { AccessGrantOdrl } from "../odrl";
import { isCredentialAccessGrantOdrl } from "../odrl";
import type { AccessModes } from "../type/AccessModes";
import { ACTION, APPEND, ASSIGNEE, CREDENTIAL_SUBJECT, EXPIRATION_DATE, HAS_CONSENT, INHERIT, ISSUANCE_DATE, ISSUER, IS_PROVIDED_TO, MODE, PERMISSION, PROVIDED_CONSENT, READ, WRITE, XSD_BOOLEAN, assertTermType, getSingleQuad } from "./constants";
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string[] {
  if (isCredentialAccessGrantOdrl(vc)) {
    return vc.credentialSubject.permission.map(
      (permission) => permission.target,
    );
  }
  if (isGConsentAccessGrant(vc)) {
    return vc.credentialSubject.providedConsent.forPersonalData;
  }
  return vc.credentialSubject.hasConsent.forPersonalData;
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
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessGrantOdrl,
): string;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string | undefined;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string | undefined {
  if (isCredentialAccessGrantOdrl(vc) || isGConsentAccessGrant(vc)) {
    return vc.credentialSubject.id;
  }
  return vc.credentialSubject.hasConsent.isConsentForDataSubject;
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string {
  const credentialSubject = getSingleObject(vc, namedNode(vc.id), CREDENTIAL_SUBJECT);
  if (isCredentialAccessGrantOdrl(vc)) {
    return getSingleObject(vc, credentialSubject, ASSIGNEE).value;
  }
  if (isGConsentAccessGrant(vc)) {
    const providedConsent = getSingleObject(vc, credentialSubject, PROVIDED_CONSENT, 'BlankNode');
    return getSingleObject(vc, providedConsent, IS_PROVIDED_TO).value;
  }
  return credentialSubject.value;
}

function getSingleObject<T extends Term['termType']>(vc: DatasetCore, subject: Term, predicate: Term): NamedNode;
function getSingleObject<T extends Term['termType']>(vc: DatasetCore, subject: Term, predicate: Term, type: 'BlankNode'): BlankNode;
function getSingleObject<T extends Term['termType']>(vc: DatasetCore, subject: Term, predicate: Term, type: 'Literal'): Literal;
function getSingleObject<T extends Term['termType']>(vc: DatasetCore, subject: Term, predicate: Term, type?: T) {
  return assertTermType(getSingleQuad([...vc.match(subject, predicate, null, defaultGraph())]).object, type);
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): AccessModes {
  const credentialSubject = getSingleObject(vc, namedNode(vc.id), CREDENTIAL_SUBJECT);

  if (isCredentialAccessGrantOdrl(vc)) {
    const permissions = [...vc.match(credentialSubject, PERMISSION, null, defaultGraph())];
    return {
      read:  permissions.some((permission) => vc.has(quad(permission.object as Quad_Subject, ACTION, READ, defaultGraph()))),
      write: permissions.some((permission) => vc.has(quad(permission.object as Quad_Subject, ACTION, WRITE, defaultGraph()))),
      append: permissions.some((permission) => vc.has(quad(permission.object as Quad_Subject, ACTION, APPEND, defaultGraph()))),
    };
  }

  const consent = getSingleObject(vc, credentialSubject, isGConsentAccessGrant(vc) ? PROVIDED_CONSENT : HAS_CONSENT, 'BlankNode');
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
export function getId(
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string {
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string[] {
  return vc.type;
}

function wrapDate(date: Literal) {
  if (!date.datatype.equals(namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))) {
    throw new Error(`Expected date to be a dateTime; recieved [${date.datatype.value}]`);
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): Date {
  return wrapDate(getSingleObject(vc, namedNode(vc.id), ISSUANCE_DATE, 'Literal'));
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): Date | undefined {
  const expirationDate = [...vc.match(namedNode(vc.id), EXPIRATION_DATE, null, defaultGraph())];

  if (expirationDate.length > 1) {
    throw new Error(`Expected at most one expiration date. Found ${expirationDate.length}`);
  }

  if (expirationDate.length === 1) {
    return wrapDate(assertTermType(expirationDate[0].object, 'Literal'));
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): string {
  return getSingleObject(vc, namedNode(vc.id), ISSUER).value;
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
  vc: AccessGrantGConsent | AccessRequestGConsent | AccessGrantOdrl,
): boolean {
  if (isCredentialAccessGrantOdrl(vc)) {
    return true;
  }
  const credentialSubject = getSingleObject(vc, namedNode(vc.id), CREDENTIAL_SUBJECT);
  const consent = getSingleObject(vc, credentialSubject, isGConsentAccessGrant(vc) ? PROVIDED_CONSENT : HAS_CONSENT, 'BlankNode');
  return !vc.has(quad(consent, INHERIT, literal('false', XSD_BOOLEAN), defaultGraph()));
}

/**
 * This class wraps all the accessor functions on a raw Access Grant JSON object.
 * It wraps all the supported Access Grants data models, namely GConsent and
 * ODRL.
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
