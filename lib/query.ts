export class Query {
  constructor(
    readonly sql: string,
    readonly bindings: readonly unknown[],
  ) {}

  toString(): string {
    let i = 0;
    return this.sql.replace(/\?/g, () =>
      this.quoteForDisplay(this.bindings[i++]),
    );
  }

  quoteForDisplay(value: unknown): string {
    if (value === null) {
      return "NULL";
    } else if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    } else {
      throw new Error(`Unsupported binding type: ${typeof value}`);
    }
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString();
  }
}
