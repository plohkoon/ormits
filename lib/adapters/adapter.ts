import type { Query } from "../query";
import type { ColumnType } from "../decorators/field";

export type Bindable = string | number | boolean | null; // move here from relation.ts
export type Row = Record<string, unknown>;

export interface RunResult {
  changes: number;
  lastInsertId: number | bigint | null;
}

// The subset that both a plain adapter and a transaction handle expose.
export interface Executor {
  all(query: Query): Promise<Row[]>;
  get(query: Query): Promise<Row | undefined>;
  run(query: Query): Promise<RunResult>;
}

export interface Adapter extends Executor {
  // 1. communication
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  exec(sql: string): Promise<void>; // DDL, no bindings
  transaction<R>(fn: (tx: Executor) => Promise<R>): Promise<R>;

  // 2. dialect: how SQL text is shaped
  quoteIdentifier(name: string): string;
  placeholder(index: number): string; // "?" or "$1"
  limitOffset(limit: number | undefined, offset: number | undefined): string;

  // 3. values: JS <-> database, both directions
  toDatabase(value: unknown, type: ColumnType): Bindable;
  fromDatabase(value: unknown, type: ColumnType): unknown;
  columnTypeSQL(type: ColumnType): string; // "INTEGER", "TEXT"... for DDL
}

export abstract class BaseAdapter implements Adapter {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract exec(sql: string): Promise<void>;
  abstract transaction<R>(fn: (tx: Executor) => Promise<R>): Promise<R>;

  abstract all(query: Query): Promise<Row[]>;
  abstract get(query: Query): Promise<Row | undefined>;
  abstract run(query: Query): Promise<RunResult>;

  quoteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  placeholder(_index: number): string {
    return "?";
  }

  limitOffset(limit: number | undefined, offset: number | undefined): string {
    const parts: string[] = [];
    if (limit !== undefined) parts.push(`LIMIT ${limit}`);
    if (offset !== undefined) parts.push(`OFFSET ${offset}`);

    return parts.join(" ");
  }

  toDatabase(value: unknown, type: ColumnType): Bindable {
    if (value === null || value === undefined) return null;
    switch (type) {
      case "boolean":
        if (typeof value !== "boolean") throw this.mismatch(value, type);
        return value ? 1 : 0;
      case "integer":
        if (typeof value !== "number" || !Number.isInteger(value))
          throw this.mismatch(value, type);
        return value;
      case "text":
        if (typeof value !== "string") throw this.mismatch(value, type);
        return value;
    }
  }

  fromDatabase(value: unknown, type: ColumnType): unknown {
    if (value === null || value === undefined) return null;
    switch (type) {
      case "boolean":
        return value === 1 || value === true;
      case "integer":
      case "text":
        return value; // the driver already hands back number / string
    }
  }

  columnTypeSQL(type: ColumnType): string {
    switch (type) {
      case "boolean":
        return "BOOLEAN";
      case "integer":
        return "INTEGER";
      case "text":
        return "TEXT";
    }
  }

  protected mismatch(value: unknown, type: ColumnType): Error {
    const got =
      value === null
        ? "null"
        : typeof value === "object"
          ? value.constructor.name
          : typeof value;
    return new TypeError(`cannot store a ${got} in a ${type} column`);
  }
}
