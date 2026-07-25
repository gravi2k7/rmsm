/** One rule in a "domain mapping" — copies `sourceField` from a raw
 * extracted object to `targetField` on the mapped output, optionally
 * running it through `transform` first. Plain data (a function
 * reference for `transform`, supplied by the caller at call time, not
 * stored on this entity) so the mapping *definition* itself
 * (`sourceField`/`targetField` pairs) stays inspectable/serializable. */
export interface FieldMapping {
  readonly sourceField: string;
  readonly targetField: string;
}
