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

import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import {
  isVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
} from "@inrupt/solid-client-vc";

import type * as VcLibrary from "@inrupt/solid-client-vc";
import { isValidAccessGrant } from "./isValidAccessGrant";

jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset,
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});

jest.mock("@inrupt/solid-client-vc", () => {
  const { verifiableCredentialToDataset, getIssuer, getVerifiableCredential } =
    jest.requireActual<typeof VcLibrary>("@inrupt/solid-client-vc");
  return {
    verifiableCredentialToDataset,
    getIssuer,
    getVerifiableCredential,
    isVerifiableCredential: jest.fn(),
    issueVerifiableCredential: jest.fn(),
    getVerifiableCredentialApiConfiguration: jest.fn(),
  };
});

describe("isValidAccessGrant", () => {
  const MOCK_ACCESS_GRANT_BASE = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://vc.inrupt.com/credentials/v1",
    ],
    id: "https://example.com/id",
    issuer: "https://example.com/issuer",
    type: ["VerifiableCredential", "SolidCredential", "SolidAccessGrant"],
    issuanceDate: "2021-05-26T16:40:03",
    expirationDate: "2021-06-09T16:40:03",
    credentialSubject: {
      id: "https://pod.inrupt.com/alice/profile/card#me",
      providedConsent: {
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
        hasStatus: "ConsentStatusExplicitlyGiven",
        forPersonalData: "https://pod.inrupt.com/alice/private/data",
        forPurpose: "https://example.com/SomeSpecificPurpose",
        isProvidedToPerson: "https://pod.inrupt.com/bob/profile/card#me",
      },
    },
    proof: {
      created: "2021-05-26T16:40:03.009Z",
      proofPurpose: "assertionMethod",
      proofValue: "eqp8h_kL1DwJCpn65z-d1Arnysx6b11...jb8j0MxUCc1uDQ",
      type: "Ed25519Signature2020",
      verificationMethod: "https://consent.pod.inrupt.com/key/396f686b",
    },
  };
  const MOCK_ACCESS_ENDPOINT = "https://consent.example.com";
  const MOCK_VERIFY_RESPONSE = { checks: [], warning: [], errors: [] };

  let MOCK_ACCESS_GRANT: VcLibrary.VerifiableCredential;

  beforeAll(async () => {
    const { verifiableCredentialToDataset } = jest.requireActual<
      typeof VcLibrary
    >("@inrupt/solid-client-vc");
    MOCK_ACCESS_GRANT =
      await verifiableCredentialToDataset<VcLibrary.VerifiableCredentialBase>(
        MOCK_ACCESS_GRANT_BASE,
        {
          includeVcProperties: true,
        },
      );
  });

  it("uses the provided fetch if any", async () => {
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    await isValidAccessGrant(MOCK_ACCESS_GRANT, {
      fetch: mockedFetch,
      verificationEndpoint: MOCK_ACCESS_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalled();
  });

  it("sends the given vc to the verify endpoint", async () => {
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    jest.mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
      specCompliant: {},
      legacy: {},
    });
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidAccessGrant(MOCK_ACCESS_GRANT, {
      fetch: mockedFetch,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ verifiableCredential: MOCK_ACCESS_GRANT }),
      }),
    );
  });

  it("retrieves the vc if a url was passed", async () => {
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest
      .fn<typeof fetch>()
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ACCESS_GRANT), { status: 200 }),
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        }),
      );

    await isValidAccessGrant("https://example.com/someVc", {
      fetch: mockedFetch,
      verificationEndpoint: MOCK_ACCESS_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalledWith("https://example.com/someVc");
  });

  it("throws if the passed url returns a non-vc", async () => {
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ someField: "Not a credential" })),
      );
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(false);

    await expect(
      isValidAccessGrant("https://example.com/someVc", {
        fetch: mockedFetch,
        verificationEndpoint: MOCK_ACCESS_ENDPOINT,
      }),
    ).rejects.toThrow(
      "Verifiable credential is not an object, or does not have an id",
    );
  });

  it("uses the provided verification endpoint if any", async () => {
    const vcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      getVerifiableCredentialApiConfiguration: typeof getVerifiableCredentialApiConfiguration;
    };
    const spiedConfigurationDiscovery = jest.spyOn(
      vcModule,
      "getVerifiableCredentialApiConfiguration",
    );
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    await isValidAccessGrant(MOCK_ACCESS_GRANT, {
      fetch: mockedFetch,
      verificationEndpoint: "https://some.verification.api",
    });
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://some.verification.api",
      expect.anything(),
    );
    expect(spiedConfigurationDiscovery).not.toHaveBeenCalled();
  });

  it("discovers the verification endpoint if none is provided", async () => {
    const mockedDiscovery = jest
      .mocked(getVerifiableCredentialApiConfiguration)
      .mockResolvedValueOnce({
        verifierService: "https://some.vc.verifier",
        specCompliant: {},
        legacy: {},
      });
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest
      .fn<typeof fetch>()
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ACCESS_GRANT), { status: 200 }),
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        }),
      );

    await isValidAccessGrant(MOCK_ACCESS_GRANT, {
      fetch: mockedFetch,
    });

    expect(mockedDiscovery).toHaveBeenCalledWith(MOCK_ACCESS_GRANT.issuer);
  });

  it("throws if no verification endpoint is discovered", async () => {
    jest.mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      specCompliant: {},
      legacy: {},
    });
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest
      .fn<typeof fetch>()
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ACCESS_GRANT), { status: 200 }),
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        }),
      );

    await expect(
      isValidAccessGrant(MOCK_ACCESS_GRANT, {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      `The VC service provider ${MOCK_ACCESS_GRANT.issuer} does not advertize for a verifier service in its .well-known/vc-configuration document`,
    );
  });

  it("returns the validation result from the access endpoint", async () => {
    jest.mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
      specCompliant: {},
      legacy: {},
    });
    jest.mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    await expect(
      isValidAccessGrant(MOCK_ACCESS_GRANT, {
        fetch: mockedFetch,
        verificationEndpoint: "https://some.verification.api",
      }),
    ).resolves.toEqual({ checks: [], errors: [], warning: [] });
  });
});
