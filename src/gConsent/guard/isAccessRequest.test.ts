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

import { it, describe, expect } from "@jest/globals";
import { verifiableCredentialToDataset } from "@inrupt/solid-client-vc";
import { isAccessRequest, isRdfjsAccessRequest } from "./isAccessRequest";
import {
  validAccessRequestVerifiableCredential,
  validAccessGrantVerifiableCredential,
} from "./credentials.mocks";

describe("isAccessRequest (legacy and RDFJS)", () => {
  it("Returns true on valid Access Request VC", async () => {
    expect(isAccessRequest(validAccessRequestVerifiableCredential)).toBe(true);
    expect(
      isRdfjsAccessRequest(
        await verifiableCredentialToDataset(
          validAccessRequestVerifiableCredential,
        ),
      ),
    ).toBe(true);
  });

  it("accepts undefined inboxes", async () => {
    const noInboxcredential = {
      ...validAccessRequestVerifiableCredential,
      credentialSubject: {
        ...validAccessRequestVerifiableCredential.credentialSubject,
        inbox: undefined,
      },
    };
    expect(isAccessRequest(noInboxcredential)).toBe(true);
    expect(
      isRdfjsAccessRequest(
        await verifiableCredentialToDataset(noInboxcredential),
      ),
    ).toBe(true);
  });

  it("Returns false on valid but non-Access Request VC", async () => {
    expect(isAccessRequest(validAccessGrantVerifiableCredential)).toBe(false);
    expect(
      isRdfjsAccessRequest(
        await verifiableCredentialToDataset(
          validAccessGrantVerifiableCredential,
        ),
      ),
    ).toBe(false);
  });

  it("Returns false on invalid Access Request VC", async () => {
    const invalidRequest = {
      ...validAccessRequestVerifiableCredential,
      credentialSubject: {
        ...validAccessRequestVerifiableCredential.credentialSubject,
        hasConsent: {
          ...validAccessRequestVerifiableCredential.credentialSubject
            .hasConsent,
          mode: [
            "http://www.w3.org/ns/auth/acl#Read",
            "http://www.w3.org/ns/auth/acl#SOME_INVALID_MODE",
          ],
        },
      },
    };
    expect(isAccessRequest(invalidRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(await verifiableCredentialToDataset(invalidRequest)),
    ).toBe(false);
  });
});
