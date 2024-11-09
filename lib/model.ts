import { OptionalOrArray, ConstructorFunctionType } from "types/base_types";
import { Relation } from "./relation";

export abstract class BaseModel {
  static __tableName: string;
  static get tableName(): string {
    if (this.__tableName) {
      return this.__tableName;
    }

    return this.name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .slice(1);
  }
}

// export function model(tableName: string) {
//   return function<Args extends any[], Return, This extends ConstructorFunctionType<Args, Return>>(
//     Constructor: This,
//     { kind, name, addInitializer }: ClassDecoratorContext
//   ) {
//     return class extends Constructor {
//       static __tableName: string = tableName;
//       static get tableName(): string {
//         if (this.__tableName) {
//           return this.__tableName;
//         }

//         return this.name.replace(/([A-Z])/g, "_$1").toLowerCase().slice(1);
//       }

//       static select(fields: keyof InstanceType<T>[]): Relation<T> {
//         return new Relation<T>(this.tableName).select(fields);
//       }

//       static where(condition: OptionalOrArray<InstanceType<T>>): Relation<T> {
//         return new Relation(this.tableName);
//       }

//       constructor(...args) {
//         super()
//       }
//     }
//   }
// }

export function model<This extends ConstructorFunctionType>(
  Constructor: This
  // { kind, name, addInitializer }: ClassDecoratorContext
) {
  return class extends Constructor {
    static name: string = Constructor.name;
    static __tableName: string;
    static get tableName(): string {
      if (this.__tableName) {
        return this.__tableName;
      }

      return this.name
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .slice(1);
    }

    static select(fields: (keyof InstanceType<This>)[]): Relation<This> {
      return new Relation<This>(this.tableName).select([]);
    }

    static where(
      condition: OptionalOrArray<InstanceType<This>>
    ): Relation<This> {
      return new Relation(this.tableName);
    }

    constructor(..._args: any[]) {
      super();
    }
  };
}
