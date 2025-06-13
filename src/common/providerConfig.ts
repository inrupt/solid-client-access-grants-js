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

import { CONTEXT_VC_W3C } from "../gConsent/constants";

export const SUPPORTED_CONTEXTS = [
  "https://schema.inrupt.com/credentials/v1.jsonld",
  "https://schema.inrupt.com/credentials/v2.jsonld",
] as const;

const SELF_HOSTED_URI_TEMPLATE = "https://{DOMAIN}/credentials/v1";
const instantiateSelfHosted = (domain: string) =>
  SELF_HOSTED_URI_TEMPLATE.replace("{DOMAIN}", domain);

// The type assertion is required because TS doesn't validate the const array size vs the index.
export const DEFAULT_CONTEXT = SUPPORTED_CONTEXTS.at(
  -1,
) as (typeof SUPPORTED_CONTEXTS)[number];
const WELL_KNOWN_CONFIG = "/.well-known/vc-configuration";

export type AccessProvider = {
  context: (typeof SUPPORTED_CONTEXTS)[number] | string;
};

const providerCache: Record<string, AccessProvider> = {};

/**
 * This is an internal function to avoid having to mock fetch on all tests.
 * @hidden
 */
export function cacheProvider(url: string, provider: AccessProvider) {
  providerCache[url] = provider;
}

/**
 * This is an internal function to avoid having to mock fetch on all tests.
 * @hidden
 */
export function clearProviderCache() {
  Object.keys(providerCache).forEach((url) => {
    delete providerCache[url];
  });
}

/**
 * This internal function negotiates the most recent context supported by both the provider and the client.
 * It also caches the result in memory so that the VC provider configuration is only fetched once.
 * FIXME: use proper caching for eventual eviction.
 */
export async function getIssuerContext(
  issuer: URL,
): Promise<(typeof SUPPORTED_CONTEXTS)[number] | undefined | string> {
  if (providerCache[issuer.href] !== undefined) {
    return providerCache[issuer.href].context;
  }
  const configUrl = new URL(WELL_KNOWN_CONFIG, issuer);
  const response = await fetch(configUrl);
  try {
    const config = await response.json();
    const contexts = config["@context"] as Array<string>;
    let providerCtx = contexts.find((ctx) =>
      // Typescript is too strict validating consts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SUPPORTED_CONTEXTS.includes(ctx as any),
    );
    const selfHosted = instantiateSelfHosted(issuer.hostname);
    // If no canonical context is being used, check for self-hosted (applicable to ESS 2.2).
    if (providerCtx === undefined && contexts.indexOf(selfHosted) !== -1) {
      // If the well-known config uses a self-hosted context, canonical v1 should be used.
      [providerCtx] = SUPPORTED_CONTEXTS;
    }
    if (providerCtx !== undefined) {
      providerCache[issuer.href] = { context: providerCtx };
    }
    return providerCtx;
  } catch (e) {
    // We don't want this issue to be swallowed silently.

    console.error(e);
  }
  return undefined;
}

export const buildProviderContext = async (
  issuer: URL,
): Promise<Array<string>> => [
  CONTEXT_VC_W3C,
  // If the issuer uses a context we don't support, default to the latest supported.
  (await getIssuerContext(issuer)) ?? DEFAULT_CONTEXT,
];
