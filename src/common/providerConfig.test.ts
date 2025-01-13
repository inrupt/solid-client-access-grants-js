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

import { jest, it, describe, expect, beforeEach } from "@jest/globals";
import {
  buildProviderContext,
  DEFAULT_CONTEXT,
  getIssuerContext,
  clearProviderCache,
} from "./providerConfig";
import { mockProviderConfig } from "./providerConfig.mock";

describe("getIssuerContext", () => {
  beforeEach(() => {
    clearProviderCache();
  });

  it("fetches the issuer config to read its context", async () => {
    const mockedConfig = mockProviderConfig({});
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedConfig)));
    const ctx = await getIssuerContext(new URL("https://vc.example.org"));
    expect(ctx).toBe(mockedConfig["@context"][1]);
  });

  it("caches the issuer config on subsequent calls", async () => {
    const mockedConfig = mockProviderConfig({});
    const mockedFetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedConfig)));
    const ctx1 = await getIssuerContext(new URL("https://vc.example.org"));
    const ctx2 = await getIssuerContext(new URL("https://vc.example.org"));
    const ctx3 = await getIssuerContext(new URL("https://vc.example.org"));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(ctx1).toBe(mockedConfig["@context"][1]);
    expect(ctx2).toBe(mockedConfig["@context"][1]);
    expect(ctx3).toBe(mockedConfig["@context"][1]);
  });
});

describe("buildIssuerContext", () => {
  it("uses the context from the provider if supported", async () => {
    const mockedConfig1 = mockProviderConfig({
      context: "https://schema.inrupt.com/credentials/v1.jsonld",
    });
    const mockedConfig2 = mockProviderConfig({
      context: "https://schema.inrupt.com/credentials/v2.jsonld",
    });
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedConfig1)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedConfig2)));
    const v1Ctxs = await buildProviderContext(
      new URL("https://vc.v1.example.org"),
    );
    expect(v1Ctxs).toContain(mockedConfig1["@context"][1]);
    const v2Ctxs = await buildProviderContext(
      new URL("https://vc.v2.example.org"),
    );
    expect(v2Ctxs).toContain(mockedConfig2["@context"][1]);
  });

  it("uses the latest supported context if the provider uses an unknown context", async () => {
    const mockedConfig = mockProviderConfig({
      context: "https://schema.inrupt.com/credentials/v999.jsonld",
    });

    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(mockedConfig)));
    const ctxs = await buildProviderContext(new URL("https://vc.example.org"));
    expect(ctxs).not.toContain(mockedConfig["@context"][1]);
    expect(ctxs).toContain(DEFAULT_CONTEXT);
  });
});
