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

import { describe, it, expect } from "@jest/globals";
import {
  isValidAccessGrant,
  AccessGrantWrapper,
  getAccessModes,
  getExpirationDate,
  getId,
  getIssuanceDate,
  getIssuer,
  getRequestor,
  getResourceOwner,
  getResources,
  getTypes,
} from "./index";
import * as packageExports from "./index";

describe("Index exports", () => {
  it("exposes expected things", () => {
    expect(Object.keys(packageExports)).toEqual([
      "isValidAccessGrant",
      "AccessGrantWrapper",
      "getAccessModes",
      "getExpirationDate",
      "getId",
      "getIssuanceDate",
      "getIssuer",
      "getRequestor",
      "getResourceOwner",
      "getResources",
      "getTypes",
    ]);

    expect(isValidAccessGrant).toBeDefined();
    expect(AccessGrantWrapper).toBeDefined();
    expect(getAccessModes).toBeDefined();
    expect(getExpirationDate).toBeDefined();
    expect(getId).toBeDefined();
    expect(getIssuanceDate).toBeDefined();
    expect(getIssuer).toBeDefined();
    expect(getRequestor).toBeDefined();
    expect(getResourceOwner).toBeDefined();
    expect(getResources).toBeDefined();
    expect(getTypes).toBeDefined();
  });
});
