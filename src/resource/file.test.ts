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

import { it, jest, describe, expect } from "@jest/globals";
import { mockAccessRequestVc } from "../gConsent/util/access.mock";
import { getFile, overwriteFile, saveFileInContainer } from "./file";
import { fetchWithVc } from "../fetch";

jest.mock("../fetch");
jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual(
    "@inrupt/solid-client",
  ) as Record<string, unknown>;

  solidClientModule.getFile = jest.fn();
  solidClientModule.overwriteFile = jest.fn();
  solidClientModule.saveFileInContainer = jest.fn();

  return solidClientModule;
});

const solidClientModule = jest.requireMock("@inrupt/solid-client") as any;
const fetchModule = jest.requireMock("../fetch") as any;

const mockedFetch = jest.fn<typeof fetch>();

const authenticatedFetch = jest.fn<typeof fetch>();

fetchModule.fetchWithVc.mockResolvedValue(authenticatedFetch);

describe("getFile", () => {
  it("authenticates using the provided VC", async () => {
    const mockedFile = new Blob([]);
    solidClientModule.getFile.mockResolvedValueOnce(mockedFile);

    const fileUrl = "https://some.resource.url/file.txt";
    const accessGrant = await mockAccessRequestVc();

    const resultFile = await getFile(fileUrl, accessGrant, {
      fetch: mockedFetch,
    });

    expect(fetchWithVc).toHaveBeenCalledWith(fileUrl, accessGrant, {
      fetch: mockedFetch,
    });

    expect(solidClientModule.getFile).toHaveBeenCalledWith(fileUrl, {
      fetch: authenticatedFetch,
    });

    expect(resultFile).toBe(mockedFile);
  });
});

describe("overwriteFile", () => {
  it("authenticates using the provided VC", async () => {
    const mockedFile = new File([new Blob([])], "test-file.txt");
    solidClientModule.overwriteFile.mockResolvedValueOnce(mockedFile);

    const fileUrl = "https://some.resource.test/file.txt";
    const mockedAccessGrant = await mockAccessRequestVc();

    const resultFile = await overwriteFile(
      fileUrl,
      mockedFile,
      mockedAccessGrant,
      { fetch: mockedFetch },
    );

    expect(fetchWithVc).toHaveBeenCalledWith(fileUrl, mockedAccessGrant, {
      fetch: mockedFetch,
    });

    expect(solidClientModule.overwriteFile).toHaveBeenCalledWith(
      fileUrl,
      mockedFile,
      { fetch: authenticatedFetch },
    );

    expect(resultFile).toBe(mockedFile);
  });

  it("supports the contentType option", async () => {
    const mockedFile = new File([new Blob([])], "test-file.txt");
    solidClientModule.overwriteFile.mockResolvedValueOnce(mockedFile);

    const fileUrl = "https://some.resource.test/file.txt";
    const mockedAccessGrant = await mockAccessRequestVc();

    const resultFile = await overwriteFile(
      fileUrl,
      mockedFile,
      mockedAccessGrant,
      { fetch: mockedFetch, contentType: "text/plain" },
    );

    expect(fetchWithVc).toHaveBeenCalledWith(fileUrl, mockedAccessGrant, {
      fetch: mockedFetch,
    });

    expect(solidClientModule.overwriteFile).toHaveBeenCalledWith(
      fileUrl,
      mockedFile,
      { fetch: authenticatedFetch, contentType: "text/plain" },
    );

    expect(resultFile).toBe(mockedFile);
  });
});

describe("saveFileInContainer", () => {
  it("authenticates using the provided VC", async () => {
    const mockedFile = new File([new Blob([])], "test-file.txt");
    solidClientModule.saveFileInContainer.mockResolvedValueOnce(mockedFile);

    const containerUrl = "https://some.resource.test/";
    const fileNameSuggestion = "test-file.txt";
    const mockedAccessGrant = await mockAccessRequestVc();

    const resultFile = await saveFileInContainer(
      containerUrl,
      mockedFile,
      mockedAccessGrant,
      {
        fetch: mockedFetch,
        slug: fileNameSuggestion,
        contentType: "text/plain",
      },
    );

    expect(fetchWithVc).toHaveBeenCalledWith(containerUrl, mockedAccessGrant, {
      fetch: mockedFetch,
    });

    expect(solidClientModule.saveFileInContainer).toHaveBeenCalledWith(
      containerUrl,
      mockedFile,
      {
        fetch: authenticatedFetch,
        slug: fileNameSuggestion,
        contentType: "text/plain",
      },
    );

    expect(resultFile).toBe(mockedFile);
  });
});
