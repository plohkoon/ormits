import { OptionalOrArray } from "types/base_types";
import { Exception } from "./exception";
import { Relation } from "./relation";

// This is encapsulated in a function so that the type generic is available to static methods
function Base<T>() {
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

function table(tableName: string) {
  return function<T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      static __tableName: string = tableName;
    }
  }
}

export default Base;
export { table };
