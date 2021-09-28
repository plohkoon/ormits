import { sql } from "./sql";

namespace ActiveRecord {


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
