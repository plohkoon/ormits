import sqlite3 from "sqlite3";
import type { Query } from "../query";
import type { ColumnType } from "../decorators/field";
import {
  BaseAdapter,
  type Executor,
  type Row,
  type RunResult,
} from "./adapter";

export class SqliteAdapter extends BaseAdapter {
  private db: sqlite3.Database | null = null;

  constructor(private readonly path: string) {
    super();
  }

  // --- communication ---
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.path, (err) => {
        if (err) reject(err);
        else {
          this.db = db;
          resolve();
        }
      });
    });
  }

  disconnect(): Promise<void> {
    const db = this.handle();
    return new Promise((resolve, reject) => {
      db.close((err) => {
        this.db = null;
        err ? reject(err) : resolve();
      });
    });
  }

  all(query: Query): Promise<Row[]> {
    const db = this.handle();
    return new Promise((resolve, reject) => {
      db.all(query.sql, [...query.bindings], (err, rows: Row[]) =>
        err ? reject(err) : resolve(rows),
      );
    });
  }

  get(query: Query): Promise<Row | undefined> {
    const db = this.handle();
    return new Promise((resolve, reject) => {
      db.get(query.sql, [...query.bindings], (err, row: Row | undefined) =>
        err ? reject(err) : resolve(row),
      );
    });
  }

  run(query: Query): Promise<RunResult> {
    const db = this.handle();
    return new Promise((resolve, reject) => {
      db.run(query.sql, [...query.bindings], function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastInsertId: this.lastID });
      });
    });
  }

  exec(sql: string): Promise<void> {
    const db = this.handle();
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });
  }

  async transaction<R>(fn: (tx: Executor) => Promise<R>): Promise<R> {
    await this.exec("BEGIN");
    try {
      const result = await fn(this); // one connection, so the adapter is the executor
      await this.exec("COMMIT");
      return result;
    } catch (e) {
      await this.exec("ROLLBACK");
      throw e;
    }
  }

  // --- dialect ---
  override limitOffset(
    limit: number | undefined,
    offset: number | undefined,
  ): string {
    if (offset !== undefined && limit === undefined)
      return `LIMIT -1 OFFSET ${offset}`;
    return super.limitOffset(limit, offset);
  }

  override columnTypeSQL(type: ColumnType): string {
    return type === "boolean" ? "INTEGER" : super.columnTypeSQL(type);
  }

  private handle(): sqlite3.Database {
    if (!this.db)
      throw new Error("SqliteAdapter is not connected; call connect() first");
    return this.db;
  }
}
