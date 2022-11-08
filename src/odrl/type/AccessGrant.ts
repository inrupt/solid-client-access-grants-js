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

import type { Iri, VerifiableCredential } from "@inrupt/solid-client-vc";
import {
  SerializedAccessModes,
  SERIALIZED_ACCESS_MODES,
} from "../../type/AccessModes";

const ODRL_ACCESS = "https://www.w3.org/ns/solid/odrl/access";

const ODRL_CONSTRAINTS = ["purpose" as const, "application" as const];
type OdrlConstraintTypes = typeof ODRL_CONSTRAINTS extends Array<infer E>
  ? E
  : never;

const ODRL_OPERATORS = ["eq" as const];
type OdrlOperatorTypes = typeof ODRL_OPERATORS extends Array<infer E>
  ? E
  : never;

export type OdrlConstraint = {
  leftOperand: OdrlConstraintTypes;
  operator: OdrlOperatorTypes;
  rightOperand: string | Iri;
};

export type OdrlPermission = {
  target: Iri;
  action: SerializedAccessModes[];
  constraint?: OdrlConstraint[];
};

export type CredentialSubjectOdrl =
  VerifiableCredential["credentialSubject"] & {
    type: "Agreement";
    profile: typeof ODRL_ACCESS;
    assigner: Iri;
    assignee: Iri;
    permission: OdrlPermission[];
    prohibition?: OdrlPermission[];
  };

export type AccessGrantOdrl = VerifiableCredential & {
  // The type array must contain SolidAccessGrant
  type: string[];
  credentialSubject: CredentialSubjectOdrl;
};

function isOdrlConstraint(constraint: unknown): constraint is OdrlConstraint {
  if (
    typeof (constraint as OdrlConstraint).leftOperand !== "string" ||
    !ODRL_CONSTRAINTS.includes((constraint as OdrlConstraint).leftOperand)
  ) {
    return false;
  }
  if (
    typeof (constraint as OdrlConstraint).operator !== "string" ||
    !ODRL_OPERATORS.includes((constraint as OdrlConstraint).operator)
  ) {
    return false;
  }
  if (typeof (constraint as OdrlConstraint).rightOperand !== "string") {
    return false;
  }
  return true;
}

function isOdrlPermission(permission: unknown): permission is OdrlPermission {
  if (typeof (permission as OdrlPermission).target !== "string") {
    return false;
  }
  if (
    !Array.isArray((permission as OdrlPermission).action) ||
    (permission as OdrlPermission).action.some(
      (mode) => !SERIALIZED_ACCESS_MODES.includes(mode)
    )
  ) {
    return false;
  }

  // permission.constraint is either undefined or a constraint array.
  if (
    typeof (permission as OdrlPermission).constraint !== "undefined" &&
    !Array.isArray((permission as OdrlPermission).constraint)
  ) {
    return false;
  }
  if (
    (permission as OdrlPermission).constraint?.some(
      (constraint) => !isOdrlConstraint(constraint)
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Verify that the provided Verifiable Credential has the shape of an ODRL-based
 * Access Grant. This function only performs type validation, it does not verify
 * that the provided Credential is valid.
 *
 * Example usage:
 *
 * ```
 * // Get a JSON object that may be an Access Grant
 * const candidateCredential = await fetchCredentialFromElsewhere();
 *
 * // Validate the Access Grant payload
 * if (!isCredentialAccessGrantOdrl(candidateCredential)) {
 *  throw new Error("Invalid ODRL Access Grant");
 * }
 *
 * // Verify the credential
 * const validationResult = await isValidAccessGrant(candidateCredential, {
 *  verificationEndpoint: "https://some.verifier",
 *  fetch: someAuthenticatedFetch
 * });
 * ```
 *
 * @param vc A Verifiable Credential
 * @returns true if the VC is a valid ODRL-based Access Grant
 * @since unreleased
 */
export function isCredentialAccessGrantOdrl(
  vc: VerifiableCredential
): vc is AccessGrantOdrl {
  if (!vc.type.includes("SolidAccessGrant")) {
    return false;
  }
  if (
    typeof vc.credentialSubject.type !== "string" ||
    vc.credentialSubject.type !== "Agreement"
  ) {
    return false;
  }
  if (
    typeof vc.credentialSubject.profile !== "string" ||
    vc.credentialSubject.profile !== ODRL_ACCESS
  ) {
    return false;
  }
  if (typeof vc.credentialSubject.assigner !== "string") {
    return false;
  }

  if (typeof vc.credentialSubject.assignee !== "string") {
    return false;
  }

  if (
    !Array.isArray(
      (vc.credentialSubject as CredentialSubjectOdrl).permission
    ) ||
    (vc.credentialSubject as CredentialSubjectOdrl).permission.some(
      (permission) => !isOdrlPermission(permission)
    )
  ) {
    return false;
  }

  // vc.credentialSubject.prohibition is either undefined or an array of prohibitions.
  if (
    !Array.isArray(
      (vc.credentialSubject as CredentialSubjectOdrl).prohibition
    ) &&
    typeof (vc.credentialSubject as CredentialSubjectOdrl).prohibition !==
      "undefined"
  ) {
    return false;
  }

  if (
    (vc.credentialSubject as CredentialSubjectOdrl).prohibition?.some(
      (permission) => !isOdrlPermission(permission)
    )
  ) {
    return false;
  }
  return true;
}
