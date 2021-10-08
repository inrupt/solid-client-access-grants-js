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

// eslint-disable-next-line no-shadow
import { it, jest, describe, expect } from "@jest/globals";
// This function isn't exported by the module yet.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchWithVc } from "@inrupt/solid-client-authn-core";
import { namedNode } from "@rdfjs/data-model";
import { mockAccessRequestVc } from "../manage/approve.mock";
import { getFile } from "./getFile";

jest.mock("@inrupt/solid-client-authn-core");
jest.mock("@inrupt/solid-client-authn-browser");
jest.mock("@inrupt/solid-client", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getFile = jest.fn();
  return solidClientModule;
});

describe("getSolidDataset", () => {
  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn() as typeof global.fetch;
    const authnModule = jest.requireMock(
      "@inrupt/solid-client-authn-core"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    authnModule.fetchWithVc = jest.fn();
    // TODO: change to mockAccessGrantVc when rebasing
    await getFile("https://some.dataset.url", mockAccessRequestVc(), {
      fetch: mockedFetch,
    });
    expect(authnModule.fetchWithVc).toHaveBeenCalledWith(expect.anything(), {
      fetch: mockedFetch,
    });
  });

  it("defaults to the session fetch", async () => {
    const mockedFetch = jest.fn() as typeof global.fetch;
    const authnBrowserModule = jest.requireMock(
      "@inrupt/solid-client-authn-browser"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    authnBrowserModule.fetch = mockedFetch;
    const authnCoreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    authnCoreModule.fetchWithVc = jest.fn();
    // TODO: change to mockAccessGrantVc when rebasing
    await getFile("https://some.dataset.url", mockAccessRequestVc());
    expect(authnCoreModule.fetchWithVc).toHaveBeenCalledWith(
      expect.anything(),
      {
        fetch: mockedFetch,
      }
    );
  });

  it("authenticates using the provided VC", async () => {
    const mockedVcFetch = jest.fn() as typeof global.fetch;
    const authnModule = jest.requireMock(
      "@inrupt/solid-client-authn-core"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    authnModule.fetchWithVc = jest
      .fn(fetchWithVc)
      // TODO: Replace the as never when properly importing fetchWithVc
      .mockResolvedValueOnce(mockedVcFetch as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solidClientModule = jest.requireMock("@inrupt/solid-client") as any;
    const mockedFile = new File([], "some-file");
    solidClientModule.getFile.mockResolvedValueOnce(mockedFile);
    // TODO: change to mockAccessGrantVc when rebasing
    const resultFile = await getFile(
      "https://some.dataset.url",
      mockAccessRequestVc(),
      {
        fetch: jest.fn(),
      }
    );
    expect(authnModule.fetchWithVc).toHaveBeenCalledWith(
      mockAccessRequestVc(),
      expect.anything()
    );
    expect(solidClientModule.getFile).toHaveBeenCalledWith(
      "https://some.dataset.url",
      {
        fetch: mockedVcFetch,
      }
    );
    expect(resultFile).toBe(mockedFile);
  });

  it("supports the dataset IRI being a named node", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solidClientModule = jest.requireMock("@inrupt/solid-client") as any;
    solidClientModule.getFile = jest.fn();
    // TODO: change to mockAccessGrantVc when rebasing
    await getFile(
      namedNode("https://some.dataset.url"),
      mockAccessRequestVc(),
      {
        fetch: jest.fn(),
      }
    );
    expect(solidClientModule.getFile).toHaveBeenCalledWith(
      "https://some.dataset.url",
      expect.anything()
    );
  });
});
