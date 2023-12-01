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
import { DataFactory } from "n3";
import { rdf, acl as _acl } from "rdf-namespaces";

const { namedNode } = DataFactory;

const GC = "https://w3id.org/GConsent#";
const VC = "http://www.w3.org/ns/solid/vc#";
const XSD = "http://www.w3.org/2001/XMLSchema#";

export const XSD_BOOLEAN = namedNode(`${XSD}boolean`);

export const TYPE = namedNode(rdf.type);

export const solidVc = {
  SolidAccessRequest: namedNode(`${VC}SolidAccessRequest`),
  SolidAccessGrant: namedNode(`${VC}SolidAccessGrant`),
  SolidAccessDenial: namedNode(`${VC}SolidAccessDenial`),
};

export const gc = {
  providedConsent: namedNode(`${GC}providedConsent`),
  hasConsent: namedNode(`${GC}hasConsent`),
  hasStatus: namedNode(`${GC}hasStatus`),
  isProvidedTo: namedNode(`${GC}isProvidedTo`),
  isConsentForDataSubject: namedNode(`${GC}isConsentForDataSubject`),
  forPurpose: namedNode(`${GC}forPurpose`),
  forPersonalData: namedNode(`${GC}forPersonalData`),

  ConsentStatusDenied: namedNode(`${GC}ConsentStatusDenied`),
  ConsentStatusExplicitlyGiven: namedNode(`${GC}ConsentStatusExplicitlyGiven`),
  ConsentStatusRequested: namedNode(`${GC}ConsentStatusRequested`),
};

export const acl = {
  Read: namedNode(_acl.Read),
  Write: namedNode(_acl.Write),
  Append: namedNode(_acl.Append),
  mode: namedNode(_acl.mode),
};

export const ldp = {
  inbox: namedNode("http://www.w3.org/ns/ldp#inbox"),
};

export const INHERIT = namedNode(
  "urn:uuid:71ab2f68-a68b-4452-b968-dd23e0570227",
);
