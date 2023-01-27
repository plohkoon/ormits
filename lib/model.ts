import { OptionalOrArray } from "types/base_types";
import { Relation } from "./relation";

export abstract class BaseModel {
  static __tableName: string;
  static get tableName(): string {
    if (this.__tableName) {
      return this.__tableName;
    }

    return this.name.replace(/([A-Z])/g, "_$1").toLowerCase().slice(1);
  }
}

export function model(tableName: string) {
  return function<T extends BaseModel>(constructor: T) {
    return class extends constructor {
      static __tableName: string = tableName;
      static get tableName(): string {
        if (this.__tableName) {
          return this.__tableName;
        }

        return this.name.replace(/([A-Z])/g, "_$1").toLowerCase().slice(1);
      }

      static select(fields: keyof InstanceType<T>[]): Relation<T> {
        return new Relation<T>(this.tableName).select(fields);
      }

      static where(condition: OptionalOrArray<InstanceType<T>>): Relation<T> {
        return new Relation(this.tableName);
      }
    }
  }
}
