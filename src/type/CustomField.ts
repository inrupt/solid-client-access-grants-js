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

import { DataFactory } from "n3";
import { INHERIT, acl, gc } from "../common/constants";
import { AccessGrantError } from "../common/errors/AccessGrantError";

const { namedNode } = DataFactory;

export type CustomField = {
  /* The custom field name (this must be a URL). */
  key: URL;
  /* The custom field value (this must be a literal). */
  value: string | number | boolean | undefined;
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
  const fieldNode = namedNode(field.href);
  return WELL_KNOWN_FIELDS.some((p) => p.equals(fieldNode));
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
          throw new AccessGrantError(
            `${field.key.href} is a reserved field, and cannot be used as a custom field`,
          );
        }
        if (typeof field.key !== "object") {
          throw new AccessGrantError(
            `All custom fields keys must be URL objects, found ${field.key}`,
          );
        }
        if (
          !["string", "number", "boolean", "undefined"].includes(
            typeof field.value,
          )
        ) {
          throw new AccessGrantError(
            `All custom fields values must be literals, found ${JSON.stringify(field.value)} (of type ${typeof field.value})`,
          );
        }
        return { [`${field.key.toString()}`]: field.value };
      })
      // Collapse all the JSON object entries into a single object.
      .reduce(
        (acc, cur) => {
          // We know the current object has a single key.
          if (acc[Object.keys(cur)[0]] !== undefined) {
            // If the provided key already exists, the input is invalid.
            throw new AccessGrantError(
              `Each custom field key must be unique. Found multiple values for ${Object.keys(cur)[0]}`,
            );
          }
          return Object.assign(acc, cur);
        },
        {} as Record<string, CustomField["value"]>,
      )
  );
};
