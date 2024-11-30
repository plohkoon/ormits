import { OptionalOrArray, ConstructorFunctionType } from "types/base_types";
import { Relation } from "./relation";

export abstract class BaseModel<
  ModelProperties extends Record<Keys, any>,
  Keys extends string
> {
  static __tableName?: string;
  static get tableName(): string {
    if (this.__tableName) {
      return this.__tableName;
    }

    return this.name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .slice(1);
  }

  constructor(params: Partial<ModelProperties>) {
    for (const key in params) {
      this[key] = params[key];
    }
  }
}

export function model(tableName: string) {
  return <This extends typeof BaseModel>(constructor: This) => {
    constructor.__tableName = tableName;
  };
}
