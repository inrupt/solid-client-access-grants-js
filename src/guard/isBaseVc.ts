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

import { CREDENTIAL_TYPE } from "../constants";
import { BaseBody } from "../type/AccessVerifiableCredential";
import { isUnknownObject } from "./isUnknownObject";
import { isConsentContext } from "./isConsentContext";

export function isBaseVc(x: unknown): x is BaseBody {
  return (
    isUnknownObject(x) &&
    isConsentContext(x["@context"]) &&
    Array.isArray(x.type) &&
    x.type.includes(CREDENTIAL_TYPE) &&
    isUnknownObject(x.credentialSubject) &&
    typeof x.credentialSubject.id === "string" &&
    typeof x.credentialSubject.inbox === "string"
  );
}
