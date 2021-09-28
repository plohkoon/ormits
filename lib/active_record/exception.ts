import { levels } from "../../types/base_types";

class Exception {
  level: levels;
  message?: string;
  constructor(level: levels, message?: string) {
    this.level = level;
    this.message = message
  }
}

export { Exception };
