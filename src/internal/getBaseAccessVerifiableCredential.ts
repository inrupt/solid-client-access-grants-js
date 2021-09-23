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

import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { IriString, UrlString } from "@inrupt/solid-client";
import { ConsentGrantBaseOptions } from "../constants";
import { BaseAccessBody, getDefaultSessionFetch } from "../consent.internal";
import { isBaseAccessVerifiableCredential } from "../guard/isBaseAccessVerifiableCredential";

export async function getVerifiableCredential(
  vcIri: IriString | URL,
  fetcher: typeof global.fetch
): Promise<VerifiableCredential> {
  const vc = vcIri instanceof URL ? vcIri.toString() : vcIri;
  const issuerResponse = await fetcher(vc);
  if (!issuerResponse.ok) {
    throw new Error(
      `An error occured when looking up [${vc}]: ${issuerResponse.status} ${issuerResponse.statusText}`
    );
  }
  return (await issuerResponse.json()) as VerifiableCredential;
}

// eslint-disable-next-line import/prefer-default-export
export async function getBaseAccessVerifiableCredential(
  vc: VerifiableCredential | URL | UrlString,
  options: ConsentGrantBaseOptions
): Promise<BaseAccessBody & VerifiableCredential> {
  // TODO: Actually test the getDefaultSessionFetch() gets called by default (refactor)
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  const fetchedVerifiableCredential =
    typeof vc === "string" || vc instanceof URL
      ? await getVerifiableCredential(vc, fetcher)
      : vc;
  if (!isBaseAccessVerifiableCredential(fetchedVerifiableCredential)) {
    throw new Error(
      `An error occured when type checking the VC, it is not a BaseAccessVerifiableCredential.`
    );
  }
  return fetchedVerifiableCredential;
}
