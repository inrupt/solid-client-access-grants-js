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

export const mockProviderConfig = ({ context }: { context?: string }) => ({
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    context ?? "https://schema.inrupt.com/credentials/v2.jsonld",
  ],
  issuerService: "https://vc.inrupt.com/issue",
  statusService: "https://vc.inrupt.com/status",
  verifierService: "https://vc.inrupt.com/verify",
  derivationService: "https://vc.inrupt.com/derive",
  proofService: null,
  availabilityService: null,
  submissionService: null,
  queryService: "https://vc.inrupt.com/query",
  supportedSignatureTypes: ["https://w3id.org/security#Ed25519Signature2020"],
});
