import { QueryType } from "types/base_types";

export class Relation<T> implements Iterable<T> {
  private query: QueryType<T> = {
    select: new Set(),
    where: [],
    order: []
  };

  [Symbol.iterator](): Iterator<T> {
    throw new Error("Method not implemented.");
  }

  tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  duplicate(): this {
    return Object.assign(Object.create(this), { ...this, data: []});
  }

  select(fields: (keyof T)[] | string): this {
    let dup = this.duplicate();

    if (typeof fields === "string") {
      const newFields = fields.split(/,\s{1,}/);
      dup.query.select = new Set([ ...this.query.select, ...newFields ]);
    }
    else {
      dup.query.select = new Set([ ...this.query.select, ...fields ]);
    }

    return dup
  }
}
