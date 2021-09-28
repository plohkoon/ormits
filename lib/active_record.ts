import { sql } from "./sql";

namespace ActiveRecord {
  interface QueryType<T> {
    select: Set<keyof T | string>;
    where: string[];
    order: string[];
  }

  type OptionalOrArray<T> = {
    [K in keyof T]?: T[K] | Array<T[K]>;
  }

  // type OwnReturn = <T extends typeof Relation>(this: T): InstanceType<T>;

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

  // This is encapsulated in a function so that the type generic is available to static methods
  export function Base<T>() {
    class BaseModel {
      static __tableName: string | null;
      static get tableName(): string {
        if (this.__tableName) {
          return this.__tableName
        }
        throw new Exception("critical");
      }

      static select(fields: (keyof T)[] | string): Relation<T> {
        return new Relation<T>(this.tableName).select(fields);
      }

      static where(condition: OptionalOrArray<T> | string): Relation<T> {
        return new Relation<T>(this.tableName).where(condition);
      }
    }

    return BaseModel;
  }

  type levels = "log" | "warn" | "error" | "critical"

  export class Exception {
    level: levels;
    message?: string;
    constructor(level: levels, message?: string) {
      this.level = level;
      this.message = message
    }
  }

  export function table(tableName: string) {
    return function<T extends { new (...args: any[]): {} }>(constructor: T) {
      return class extends constructor {
        static __tableName: string = tableName;
      }
    }
  }
}

export default ActiveRecord;
