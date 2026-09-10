import { decoratorWithConfig } from "../helpers/decorator_helper";
import { metadataChannel } from "../helpers/metadata_channel";
import "../polyfills/metadata";

export const fieldChannel = metadataChannel<FieldMap>("ormits:fields", {
  empty: () => ({}),
  inherit: (parent) => ({ ...parent }),
});

interface ColumnTypes {
  integer: {
    value: number;
    config: { autoincrement?: boolean; default?: number };
  };
  text: { value: string; config: { default?: string } };
  boolean: { value: boolean; config: { default?: boolean } };
}

export type ColumnType = keyof ColumnTypes;

declare const brand: unique symbol;
export type Column<T, K extends ColumnType> = T & { readonly [brand]?: K };
type ValueFor<K extends ColumnType> = Column<ColumnTypes[K]["value"], K>;

interface BaseFieldConfig {
  columnName?: string;
  nullable?: boolean;
}

type SugarConfigFor<K extends ColumnType> = BaseFieldConfig &
  ColumnTypes[K]["config"];
type ConfigFor<K extends ColumnType> = SugarConfigFor<K> & { columnType: K };
export type FieldConfig = { [K in ColumnType]: ConfigFor<K> }[ColumnType];

export type FieldKeys<T> = {
  [K in keyof T & string]: NonNullable<T[K]> extends Column<unknown, ColumnType>
    ? K
    : never;
}[keyof T & string];
export type Attributes<T> = Pick<T, FieldKeys<T>>;
export type ColumnTypeOf<T, K extends FieldKeys<T>> =
  NonNullable<T[K]> extends Column<unknown, infer C> ? C : never;

interface FieldMeta {
  columnName: string;
  type: ColumnType;
  nullable: boolean;
  default?: unknown;
}

type FieldMap = Record<string, FieldMeta>;

export function registerField(
  metadata: DecoratorMetadataObject,
  name: string | symbol,
  meta: FieldMeta,
): void {
  const fields = fieldChannel.own(metadata);
  const key = String(name);
  console.log("Registering Field", meta.columnName, meta.type);
  if (Object.hasOwn(fields, key)) {
    throw new Error(
      `Field "${key}" is registered twice — stacked field decorators? ` +
        `(e.g. @int @text ${key})`,
    );
  }
  fields[key] = meta;
}

function fieldImpl<Value = unknown>(config: FieldConfig) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<unknown, Value>,
  ) {
    registerField(context.metadata, context.name, {
      columnName: config.columnName ?? String(context.name),
      type: config.columnType,
      nullable: config.nullable ?? false,
      default: config.default,
    });
  };
}

export function field<C extends FieldConfig>(config: C) {
  return fieldImpl<ValueFor<C["columnType"]> | null>(config);
}

function typedField<T extends ColumnType>(columnType: T) {
  return decoratorWithConfig((config?: SugarConfigFor<T>) =>
    fieldImpl<ValueFor<T> | null>({ ...config, columnType } as FieldConfig),
  );
}

export const int = typedField("integer");
export type Int = Column<number, "integer">;
export const text = typedField("text");
export type Text = Column<string, "text">;
export const boolean = typedField("boolean");
export type Bool = Column<boolean, "boolean">;
