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
import type { AccessGrantGConsent } from "../gConsent/type/AccessGrant";
import type { AccessRequestGConsent } from "../gConsent/type/AccessRequest";
import { isAccessGrant as isGConsentAccessGrant } from "../gConsent/guard/isAccessGrant";
import type { AccessModes } from "../type/AccessModes";
import { resourceAccessToAccessMode } from "../type/AccessModes";

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
export function getResourceOwner(vc: AccessGrantGConsent): string;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string | undefined;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string | undefined {
  if (isGConsentAccessGrant(vc)) {
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
  vc: AccessGrantGConsent | AccessRequestGConsent,
): string {
  if (isGConsentAccessGrant(vc)) {
    return vc.credentialSubject.providedConsent.isProvidedTo;
  }
  return vc.credentialSubject.id;
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
  if (isGConsentAccessGrant(vc)) {
    return resourceAccessToAccessMode(
      vc.credentialSubject.providedConsent.mode,
    );
  }
  return resourceAccessToAccessMode(vc.credentialSubject.hasConsent.mode);
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
  return new Date(vc.issuanceDate);
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
  return typeof vc.expirationDate === "string"
    ? new Date(vc.expirationDate)
    : undefined;
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
  return vc.issuer;
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
  if (isGConsentAccessGrant(vc)) {
    // Inherit defaults to true.
    return vc.credentialSubject.providedConsent.inherit ?? true;
  }
  return vc.credentialSubject.hasConsent.inherit ?? true;
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
