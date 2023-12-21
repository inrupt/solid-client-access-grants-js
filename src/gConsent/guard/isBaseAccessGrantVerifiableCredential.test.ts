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
import {
  isBaseAccessGrantVerifiableCredential,
  isRdfjsBaseAccessGrantVerifiableCredential,
} from "./isBaseAccessGrantVerifiableCredential";
import {
  validAccessGrantVerifiableCredential,
  validAccessRequestVerifiableCredential,
} from "./credentials.mocks";

describe("isBaseAccessGrantVerifiableCredential", () => {
  it("Returns true on valid Access Grant VC", async () => {
    expect(
      isBaseAccessGrantVerifiableCredential(
        validAccessGrantVerifiableCredential,
      ),
    ).toBe(true);
    expect(
      isRdfjsBaseAccessGrantVerifiableCredential(
        await verifiableCredentialToDataset(
          validAccessGrantVerifiableCredential,
        ),
      ),
    ).toBe(true);
  });

  it("Returns false on valid non-Access Grant VC", async () => {
    expect(
      isBaseAccessGrantVerifiableCredential(
        validAccessRequestVerifiableCredential,
      ),
    ).toBe(false);
    expect(
      isRdfjsBaseAccessGrantVerifiableCredential(
        await verifiableCredentialToDataset(
          validAccessRequestVerifiableCredential,
        ),
      ),
    ).toBe(false);
  });

  it("Returns false on invalid Access Grant VC", async () => {
    const vc = {
      ...validAccessGrantVerifiableCredential,
      credentialSubject: {
        ...validAccessGrantVerifiableCredential.credentialSubject,
        providedConsent: {
          ...validAccessGrantVerifiableCredential.credentialSubject
            .providedConsent,
          forPersonalData: ["https://example.pod/resourceX", {}],
        },
      },
    };
    expect(isBaseAccessGrantVerifiableCredential(vc)).toBe(false);
    expect(
      isRdfjsBaseAccessGrantVerifiableCredential(
        await verifiableCredentialToDataset(vc),
      ),
    ).toBe(false);
  });

  it("Returns false on invalid issuance date", async () => {
    const vc = {
      ...validAccessGrantVerifiableCredential,
      issuanceDate: [],
    };
    expect(isBaseAccessGrantVerifiableCredential(vc)).toBe(false);
    expect(
      isRdfjsBaseAccessGrantVerifiableCredential(
        await verifiableCredentialToDataset(vc),
      ),
    ).toBe(false);
  });

  it("Returns true on undefined issuance date", async () => {
    const vc = {
      ...validAccessGrantVerifiableCredential,
      issuanceDate: undefined,
    };
    expect(isBaseAccessGrantVerifiableCredential(vc)).toBe(true);
  });

  // FIXME: Work out why undefined issuance dates are allowed when they are required in the VC type
  it.skip("Returns true on undefined issuance date in RDFJS", async () => {
    const vc = {
      ...validAccessGrantVerifiableCredential,
      issuanceDate: undefined,
    };
    expect(
      isRdfjsBaseAccessGrantVerifiableCredential(
        await verifiableCredentialToDataset(vc),
      ),
    ).toBe(true);
  });
});
