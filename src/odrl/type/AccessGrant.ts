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

import type { Iri, VerifiableCredential } from "@inrupt/solid-client-vc";
import type { ResourceAccessMode } from "../../type/ResourceAccessMode";
import { DataFactory } from "n3";
import { ACCESS, ACTION, AGREEMENT, APPEND, ASSIGNEE, ASSIGNER, CONSTRAINT, CREDENTIAL_SUBJECT, LEFT_OPERAND, OPERATOR, PERMISSION, PROFILE, PROHIBITION, READ, RIGHT_OPERAND, SOLID_ACCESS_GRANT, TARGET, TYPE, WRITE, assertTermType, getSingleQuad } from "../../common/constants";
import { defaultGraph } from "@rdfjs/dataset";
import { BlankNode, DatasetCore, Quad } from "@rdfjs/types";
const { namedNode, quad, literal } = DataFactory;

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
  action: ResourceAccessMode[];
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

function _isOdrlConstraint(vc: VerifiableCredential, constraint: BlankNode): boolean {
  const leftOperand = [...vc.match(constraint, LEFT_OPERAND, null, defaultGraph())];
  const rightOperand = [...vc.match(constraint, RIGHT_OPERAND, null, defaultGraph())];
  const operator = [...vc.match(constraint, OPERATOR, null, defaultGraph())];

  return operator.length === 1 && operator[0].equals(literal('eq'))
    && [leftOperand, rightOperand].every(operand => operand.length === 1 && (operator[0].equals(literal('application')) || operator[0].equals(literal('purpose'))));
}

function every(store: DatasetCore, cb: (store: Quad) => boolean) {
  for (const q of store) {
    if (!cb(q))
      return false;
  }
  return true;
}

function _isOdrlPermission(vc: VerifiableCredential, permission: BlankNode) {
  const target = [...vc.match(permission, TARGET, null, defaultGraph())];
  const actions = [...vc.match(permission, ACTION, null, defaultGraph())];

  return target.length === 1 && target[0].object.termType === 'NamedNode'
    && actions.length > 0 && actions.every(action => [READ, WRITE, APPEND].some(a => a.equals(action.object)))
    && every(vc.match(permission, CONSTRAINT, null, defaultGraph()), (constraint) => constraint.object.termType === "BlankNode" && _isOdrlConstraint(vc, constraint.object));
  
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
 * @hidden This function is still experimental, and could be subject to breaking
 * changes in non-major releases.
 * @param vc A Verifiable Credential
 * @returns true if the VC is a valid ODRL-based Access Grant
 * @since 2.1.0
 */
export function isCredentialAccessGrantOdrl(
  vc: VerifiableCredential,
): vc is AccessGrantOdrl {
  try {
    const credentialSubject = assertTermType(getSingleQuad([...vc.match(namedNode(vc.id), CREDENTIAL_SUBJECT, null, defaultGraph())]).object, 'NamedNode');
    const assigner = [...vc.match(credentialSubject, ASSIGNER, null, defaultGraph())];
    const assignee = [...vc.match(credentialSubject, ASSIGNEE, null, defaultGraph())];
  
    return vc.has(quad(namedNode(vc.id), TYPE, SOLID_ACCESS_GRANT))
      && vc.has(quad(credentialSubject, TYPE, AGREEMENT))
      && vc.has(quad(credentialSubject, PROFILE, ACCESS))
      && assigner.length === 1 && assigner[0].object.termType === 'NamedNode'
      && assignee.length === 1 && assignee[0].object.termType === 'NamedNode'
      && every(vc.match(credentialSubject, PERMISSION, null, defaultGraph()), (permission) => permission.object.termType === "BlankNode" && _isOdrlPermission(vc, permission.object))
      && every(vc.match(credentialSubject, PROHIBITION, null, defaultGraph()), (prohibition) => prohibition.object.termType === "BlankNode" && _isOdrlPermission(vc, prohibition.object));
  } catch (e) {
    // return false
    throw e;
  }
}
