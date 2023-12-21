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
import type { AccessRequest } from "../type/AccessRequest";

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

  it("returns false if the credential subject is missing 'hasConsent'", async () => {
    const noConsentRequest = JSON.parse(
      JSON.stringify(validAccessRequestVerifiableCredential),
    ) as AccessRequest;
    // @ts-expect-error this creates a malformed VC on purpose
    delete noConsentRequest.credentialSubject.hasConsent;
    expect(isAccessRequest(noConsentRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(
        await verifiableCredentialToDataset(noConsentRequest),
      ),
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'mode'", async () => {
    const noModeRequest = JSON.parse(
      JSON.stringify(validAccessRequestVerifiableCredential),
    ) as AccessRequest;
    // @ts-expect-error this creates a malformed VC on purpose
    delete noModeRequest.credentialSubject.hasConsent.mode;
    expect(isAccessRequest(noModeRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(await verifiableCredentialToDataset(noModeRequest)),
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'status'", async () => {
    const noStatusRequest = JSON.parse(
      JSON.stringify(validAccessRequestVerifiableCredential),
    ) as AccessRequest;
    // @ts-expect-error this creates a malformed VC on purpose
    delete noStatusRequest.credentialSubject.hasConsent.hasStatus;
    expect(isAccessRequest(noStatusRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(
        await verifiableCredentialToDataset(noStatusRequest),
      ),
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'forPersonalData'", async () => {
    const noDataRequest = JSON.parse(
      JSON.stringify(validAccessRequestVerifiableCredential),
    ) as AccessRequest;
    // @ts-expect-error this creates a malformed VC on purpose
    delete noDataRequest.credentialSubject.hasConsent.forPersonalData;
    expect(isAccessRequest(noDataRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(await verifiableCredentialToDataset(noDataRequest)),
    ).toBe(false);
  });

  it("returns false if the credential subject 'hasConsent' is missing 'isConsentForDataSubject'", async () => {
    const noDataSubjectRequest = JSON.parse(
      JSON.stringify(validAccessRequestVerifiableCredential),
    ) as AccessRequest;
    delete noDataSubjectRequest.credentialSubject.hasConsent
      .isConsentForDataSubject;
    expect(isAccessRequest(noDataSubjectRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(
        await verifiableCredentialToDataset(noDataSubjectRequest),
      ),
    ).toBe(false);
  });

  it("returns false if the credential type does not include 'SolidAccessRequest'", async () => {
    const badTypeRequest = JSON.parse(
      JSON.stringify(validAccessRequestVerifiableCredential),
    ) as AccessRequest;
    badTypeRequest.type = ["https://example.org/ns/some-vc-type"];
    expect(isAccessRequest(badTypeRequest)).toBe(false);
    expect(
      isRdfjsAccessRequest(await verifiableCredentialToDataset(badTypeRequest)),
    ).toBe(false);
  });
});
