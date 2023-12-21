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
import type { JsonLd } from "@inrupt/solid-client-vc";
import { expect } from "@jest/globals";
import type { DatasetCore } from "@rdfjs/types";

/**
 * Remove the properties of an RDF.DatasetCore from an object so that
 * we can do equality matches in jest without those functions causing
 * problems
 */
function viaJson(data: JsonLd) {
  return JSON.parse(JSON.stringify(data));
}
export function withoutDataset<T>(data: T): Omit<T, keyof DatasetCore> {
  const res = {
    ...data,
    match: undefined,
    has: undefined,
    add: undefined,
    size: undefined,
    delete: undefined,
    toJSON: undefined,
    [Symbol.iterator]: undefined,
  };

  delete res.match;
  delete res.has;
  delete res.add;
  delete res.size;
  delete res.delete;
  delete res.toJSON;
  delete res[Symbol.iterator];

  return res;
}
export function toBeEqual(receieved: JsonLd, actual: JsonLd) {
  expect(viaJson(receieved)).toEqual(viaJson(actual));
  expect(withoutDataset(receieved)).toEqual(withoutDataset(actual));

  expect(viaJson(receieved)).toStrictEqual(viaJson(actual));
  // FIXME: See if this strict equality is important
  // expect(withoutDataset(receieved)).toStrictEqual(withoutDataset(actual));
}
