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
import { AccessGrantGConsent } from "../gConsent/type/AccessGrant";
import { AccessRequestGConsent } from "../gConsent/type/AccessRequest";
import { ResourceAccessMode } from "../type/ResourceAccessMode";
import { isAccessGrant as isGConsentAccessGrant } from "../gConsent/guard/isAccessGrant";
import { AccessModes, resourceAccessToAccessMode } from "../type/AccessModes";

export function getResources(
  vc: AccessGrantGConsent | AccessRequestGConsent
): string[] {
  if (isGConsentAccessGrant(vc)) {
    return vc.credentialSubject.providedConsent.forPersonalData;
  }
  return vc.credentialSubject.hasConsent.forPersonalData;
}

export function getResourceOwner(vc: AccessGrantGConsent): string;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent
): undefined;
export function getResourceOwner(
  vc: AccessGrantGConsent | AccessRequestGConsent
): string | undefined {
  if (isGConsentAccessGrant(vc)) {
    return vc.credentialSubject.id;
  }
  return vc.credentialSubject.hasConsent.isConsentForDataSubject;
}

export function getRequestor(
  vc: AccessGrantGConsent | AccessRequestGConsent
): string {
  if (isGConsentAccessGrant(vc)) {
    return vc.credentialSubject.providedConsent.isProvidedTo;
  }
  return vc.credentialSubject.id;
}

export function getAccessModes(
  vc: AccessGrantGConsent | AccessRequestGConsent
): AccessModes {
  if (isGConsentAccessGrant(vc)) {
    return resourceAccessToAccessMode(
      vc.credentialSubject.providedConsent.mode
    );
  }
  return resourceAccessToAccessMode(vc.credentialSubject.hasConsent.mode);
}

export function getId(vc: AccessGrantGConsent | AccessRequestGConsent): string {
  return vc.id;
}

export function getTypes(
  vc: AccessGrantGConsent | AccessRequestGConsent
): string[] {
  return vc.type;
}

export function getIssuanceDate(
  vc: AccessGrantGConsent | AccessRequestGConsent
): Date | undefined {
  return vc.issuanceDate ? new Date(vc.issuanceDate) : undefined;
}

export function getExpirationDate(
  vc: AccessGrantGConsent | AccessRequestGConsent
): Date {
  throw new Error("unimplemented");
}
export function getIssuer(
  vc: AccessGrantGConsent | AccessRequestGConsent
): string {
  throw new Error("unimplemented");
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
export class AccessGrant {
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
}
