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

import { jest, it, describe, expect } from "@jest/globals";
import { Response } from "@inrupt/universal-fetch";
import type * as CrossFetch from "@inrupt/universal-fetch";

import { denyAccessRequest } from "./denyAccessRequest";
import { mockAccessRequestVc } from "../util/access.mock";
import {
  mockAccessApiEndpoint,
  MOCKED_ACCESS_ISSUER,
} from "../request/request.mock";

jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset,
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});
jest.mock("@inrupt/solid-client-vc");
jest.mock("@inrupt/universal-fetch", () => {
  const crossFetch = jest.requireActual(
    "@inrupt/universal-fetch",
  ) as jest.Mocked<typeof CrossFetch>;
  return {
    // Do no mock the globals such as Response.
    ...crossFetch,
    fetch: jest.fn<(typeof crossFetch)["fetch"]>(),
  };
});

// TODO: Extract the fetch VC function and related tests
describe("denyAccessRequest", () => {
  it("throws if the provided VC isn't a Solid access request", async () => {
    mockAccessApiEndpoint();
    await expect(
      denyAccessRequest({
        ...(await mockAccessRequestVc()),
        type: ["NotASolidAccessRequest"],
      }),
    ).rejects.toThrow(
      "An error occurred when type checking the VC, it is not a BaseAccessVerifiableCredential.",
    );
  });

  it("throws if there is no well known access endpoint", async () => {
    mockAccessApiEndpoint(false);
    await expect(
      denyAccessRequest(await mockAccessRequestVc()),
    ).rejects.toThrow(
      "No access issuer listed for property [verifiable_credential_issuer] in",
    );
  });

  it("uses the provided access endpoint, if any", async () => {
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    await denyAccessRequest(await mockAccessRequestVc(), {
      accessEndpoint: "https://some.access-endpoint.override/",
      fetch: jest.fn<typeof fetch>(),
    });
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      "https://some.access-endpoint.override/".concat("issue"),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("uses the provided fetch, if any", async () => {
    mockAccessApiEndpoint();
    const mockedFetch = jest.fn(global.fetch);
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    await denyAccessRequest(
      "https://some.resource/owner",
      await mockAccessRequestVc(),
      {
        fetch: mockedFetch,
      },
    );
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { fetch: mockedFetch },
    );
  });

  it("issues a proper denied access VC", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const accessRequestWithPurpose = await mockAccessRequestVc({
      purpose: ["https://example.org/some-purpose"],
    });
    await denyAccessRequest(accessRequestWithPurpose, {
      fetch: jest.fn(global.fetch),
    });

    // TODO: Should we expect "isProvidedTo": "https://some.requestor" in "providedConsent" or nest the expect.objectContaining?
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: accessRequestWithPurpose.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData:
            accessRequestWithPurpose.credentialSubject.hasConsent
              .forPersonalData,
          isProvidedTo: "https://some.requestor",
          forPurpose:
            accessRequestWithPurpose.credentialSubject.hasConsent.forPurpose,
        },
        inbox: accessRequestWithPurpose.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessDenial"],
      }),
      expect.anything(),
    );
  });

  it("issues a proper denied access VC from a given access request VC IRI", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(await mockAccessRequestVc())),
      );
    await denyAccessRequest("https://some.credential", {
      fetch: mockedFetch,
    });

    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: expect.objectContaining({
          mode: (await mockAccessRequestVc()).credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData: (await mockAccessRequestVc()).credentialSubject
            .hasConsent.forPersonalData,
        }),
        inbox: (await mockAccessRequestVc()).credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessDenial"],
      }),
      expect.anything(),
    );
  });

  it("can take a URL as VC IRI parameter", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(await mockAccessRequestVc())),
      );
    await denyAccessRequest(new URL("https://some.credential"), {
      fetch: mockedFetch,
    });

    // TODO: Should we expect "isProvidedTo": "https://some.requestor" in "providedConsent" or nest the expect.objectContaining?
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: expect.objectContaining({
          mode: (await mockAccessRequestVc()).credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData: (await mockAccessRequestVc()).credentialSubject
            .hasConsent.forPersonalData,
        }),
        inbox: (await mockAccessRequestVc()).credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessDenial"],
      }),
      expect.anything(),
    );
  });

  it("issues a proper denied access VC using the deprecated signature and VC value", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    await denyAccessRequest(
      "https://some.resource.owner",
      await mockAccessRequestVc(),
      {
        fetch: jest.fn(global.fetch),
      },
    );

    // TODO: Should we expect "isProvidedTo": "https://some.requestor" in "providedConsent" or nest the expect.objectContaining?
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: (await mockAccessRequestVc()).credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData: (await mockAccessRequestVc()).credentialSubject
            .hasConsent.forPersonalData,
          isProvidedTo: "https://some.requestor",
        },
        inbox: (await mockAccessRequestVc()).credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessDenial"],
      }),
      expect.anything(),
    );
  });

  it("issues a proper denied access VC using the deprecated signature and VC IRI", async () => {
    mockAccessApiEndpoint();
    const mockedVcModule = jest.requireMock("@inrupt/solid-client-vc") as {
      issueVerifiableCredential: () => unknown;
    };
    const spiedIssueRequest = jest.spyOn(
      mockedVcModule,
      "issueVerifiableCredential",
    );
    const accessRequestWithPurpose = await mockAccessRequestVc({
      purpose: ["https://example.org/some-purpose"],
    });

    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(accessRequestWithPurpose)),
      );
    await denyAccessRequest("https://some.resource.owner", "https://some.vc", {
      fetch: mockedFetch,
    });

    // TODO: Should we expect "isProvidedTo": "https://some.requestor" in "providedConsent" or nest the expect.objectContaining?
    expect(spiedIssueRequest).toHaveBeenCalledWith(
      `${MOCKED_ACCESS_ISSUER}/issue`,
      expect.objectContaining({
        providedConsent: {
          mode: accessRequestWithPurpose.credentialSubject.hasConsent.mode,
          hasStatus: "https://w3id.org/GConsent#ConsentStatusDenied",
          forPersonalData:
            accessRequestWithPurpose.credentialSubject.hasConsent
              .forPersonalData,
          isProvidedTo: "https://some.requestor",
          forPurpose:
            accessRequestWithPurpose.credentialSubject.hasConsent.forPurpose,
        },
        inbox: accessRequestWithPurpose.credentialSubject.inbox,
      }),
      expect.objectContaining({
        type: ["SolidAccessDenial"],
      }),
      expect.anything(),
    );
  });
});
