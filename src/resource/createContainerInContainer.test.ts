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

import { it, jest, describe, expect, beforeAll } from "@jest/globals";
import { mockSolidDatasetFrom } from "@inrupt/solid-client";
import type * as SolidClient from "@inrupt/solid-client";
import { mockAccessRequestVc } from "../gConsent/util/access.mock";
import { fetchWithVc } from "../fetch";
import { createContainerInContainer } from "./createContainerInContainer";

jest.mock("../fetch");
jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual(
    "@inrupt/solid-client",
  ) as typeof SolidClient;
  solidClientModule.createContainerInContainer =
    jest.fn<(typeof SolidClient)["createContainerInContainer"]>();
  return solidClientModule;
});

const MOCKED_DATASET = mockSolidDatasetFrom("https://some.url");
const TEST_CONTAINER_URL: SolidClient.UrlString =
  "https://example.come/container/anothercontainer";

describe("createContainerInContainer", () => {
  let mockAccessRequest: Awaited<ReturnType<typeof mockAccessRequestVc>>;

  beforeAll(async () => {
    mockAccessRequest = await mockAccessRequestVc();
  });

  it("authenticates using the provided VC", async () => {
    const solidClientModule = jest.requireMock(
      "@inrupt/solid-client",
    ) as jest.Mocked<typeof SolidClient>;
    const mockedDataset = mockSolidDatasetFrom("https://some.url");
    solidClientModule.createContainerInContainer.mockResolvedValueOnce(
      MOCKED_DATASET,
    );
    const mockedFetch = jest.fn<typeof fetch>();
    const resultDataset = await createContainerInContainer(
      TEST_CONTAINER_URL,
      mockAccessRequest,
      { fetch: mockedFetch, slugSuggestion: "NewChildContainer" },
    );

    expect(fetchWithVc).toHaveBeenCalledWith(
      TEST_CONTAINER_URL,
      mockAccessRequest,
      { fetch: mockedFetch },
    );

    expect(solidClientModule.createContainerInContainer).toHaveBeenCalledWith(
      TEST_CONTAINER_URL,
      expect.anything(),
    );

    expect(resultDataset).toStrictEqual(mockedDataset);
  });
});
