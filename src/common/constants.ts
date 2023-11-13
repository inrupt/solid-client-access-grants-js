import { Term, Quad, NamedNode, BlankNode, Literal } from "@rdfjs/types";
import { DataFactory } from "n3";
import { rdf } from "rdf-namespaces";
const { namedNode } = DataFactory;

export const cred = "https://www.w3.org/2018/credentials#";
export const gc = "https://w3id.org/GConsent#";
export const acl = "http://www.w3.org/ns/auth/acl#";
export const vc = "http://www.w3.org/ns/solid/vc#";
export const xsd = "http://www.w3.org/2001/XMLSchema#";

export const XSD_BOOLEAN = namedNode(`${xsd}boolean`);

export const SOLID_ACCESS_GRANT = namedNode(`${vc}SolidAccessGrant`);
export const CREDENTIAL_SUBJECT = namedNode(`${cred}credentialSubject`);
export const TYPE = namedNode(rdf.type);
export const PROVIDED_CONSENT = namedNode(`${gc}providedConsent`);
export const HAS_CONSENT = namedNode(`${gc}hasConsent`);
export const IS_PROVIDED_TO = namedNode(`${gc}isProvidedTo`);
export const MODE = namedNode(`${acl}mode`);
export const READ = namedNode(`${acl}Read`);
export const WRITE = namedNode(`${acl}Write`);
export const APPEND = namedNode(`${acl}Append`);
export const ISSUANCE_DATE = namedNode(`${cred}issuanceDate`);
export const EXPIRATION_DATE = namedNode(`${cred}expirationDate`);
export const ISSUER = namedNode(`${cred}issuer`);
export const INHERIT = namedNode("urn:uuid:71ab2f68-a68b-4452-b968-dd23e0570227");

export function assertTermType(term: Term): NamedNode
export function assertTermType(term: Term, type: 'NamedNode'): NamedNode
export function assertTermType(term: Term, type: 'BlankNode'): BlankNode
export function assertTermType(term: Term, type: 'Literal'): Literal
export function assertTermType(term: Term, type?: Term['termType']): Term
export function assertTermType(term: Term, type: Term['termType'] = 'NamedNode'): Term {
  if (term.termType !== type) {
    throw new Error(`Expected [${term.value}] to be a ${type}. Found ${term.termType}`);
  }
  return term;
}
export function getSingleQuad(quads: Quad[]): Quad {
  if (quads.length !== 1) {
    throw new Error(`Expected exactly one result. Found ${quads.length}`);
  }
  return quads[0];
}
