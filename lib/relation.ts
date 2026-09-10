import { Adapter } from "./adapters/adapter";
import type { BaseModel, ConcreteModelClass } from "./model";
import { Query } from "./query";
import {
  InvalidIntegerValue,
  IrreversibleOrder,
  RecordNotFound,
} from "./errors";
import { FieldKeys } from "./decorators/field";
import { Bindable } from "./adapters/adapter";

type WhereClause =
  | { kind: "raw"; sql: string; bindings: unknown[] }
  | { kind: "conditions"; conditions: Record<string, unknown> };

type OrderClause =
  | { kind: "raw"; sql: string }
  | { kind: "field"; column: string; direction: "asc" | "desc" };

interface QueryState {
  select: ReadonlyArray<string>;
  where: ReadonlyArray<WhereClause>;
  order: ReadonlyArray<OrderClause>;
  limit?: number;
  offset?: number;
}

const DEFAULT_QUERY_STATE: QueryState = {
  select: [],
  where: [],
  order: [],
};

type WhereConditions<T> = {
  [K in FieldKeys<T>]?: T[K] | readonly T[K][] | null;
};

type OrderConditions<T> = {
  [K in FieldKeys<T>]?: "asc" | "desc";
};

function assertBindable(
  value: unknown,
  context: string,
): asserts value is Bindable | Bindable[] {
  if (value === undefined) {
    throw new Error(
      `${context}: value is undefined; use null for IS NULL or omit the key`,
    );
  }
  if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) {
      assertBindable(v, `${context}[${i}]`);
    }
    return; // elements are checked; the array itself is not a scalar
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`${context}: ${value} cannot be bound`);
  }
  const ok =
    value === null || ["string", "number", "boolean"].includes(typeof value);
  if (!ok) {
    throw new Error(
      `${context}: cannot bind a ${describe(value)}; ` +
        `flatten it to a string, number, boolean, or null`,
    );
  }
}

function describe(value: unknown): string {
  if (typeof value !== "object" || value === null) return typeof value;
  return value.constructor?.name ?? "object";
}

export class Relation<T extends BaseModel> {
  constructor(
    private readonly model: ConcreteModelClass<T>,
    private readonly state: QueryState = DEFAULT_QUERY_STATE,
  ) {}

  select(...columns: FieldKeys<T>[]): Relation<T> {
    const newSelect = [
      ...this.state.select,
      ...columns.map((c) => this.columnFor(c)),
    ];

    return new Relation<T>(this.model, { ...this.state, select: newSelect });
  }

  // TODO: It'd be really nice to get the overloading to work but this fails against the Parameter<> forwarding.
  // This is because Parameter<> only reads the final definition in the overload (conditions: WhereConditions<T>)
  // where(sql: string): Relation<T>;
  // where(sql: string, binding?: unknown): Relation<T>;
  // where(sql: string, ...bindings: unknown[]): Relation<T>;
  // where(conditions: WhereConditions<T>): Relation<T>;
  where(...args: [WhereConditions<T>] | [string, ...unknown[]]): Relation<T> {
    const [conditionsOrSql, ...bindings] = args;

    const newWhere: WhereClause[] = [...this.state.where];

    if (typeof conditionsOrSql === "string") {
      const sql = conditionsOrSql;
      assertBindable(bindings, `${this.model.name}.where("${sql}") bindings`);
      newWhere.push({ kind: "raw", sql, bindings });
    } else {
      const conditions = conditionsOrSql;
      const columnConditions: Record<string, unknown> = {};
      for (const [prop, value] of Object.entries(conditions)) {
        const meta = this.model.columnMetaFor(prop);
        const column = this.columnFor(prop);
        const converted = Array.isArray(value)
          ? value.map((v) => this.adapter.toDatabase(v, meta.type))
          : this.adapter.toDatabase(value, meta.type);
        assertBindable(converted, `${this.model.name}.${prop}`);
        columnConditions[column] = converted;
      }
      newWhere.push({ kind: "conditions", conditions: columnConditions });
    }

    // Implementation of the where method.
    return new Relation<T>(this.model, { ...this.state, where: newWhere });
  }

  order(
    ...args: [OrderConditions<T>] | [FieldKeys<T>, "asc" | "desc"] | [string]
  ): Relation<T> {
    const [first, second] = args;

    const newOrder: OrderClause[] = [...this.state.order];

    if (typeof first === "string" && second === undefined) {
      const sql = first;
      newOrder.push({ kind: "raw", sql });
    } else if (
      typeof first === "string" &&
      (second === "asc" || second === "desc")
    ) {
      const column = this.columnFor(first);
      const direction = second;
      newOrder.push({ kind: "field", column, direction });
    } else if (typeof first === "object" && first !== null) {
      const conditions = first as OrderConditions<T>;
      for (const [column, direction] of Object.entries(conditions)) {
        newOrder.push({
          kind: "field",
          column: this.columnFor(column),
          direction: direction as "asc" | "desc",
        });
      }
    }

    return new Relation<T>(this.model, { ...this.state, order: newOrder });
  }

  limit(limit: number): Relation<T> {
    if (limit < 0 || !Number.isInteger(limit)) {
      throw new InvalidIntegerValue(limit);
    }

    return new Relation<T>(this.model, { ...this.state, limit });
  }

  offset(offset: number): Relation<T> {
    if (offset < 0 || !Number.isInteger(offset)) {
      throw new InvalidIntegerValue(offset);
    }

    return new Relation<T>(this.model, { ...this.state, offset });
  }

  async all(): Promise<T[]> {
    const rows = await this.adapter.all(this.toSql());
    return rows.map((row) => this.model.fromRow(row));
  }

  // Overload order here matters as you cannot exclude a constant from number in the type system
  // so for the return type to be correct, the 1 overload must come first.
  async first(): Promise<T | undefined>;
  async first(n: 1): Promise<T | undefined>;
  async first(n: number): Promise<T[]>;
  async first(n: number = 1): Promise<T | T[] | undefined> {
    if (n < 1 || !Number.isInteger(n)) {
      throw new InvalidIntegerValue(n);
    } else if (n === 1) {
      const relation = new Relation<T>(this.model, {
        ...this.state,
        limit: 1,
        order: this.effectiveOrder("asc"),
      });
      const row = await this.adapter.get(relation.toSql());
      return row ? this.model.fromRow(row) : undefined;
    } else {
      const relation = new Relation<T>(this.model, {
        ...this.state,
        limit: n,
        order: this.effectiveOrder("asc"),
      });
      const rows = await this.adapter.all(relation.toSql());
      return rows.map((row) => this.model.fromRow(row));
    }
  }

  // Overload order here matters as you cannot exclude a constant from number in the type system
  // so for the return type to be correct, the 1 overload must come first.
  async last(): Promise<T | undefined>;
  async last(n: 1): Promise<T | undefined>;
  async last(n: number): Promise<T[]>;
  async last(n: number = 1): Promise<T | T[] | undefined> {
    if (n < 1 || !Number.isInteger(n)) {
      throw new InvalidIntegerValue(n);
    } else if (n === 1) {
      const relation = new Relation<T>(this.model, {
        ...this.state,
        limit: 1,
        order: this.effectiveOrder("desc"),
      });
      const row = await this.adapter.get(relation.toSql());
      return row ? this.model.fromRow(row) : undefined;
    } else {
      const relation = new Relation<T>(this.model, {
        ...this.state,
        limit: n,
        order: this.effectiveOrder("desc"),
      });
      const rows = await this.adapter.all(relation.toSql());
      return rows.map((row) => this.model.fromRow(row));
    }
  }

  async count(): Promise<number> {
    const { limit, offset, select, ...state } = this.state;
    const newRelation = new Relation<T>(this.model, {
      ...state,
      select: ["COUNT(*) AS count"],
    });

    const row = await this.adapter.get(newRelation.toSql());
    return row ? (row["count"] as number) : 0;
  }

  async findBy(
    ...args: Parameters<Relation<T>["where"]>
  ): Promise<T | undefined> {
    return this.where(...args).first();
  }

  async find(...keys: Bindable[]): Promise<T> {
    const pk = this.model.primaryKey;
    if (pk.length === 0)
      throw new Error(`${this.model.name} has no primary key`);
    if (keys.length !== pk.length) {
      throw new Error(
        `${this.model.name}.find expects ${pk.length} key(s) [${pk.join(", ")}], got ${keys.length}`,
      );
    }
    const conditions = Object.fromEntries(
      pk.map((p, i) => [p, keys[i]]),
    ) as WhereConditions<T>;
    const record = await this.where(conditions).first();
    if (!record) throw new RecordNotFound(this.model.name, keys);
    return record;
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    yield* await this.all();
  }

  toSql(): Query {
    let sql = "";
    const bindings: Array<unknown> = [];

    const bind = (value: unknown) => {
      bindings.push(value);
      return this.adapter.placeholder(bindings.length);
    };

    const select_statement = `SELECT ${this.state.select.length > 0 ? this.state.select.join(", ") : "*"} FROM ${this.table}`;
    const where_statement = this.state.where
      .map((clause) => {
        switch (clause.kind) {
          case "raw":
            bindings.push(...clause.bindings);
            return clause.sql;
          case "conditions":
            const conditions = Object.entries(clause.conditions).map(
              ([column, value]) => {
                if (value === null) {
                  return `${column} IS NULL`;
                } else if (Array.isArray(value)) {
                  if (value.length === 0) return "1 = 0"; // empty array means no matches

                  return `${column} IN (${value.map(bind).join(", ")})`;
                } else {
                  return `${column} = ${bind(value)}`;
                }
              },
            );

            return conditions.join(" AND ");
          default:
            throw new Error(
              `Unknown where clause kind: ${(clause as any).kind}`,
            );
        }
      })
      .map((s) => `(${s})`)
      .join(" AND ");
    const order_statement = this.state.order
      .map((clause) => {
        switch (clause.kind) {
          case "raw":
            return clause.sql;
          case "field":
            return `${clause.column} ${clause.direction.toUpperCase()}`;
          default:
            throw new Error(
              `Unknown order clause kind: ${(clause as any).kind}`,
            );
        }
      })
      .join(", ");
    const paging = this.adapter.limitOffset(
      this.state.limit,
      this.state.offset,
    );

    sql = [
      select_statement,
      where_statement && `WHERE ${where_statement}`,
      order_statement && `ORDER BY ${order_statement}`,
      paging,
    ]
      .filter((s) => !!s)
      .join(" ");

    return new Query(sql, bindings);
  }

  private columnFor(property: string): string {
    const { columnName } = this.model.columnMetaFor(property);
    const q = this.model.connection;
    return `${q.quoteIdentifier(this.model.tableName)}.${q.quoteIdentifier(columnName)}`;
  }

  private get table(): string {
    const q = this.model.connection;
    return q.quoteIdentifier(this.model.tableName);
  }

  private get adapter(): Adapter {
    return this.model.connection;
  }

  private effectiveOrder(
    direction: "asc" | "desc",
  ): ReadonlyArray<OrderClause> {
    if (this.state.order.length === 0) {
      return this.model.primaryKey.map((pk) => ({
        kind: "field",
        column: this.columnFor(pk),
        direction,
      }));
    }
    if (direction === "asc") return this.state.order;
    return this.state.order.map((clause) => {
      switch (clause.kind) {
        case "raw":
          throw new IrreversibleOrder(clause.sql);
        case "field":
          return {
            ...clause,
            direction: clause.direction === "asc" ? "desc" : "asc",
          };
      }
    });
  }
}
