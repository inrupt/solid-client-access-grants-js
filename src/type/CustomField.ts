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

import { INHERIT, acl, gc } from "../common/constants";

export type CustomField = {
  /* The custom field name (this must be a URL). */
  key: URL;
  /* The custom field value (this must be a literal). */
  value: string | number | boolean | string[] | number[] | boolean[];
};

const WELL_KNOWN_FIELDS = [
  gc.forPersonalData,
  gc.forPurpose,
  gc.isProvidedTo,
  gc.isProvidedToController,
  gc.isProvidedToPerson,
  acl.mode,
  INHERIT,
];

function isWellKnown(field: URL) {
  return WELL_KNOWN_FIELDS.map((p) => p.value).includes(field.href);
}

/**
 * Internal function to collapse the user-provided custom fields into
 * a simple JSON object.
 *
 * @hidden
 */
export const toJson = (
  c: Set<CustomField> = new Set(),
): Record<string, CustomField["value"]> => {
  return (
    Array.from(c)
      // Check that all the provided custom fields match the expected type,
      // and change the validated CustomField into a plain JSON object entry.
      .map((field) => {
        if (isWellKnown(field.key)) {
          // FIXME use inrupt error library
          throw new Error(
            `${field.key.href} is a reserved field, and cannot be used as a custom field`,
          );
        }
        if (typeof field.key !== "object") {
          // FIXME use inrupt error library
          throw new Error(
            `All custom fields keys must be URL objects, found ${field.key}`,
          );
        }
        return { [`${field.key.toString()}`]: field.value };
      })
      // Collapse all the JSON object entries into a single object.
      .reduce(
        (acc, cur) => {
          // We know the current object has a single key.
          const curKey = Object.keys(cur)[0];
          // If the provided key already exists, the values need to
          // be combined rather than overwritten.
          if (acc[curKey] !== undefined) {
            if (Array.isArray(acc[curKey])) {
              return {
                ...acc,
                // Append the new value to the existing array.
                [`${curKey}`]: [...acc[curKey], cur[curKey]],
                // TS is rightfully upset here, because we're pretending
                // all the values for a given key are of the same type,
                // which is not enforced at write time. Typed helpers
                // will throw at read time, but untyped readers will allow
                // anything to be read back.
              } as Record<string, CustomField["value"]>;
            }
            return {
              ...acc,
              // Create a new array with the new value and the existing one.
              [`${curKey}`]: [acc[curKey], cur[curKey]],
              // See type assertion comment above.
            } as Record<string, CustomField["value"]>;
          }
          return Object.assign(acc, cur);
        },
        {} as Record<string, CustomField["value"]>,
      )
  );
};
