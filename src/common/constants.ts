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
import type { Term, Quad, NamedNode, BlankNode, Literal } from "@rdfjs/types";
import { DataFactory } from "n3";
import { rdf, acl as _acl } from "rdf-namespaces";

const { namedNode } = DataFactory;

export const CRED = "https://www.w3.org/2018/credentials#";
export const GC = "https://w3id.org/GConsent#";
export const ACL = "http://www.w3.org/ns/auth/acl#";
export const VC = "http://www.w3.org/ns/solid/vc#";
export const XSD = "http://www.w3.org/2001/XMLSchema#";

export const XSD_BOOLEAN = namedNode(`${XSD}boolean`);

export const SOLID_ACCESS_GRANT = namedNode(`${VC}SolidAccessGrant`);
export const TYPE = namedNode(rdf.type);

export const gc = {
  providedConsent: namedNode(`${GC}providedConsent`),
  hasConsent: namedNode(`${GC}hasConsent`),
  isProvidedTo: namedNode(`${GC}isProvidedTo`),
  isConsentForDataSubject: namedNode(`${GC}isConsentForDataSubject`),
};

export const acl = {
  Read: namedNode(_acl.Read),
  Write: namedNode(_acl.Write),
  Append: namedNode(_acl.Append),
  mode: namedNode(_acl.mode),
};

export const ISSUANCE_DATE = namedNode(`${CRED}issuanceDate`);
export const EXPIRATION_DATE = namedNode(`${CRED}expirationDate`);
export const ISSUER = namedNode(`${CRED}issuer`);

export const CREDENTIAL_SUBJECT = namedNode(`${CRED}credentialSubject`);
export const INHERIT = namedNode(
  "urn:uuid:71ab2f68-a68b-4452-b968-dd23e0570227",
);

export function assertTermType(term: Term): NamedNode;
export function assertTermType(term: Term, type: "NamedNode"): NamedNode;
export function assertTermType(term: Term, type: "BlankNode"): BlankNode;
export function assertTermType(term: Term, type: "Literal"): Literal;
export function assertTermType(term: Term, type?: Term["termType"]): Term;
export function assertTermType(
  term: Term,
  type: Term["termType"] = "NamedNode",
): Term {
  if (term.termType !== type) {
    throw new Error(
      `Expected [${term.value}] to be a ${type}. Found ${term.termType}`,
    );
  }
  return term;
}
export function getSingleQuad(quads: Quad[]): Quad {
  if (quads.length !== 1) {
    throw new Error(`Expected exactly one result. Found ${quads.length}`);
  }
  return quads[0];
}
