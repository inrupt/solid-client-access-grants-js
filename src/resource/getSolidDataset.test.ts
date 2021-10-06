// Copyright 2021 Inrupt Inc.
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

/* eslint @typescript-eslint/no-explicit-any: 0 */
// eslint-disable-next-line no-shadow
import { it, jest, describe, expect } from "@jest/globals";
// This function isn't exported by the module yet.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { mockSolidDatasetFrom } from "@inrupt/solid-client";
import { mockAccessRequestVc } from "../manage/approve.mock";
import { getSolidDataset } from "./getSolidDataset";
import { fetchWithVc } from "../fetch";

jest.mock("../fetch");
jest.mock("@inrupt/solid-client-authn-core");
jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("@inrupt/solid-client", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn();
  return solidClientModule;
});

describe("getSolidDataset", () => {
  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn() as typeof global.fetch;
    // TODO: change to mockAccessGrantVc when rebasing
    await getSolidDataset("https://some.dataset.url", mockAccessRequestVc(), {
      fetch: mockedFetch,
    });
    expect(fetchWithVc).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        fetch: mockedFetch,
      }
    );
  });

  it("defaults to the session fetch", async () => {
    const mockedFetch = jest.fn() as typeof global.fetch;
    const authnBrowserModule = jest.requireMock(
      "@inrupt/solid-client-authn-browser"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    authnBrowserModule.fetch = mockedFetch;
    // TODO: change to mockAccessGrantVc when rebasing
    await getSolidDataset("https://some.dataset.url", mockAccessRequestVc());
    expect(fetchWithVc).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        fetch: mockedFetch,
      }
    );
  });

  it("authenticates using the provided VC", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solidClientModule = jest.requireMock("@inrupt/solid-client") as any;
    const mockedDataset = mockSolidDatasetFrom("https://some.url");
    solidClientModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);
    // TODO: change to mockAccessGrantVc when rebasing
    const resultDataset = await getSolidDataset(
      "https://some.dataset.url",
      mockAccessRequestVc(),
      {
        fetch: jest.fn(),
      }
    );
    expect(fetchWithVc).toHaveBeenCalledWith(
      expect.anything(),
      mockAccessRequestVc(),
      expect.anything()
    );
    expect(solidClientModule.getSolidDataset).toHaveBeenCalledWith(
      "https://some.dataset.url",
      expect.anything()
    );
    expect(resultDataset).toBe(mockedDataset);
  });
});
