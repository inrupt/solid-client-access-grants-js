//
// Copyright 2022 Inrupt Inc.
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

import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import type { UrlString } from "@inrupt/solid-client";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import type {
  AccessGrantBody,
  AccessRequestBody,
} from "../type/AccessVerifiableCredential";
import { getSessionFetch } from "./getSessionFetch";
import { isBaseAccessRequestVerifiableCredential } from "../guard/isBaseAccessRequestVerifiableCredential";
import { isBaseAccessGrantVerifiableCredential } from "../guard/isBaseAccessGrantVerifiableCredential";

async function getVerifiableCredential(
  vc: URL | UrlString,
  options: AccessBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = await getSessionFetch(options);
  const vcAsUrlString = vc.toString();
  const issuerResponse = await fetcher(vcAsUrlString);
  if (!issuerResponse.ok) {
    throw new Error(
      `An error occurred when looking up [${vcAsUrlString}]: ${issuerResponse.status} ${issuerResponse.statusText}`
    );
  }
  // TODO: Type checking VerifiableCredential (probably via solid-client-vc?)
  return (await issuerResponse.json()) as VerifiableCredential;
}

export async function getBaseAccessGrantVerifiableCredential(
  vc: VerifiableCredential | URL | UrlString,
  options: AccessBaseOptions
): Promise<AccessGrantBody & VerifiableCredential> {
  const fetchedVerifiableCredential =
    typeof vc === "string" || vc instanceof URL
      ? await getVerifiableCredential(vc, options)
      : vc;
  if (!isBaseAccessGrantVerifiableCredential(fetchedVerifiableCredential)) {
    throw new Error(
      `An error occurred when type checking the VC, it is not a BaseAccessVerifiableCredential.`
    );
  }
  return fetchedVerifiableCredential as AccessGrantBody & VerifiableCredential;
}

export async function getBaseAccessRequestVerifiableCredential(
  vc: VerifiableCredential | URL | UrlString,
  options: AccessBaseOptions
): Promise<AccessRequestBody & VerifiableCredential> {
  const fetchedVerifiableCredential =
    typeof vc === "string" || vc instanceof URL
      ? await getVerifiableCredential(vc, options)
      : vc;
  if (!isBaseAccessRequestVerifiableCredential(fetchedVerifiableCredential)) {
    throw new Error(
      `An error occurred when type checking the VC, it is not a BaseAccessVerifiableCredential.`
    );
  }
  return fetchedVerifiableCredential as AccessRequestBody &
    VerifiableCredential;
}
