
// Credit to
// https://stackoverflow.com/questions/57592501/typescript-get-property-field-names-of-type
type KeysMatching<T, V> = Union<NonNullable<
{ [K in keyof T]: T[K] extends V ? K : never }[keyof T]
>>;
