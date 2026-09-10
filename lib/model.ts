import { fieldChannel } from "./decorators/field";
import { tableize } from "./helpers/string_helpers";
import "./polyfills/metadata";
import { primaryKeyChannel } from "./decorators/primary_key";
import { tableChannel } from "./decorators/table";
import { Relation } from "./relation";
import { Adapter } from "./adapters/adapter";

export type ModelClass<T> = typeof BaseModel & (abstract new () => T);
export type ConcreteModelClass<T> = typeof BaseModel & (new () => T);

export class BaseModel {
  private static adapter?: Adapter;
  #persisted: boolean = false;

  static establishConnection(adapter: Adapter): void {
    this.adapter = adapter;
  }

  static get connection(): Adapter {
    if (!this.adapter) {
      throw new Error(
        `No database connection established for model "${this.name}"`,
      );
    }
    return this.adapter;
  }

  static get tableName(): string {
    return tableChannel.readOwnClass(this)?.tableName ?? tableize(this.name);
  }

  static get fields() {
    return fieldChannel.readClass(this);
  }

  static columnMetaFor(property: string) {
    const fieldMeta = this.fields[property];
    if (!fieldMeta) {
      throw new Error(
        `No field metadata found for property "${property}" on model "${this.name}"`,
      );
    }
    return fieldMeta;
  }

  static get primaryKey() {
    return primaryKeyChannel.readClass(this);
  }

  static fromRow<T extends BaseModel>(
    this: ConcreteModelClass<T>,
    row: Record<string, unknown>,
  ): T {
    const instance = new this();
    for (const [prop, meta] of Object.entries(this.fields)) {
      (instance as any)[prop] = this.connection.fromDatabase(
        row[meta.columnName],
        meta.type,
      );
    }
    return instance;
  }

  static all<T extends BaseModel>(this: ModelClass<T>): Relation<T> {
    return new Relation<T>(this);
  }

  static select<T extends BaseModel>(
    this: ModelClass<T>,
    ...columns: Parameters<Relation<T>["select"]>
  ): Relation<T> {
    return this.all().select(...columns);
  }

  static where<T extends BaseModel>(
    this: ConcreteModelClass<T>,
    ...args: Parameters<Relation<T>["where"]>
  ): Relation<T> {
    return this.all().where(...args);
  }

  static order<T extends BaseModel>(
    this: ModelClass<T>,
    ...args: Parameters<Relation<T>["order"]>
  ): Relation<T> {
    return this.all().order(...args);
  }

  static limit<T extends BaseModel>(
    this: ModelClass<T>,
    ...args: Parameters<Relation<T>["limit"]>
  ): Relation<T> {
    return this.all().limit(...args);
  }

  static offset<T extends BaseModel>(
    this: ModelClass<T>,
    ...args: Parameters<Relation<T>["offset"]>
  ): Relation<T> {
    return this.all().offset(...args);
  }
}
