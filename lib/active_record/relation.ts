import { OptionalOrArray, QueryType } from "../../types/base_types";

export class Relation<T> { // TODO extends Array<T>{
  private data: T[] = [];
  private query: QueryType<T> = {
    select: new Set(),
    where: [],
    order: []
  }
  private tableName: string;

  constructor(tableName: string) {
    // TODO super();
    this.tableName = tableName;
  }
  // Duplicate object with it's values and prototype
  duplicate(): this {
    return Object.assign(Object.create(this), { ...this, data: []});
  }

  select(fields: (keyof T)[] | string): this {
    let dup = this.duplicate();

    if (typeof fields === "string") {
      const newFields = fields.split(/,\s{1,}/)
      dup.query.select = new Set([ ...this.query.select, ...newFields ]);
    } else {
      dup.query.select = new Set([ ...this.query.select, ...fields ]);
    }
    return dup;
  }

  where(condition: OptionalOrArray<T> | string): this {
    const dup = this.duplicate();
    const query = dup.query;

    if (typeof condition === "string") {
      if (!condition.match(/^\(.*\)$/))
        condition = `(${condition})`;
      query.where = query.where.concat(condition);
    } else {
      const conditions: string[] = [];
      for (const key in condition) {
        const value = condition[key];

        if (Array.isArray(value)) {
          const values = value.join(",");
          conditions.push(`${key} IN (${values})`);
        } else if (typeof value !== "undefined") {
          // TODO this typing is stupid
          conditions.push(`${key} = "${value as unknown as string}"`);
        }
      }

      const joinedConditions = conditions.join(" AND ");
      query.where.push(`(${joinedConditions})`);
    }

    return dup;
  }
}
