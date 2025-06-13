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
import type * as SolidClient from "@inrupt/solid-client";
import { mockSolidDatasetFrom } from "@inrupt/solid-client";
import { mockAccessRequestVc } from "../gConsent/util/access.mock";
import { saveSolidDatasetInContainer } from "./saveSolidDatasetInContainer";
import { fetchWithVc } from "../fetch";

jest.mock("../fetch");
jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual(
    "@inrupt/solid-client",
  ) as typeof SolidClient;
  return {
    ...solidClientModule,
    saveSolidDatasetInContainer:
      jest.fn<(typeof SolidClient)["saveFileInContainer"]>(),
  };
});

const MOCKED_DATASET = mockSolidDatasetFrom("https://some.url");
const TEST_CONTAINER_URL = "https://example.com/testContainerUrl";

describe("saveSolidDatasetInContainer", () => {
  let accessRequestVc: Awaited<ReturnType<typeof mockAccessRequestVc>>;

  beforeAll(async () => {
    accessRequestVc = await mockAccessRequestVc();
  });

  it("authenticates using the provided VC with a slugSuggestion", async () => {
    const solidClientModule = jest.requireMock(
      "@inrupt/solid-client",
    ) as jest.Mocked<typeof SolidClient>;
    const mockedDataset = mockSolidDatasetFrom("https://some.url");
    solidClientModule.saveSolidDatasetInContainer.mockResolvedValueOnce(
      mockedDataset,
    );
    const mockedFetch = jest.fn<typeof fetch>();

    const options = { fetch: mockedFetch, slugSuggestion: "test" };
    const resultDataset = await saveSolidDatasetInContainer(
      TEST_CONTAINER_URL,
      MOCKED_DATASET,
      accessRequestVc,
      options,
    );

    expect(fetchWithVc).toHaveBeenCalledWith(
      TEST_CONTAINER_URL,
      accessRequestVc,
      options,
    );

    expect(solidClientModule.saveSolidDatasetInContainer).toHaveBeenCalledWith(
      TEST_CONTAINER_URL,
      MOCKED_DATASET,
      expect.objectContaining({ slugSuggestion: "test" }),
    );

    expect(resultDataset).toStrictEqual(MOCKED_DATASET);
  });
});
