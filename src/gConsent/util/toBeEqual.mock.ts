import { expect } from "@jest/globals";

/**
 * Remove the properties of an RDF.DatasetCore from an object so that
 * we can do equality matches in jest without those functions causing
 * problems
 */
function viaJson(data: any) {
  return JSON.parse(JSON.stringify(data));
}
function withoutDataset(data: any) {
  return {
    ...data,
    match: undefined,
    has: undefined,
    add: undefined,
    size: undefined,
    delete: undefined,
    toJSON: undefined,
    [Symbol.iterator]: undefined
  };
}
export function toBeEqual(receieved: any, actual: any) {
  expect(viaJson(receieved)).toEqual(viaJson(actual));
  expect(withoutDataset(receieved)).toEqual(withoutDataset(actual));

  expect(viaJson(receieved)).toStrictEqual(viaJson(actual));
  expect(withoutDataset(receieved)).toStrictEqual(withoutDataset(actual));
}
