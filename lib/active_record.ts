import { isConstructorDeclaration } from "typescript";

namespace ActiveRecord {
  interface QueryType<T> {
    select: Set<keyof T>;
    where: [];
    order: string[];
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

    select(fields: (keyof T)[]): this {
      let dup = this.duplicate();
      dup.query.select = new Set([ ...this.query.select, ...fields ]);
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

      static select(fields: (keyof T)[]): Relation<T> {
        return new Relation<T>(this.tableName).select(fields);
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
