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

import {
  createLDNDataset,
  getDefaultSessionFetch,
  getInboxFromWebId,
  createConsentGrantRequest,
  isSolidDataset,
  approveConsentGrant,
  rejectConsentGrant,
  getAllConsentGrants,
  getConsentGrant,
  revokeConsentGrant,
} from "./consent";

describe("createLDNDataset", () => {
  test("is defined", () => {
    expect(createLDNDataset).toBeDefined();
  });
});

describe("getDefaultSessionFetch", () => {
  test("is defined", () => {
    expect(getDefaultSessionFetch).toBeDefined();
  });
});

describe("getInboxFromWebId", () => {
  test("is defined", () => {
    expect(getInboxFromWebId).toBeDefined();
  });
});

describe("createConsentGrantRequest", () => {
  test("is defined", () => {
    expect(createConsentGrantRequest).toBeDefined();
  });
});

describe("isSolidDataset", () => {
  test("is defined", () => {
    expect(isSolidDataset).toBeDefined();
  });
});

describe("approveConsentGrant", () => {
  test("is defined", () => {
    expect(approveConsentGrant).toBeDefined();
  });
});

describe("rejectConsentGrant", () => {
  test("is defined", () => {
    expect(rejectConsentGrant).toBeDefined();
  });
});

describe("getAllConsentGrants", () => {
  test("is defined", () => {
    expect(getAllConsentGrants).toBeDefined();
  });
});

describe("getConsentGrant", () => {
  test("is defined", () => {
    expect(getConsentGrant).toBeDefined();
  });
});

describe("revokeConsentGrant", () => {
  test("is defined", () => {
    expect(revokeConsentGrant).toBeDefined();
  });
});
