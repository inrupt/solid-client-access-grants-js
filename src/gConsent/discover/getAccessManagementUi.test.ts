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
import type { getWellKnownSolid, getSolidDataset } from "@inrupt/solid-client";
import { mockSolidDatasetFrom } from "@inrupt/solid-client";

import { getAccessManagementUi } from "./getAccessManagementUi";

import {
  MOCKED_ACCESS_UI_IRI,
  mockWebIdWithUi,
  mockWellKnownWithAccess,
} from "../request/request.mock";

jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset,
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});

describe("getAccessManagementUi", () => {
  it("uses the provided fetch if any", async () => {
    const spiedGetDataset = jest
      .spyOn(
        jest.requireMock("@inrupt/solid-client") as {
          getSolidDataset: typeof getSolidDataset;
        },
        "getSolidDataset",
      )
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid"));
    const mockedFetch = jest.fn<typeof fetch>();

    await getAccessManagementUi("https://some.webid", { fetch: mockedFetch });

    expect(spiedGetDataset).toHaveBeenCalledWith("https://some.webid", {
      fetch: mockedFetch,
    });
  });

  it("throws if the WebID document cannot be dereferenced", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest.spyOn(solidClient, "getSolidDataset").mockRejectedValue("Some error");

    await expect(getAccessManagementUi("https://some.webid")).rejects.toThrow(
      /some.webid.*Some error/,
    );
  });

  it("throws if the WebID document does not contain the WebID", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(mockSolidDatasetFrom("https://some.webid"));

    await expect(getAccessManagementUi("https://some.webid")).rejects.toThrow(
      /some.webid.*WebID cannot be dereferenced/,
    );
  });

  it("returns the IRI advertized by the user's profile when present", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid"));
    const spiedGetWellKnown = jest.spyOn(solidClient, "getWellKnownSolid");

    await expect(getAccessManagementUi("https://some.webid")).resolves.toBe(
      MOCKED_ACCESS_UI_IRI,
    );
    // If the profile contains a preferred UI, the .well-known document should not be looked up.
    expect(spiedGetWellKnown).not.toHaveBeenCalled();
  });

  it("falls back to the IRI advertized by the user's Pod provider when present", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid", false));
    const spiedGetWellKnown = jest
      .spyOn(solidClient, "getWellKnownSolid")
      .mockResolvedValueOnce(mockWellKnownWithAccess());

    await expect(getAccessManagementUi("https://some.webid")).resolves.toBe(
      MOCKED_ACCESS_UI_IRI,
    );

    expect(spiedGetWellKnown).toHaveBeenCalled();
  });

  it("returns undefined if the user's WebID does not link to a storage", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(
        mockWebIdWithUi("https://some.webid", false, false),
      );

    await expect(
      getAccessManagementUi("https://some.webid"),
    ).resolves.toBeUndefined();
  });

  it("returns undefined if the host's well-known does not link to a recommended access management UI", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid", false));
    const spiedGetWellKnown = jest
      .spyOn(solidClient, "getWellKnownSolid")
      .mockResolvedValueOnce(mockWellKnownWithAccess(false));

    await expect(
      getAccessManagementUi("https://some.webid"),
    ).resolves.toBeUndefined();

    expect(spiedGetWellKnown).toHaveBeenCalled();
  });

  it("returns undefined if the host's well-known is empty", async () => {
    const solidClient = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
      getWellKnownSolid: typeof getWellKnownSolid;
    };
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValueOnce(mockWebIdWithUi("https://some.webid", false));
    const spiedGetWellKnown = jest
      .spyOn(solidClient, "getWellKnownSolid")
      .mockResolvedValueOnce(
        mockSolidDatasetFrom("https://some.server/.well-known/solid"),
      );

    await expect(
      getAccessManagementUi("https://some.webid"),
    ).resolves.toBeUndefined();

    expect(spiedGetWellKnown).toHaveBeenCalled();
  });
});
