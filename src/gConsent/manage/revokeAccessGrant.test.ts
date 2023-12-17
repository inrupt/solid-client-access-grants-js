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

import { jest, describe, it, expect } from "@jest/globals";

import type * as VcLibrary from "@inrupt/solid-client-vc";
import { revokeAccessGrant } from "./revokeAccessGrant";
import { MOCKED_CREDENTIAL_ID } from "../request/request.mock";
import { mockAccessGrantVc, mockAccessRequestVc } from "../util/access.mock";

jest.mock("@inrupt/solid-client-vc", () => {
  const {
    verifiableCredentialToDataset,
    getIssuanceDate,
    getCredentialSubject,
    getExpirationDate,
    getId,
    getIssuer,
    getVerifiableCredential,
  } = jest.requireActual("@inrupt/solid-client-vc") as jest.Mocked<
    typeof VcLibrary
  >;
  return {
    verifiableCredentialToDataset,
    issueVerifiableCredential: jest.fn(),
    revokeVerifiableCredential: jest.fn(),
    getIssuanceDate,
    getCredentialSubject,
    getExpirationDate,
    getId,
    getIssuer,
    getVerifiableCredential,
  };
});
describe("revokeAccessGrant", () => {
  it("uses the provided fetch if any", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: (typeof VcLibrary)["revokeVerifiableCredential"];
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential",
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(await mockAccessGrantVc())),
      );
    await revokeAccessGrant("https://some.credential", {
      fetch: mockedFetch,
    });
    expect(spiedRevoke).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        fetch: mockedFetch,
      },
    );
  });

  it("looks up the VC if provided as an IRI", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: (typeof VcLibrary)["revokeVerifiableCredential"];
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential",
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValue(
        new Response(JSON.stringify(await mockAccessGrantVc())),
      );
    await revokeAccessGrant(MOCKED_CREDENTIAL_ID, {
      fetch: mockedFetch,
    });
    expect(mockedFetch).toHaveBeenCalledWith(MOCKED_CREDENTIAL_ID);
    expect(spiedRevoke).toHaveBeenCalledWith(
      "https://some.issuer/status",
      MOCKED_CREDENTIAL_ID,
      expect.anything(),
    );
  });

  it("throws if dereferencing the credential ID fails", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(undefined, {
        status: 401,
        statusText: "Unauthorized",
      }),
    );
    await expect(
      revokeAccessGrant("https://some.credential", { fetch: mockedFetch }),
    ).rejects.toThrow(/\[https:\/\/some.credential\].*401.*Unauthorized/);
  });

  it("throws if the resource is not a base access grant VC", async () => {
    await expect(
      revokeAccessGrant(await mockAccessRequestVc()),
    ).rejects.toThrow(
      "An error occurred when type checking the VC: Not of type [http://www.w3.org/ns/solid/vc#SolidAccessGrant].",
    );
  });

  it("gets the VC identifier if provided as a full credential", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      revokeVerifiableCredential: (typeof VcLibrary)["revokeVerifiableCredential"];
    };
    const spiedRevoke = jest.spyOn(
      mockedVcModule,
      "revokeVerifiableCredential",
    );
    const mockedFetch = jest.fn<typeof fetch>();
    await revokeAccessGrant(
      await mockAccessGrantVc({ issuer: "https://some.issuer/" }),
      {
        fetch: mockedFetch,
      },
    );
    expect(spiedRevoke).toHaveBeenCalledWith(
      "https://some.issuer/status",
      MOCKED_CREDENTIAL_ID,
      expect.anything(),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
