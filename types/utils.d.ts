
// Credit to
// https://stackoverflow.com/questions/57592501/typescript-get-property-field-names-of-type
type KeysOf<T> = Union<NonNullable<
{ [K in keyof T]: T[K] extends string ? K : never }[keyof T]
>>;
