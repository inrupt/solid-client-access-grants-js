export type CustomFields = {
  /* The custom field name (this must be a URL). */
  key: URL;
  /* The custom field value (this must be a litteral). */
  value: string | number | boolean;
};

/**
 * Internal function to collapse the user-provided custom fields into
 * a simple JSON object.
 *
 * @hidden
 */
export const toJson = (
  c: Set<CustomFields> = new Set(),
): Record<string, CustomFields["value"]> => {
  return (
    Array.from(c)
      // Check that all the provided custom fields match the expected type,
      // and change the validated CustomField into a plain JSON object entry.
      .map((field) => {
        if (typeof field.key !== "object") {
          throw new Error(
            `All custom fields keys must be URL objects, found ${field.key}`,
          );
        }
        return { [`${field.key.toString()}`]: field.value };
      })
      // Collapse all the JSON object entries into a single object.
      .reduce(
        (acc, cur) => Object.assign(acc, cur),
        {} as Record<string, CustomFields["value"]>,
      )
  );
};
