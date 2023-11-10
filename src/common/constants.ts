import { Term, Quad, NamedNode, BlankNode, Literal } from "@rdfjs/types";
import { DataFactory } from "n3";
import { rdf } from "rdf-namespaces";
const { namedNode } = DataFactory;

export const cred = "https://www.w3.org/2018/credentials#";
export const gc = "https://w3id.org/GConsent#";
export const acl = "http://www.w3.org/ns/auth/acl#";
export const odrl2 = "http://www.w3.org/ns/odrl/2/";
export const solidOdrl = "https://www.w3.org/ns/solid/odrl/";
export const vc = "http://www.w3.org/ns/solid/vc#";
export const xsd = "http://www.w3.org/2001/XMLSchema#";

export const XSD_BOOLEAN = namedNode(`${xsd}boolean`);

export const SOLID_ACCESS_GRANT = namedNode(`${vc}SolidAccessGrant`);
export const CREDENTIAL_SUBJECT = namedNode(`${cred}credentialSubject`);
export const TYPE = namedNode(rdf.type);
export const PROVIDED_CONSENT = namedNode(`${gc}providedConsent`);
export const HAS_CONSENT = namedNode(`${gc}hasConsent`);
export const IS_PROVIDED_TO = namedNode(`${gc}isProvidedTo`);
export const PERMISSION = namedNode(`${odrl2}permission`);
// Check this
export const CONSTRAINT = namedNode(`${odrl2}constraint`);
export const ACTION = namedNode(`${odrl2}action`);
export const LEFT_OPERAND = namedNode(`${odrl2}leftOperand`);
export const OPERATOR = namedNode(`${odrl2}operator`);
export const RIGHT_OPERAND = namedNode(`${odrl2}rightOperand`);
export const AGREEMENT = namedNode(`${odrl2}Agreement`);
export const PROHIBITION = namedNode(`${odrl2}prohibition`);
export const PROFILE = namedNode(`${odrl2}profile`);
export const ASSIGNER = namedNode(`${odrl2}assigner`);
export const ASSIGNEE = namedNode(`${odrl2}assignee`);
export const TARGET = namedNode(`${odrl2}target`);
export const ACCESS = namedNode(`${solidOdrl}access`);
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

