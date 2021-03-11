
import db from './db';
import { sql } from './sql';

interface QueryType<T> {
  select: Set<keyof T>;
  where: string[];
  order: string[];
}

class BaseRelation<T extends DataType> extends Array<T> {
  private data: T[] = [];
  private query: QueryType<T> = {
    select: new Set(),
    where: [],
    order: []
  };
  private tableName: string;

  constructor(tableName: string) {
    super();
    this.tableName = tableName;
  }

  select(fields: (keyof T)[]) : BaseRelation<T> {
    fields.forEach((f) => this.query.select.add(f));
    return this;
  }

  where(condition: string | RecordWithKeys<T, any>, not: boolean = false) : BaseRelation<T> {
    let stringedCondition : string = '';
    if (typeof condition !== "string") {
      let equiv : '=' | '!=' = '=';
      if (not) {
        equiv = '!=';
      }

      let keys : (keyof T)[] = Object.keys(condition) as (keyof T)[];

      stringedCondition = keys.map((key: keyof T) => `${key} ${equiv} "${condition[key]}"`).join(" AND ");
    } else {
      stringedCondition = condition;
    }
    this.query.where.push(stringedCondition);
    return this;
  }

  order(order: string | RecordWithKeys<T, "ASC" | "DESC">) : BaseRelation<T> {
    let stringedOrder : string = '';
    if (typeof order !== "string") {
      let keys : (keyof T)[] = Object.keys(order) as (keyof T)[];
      stringedOrder = keys.map((key: keyof T) => `${key} ${order[key]}`).join(" ");
    } else {
      stringedOrder = order
    }

    this.query.order.push(stringedOrder);
    return this;
  }

  async all() : Promise<T[]> {
    if (this.tableName === '') throw Error("Must provide a table name");
    let { select, where, order } = this.query;

    let selects: string = select.size > 0 ?
        Array.from(this.query.select).join(', ') : "*";

    let wheres: string = where.length > 0 ? "WHERE " + where.map((str) => `(${str})`).join(" AND ") : '';

    let orders: string = order.length > 0 ? "ORDER BY " + order.map((str) => `${str}`).join(", ") : '';

    let sqlString : string = sql`
      SELECT ${selects} FROM ${this.tableName} ${wheres} ${orders};
    `

    return db.all(sqlString);
  }

  // get all() : T[] {
    
  //   return (async () => await this.execute());
  //   // sql`
  //   //  SELECT ${selects} FROM ${T.name}
  //   // `;
  // }

  // get items() : T[] {
  //   return this.all;
  // }
}

export default BaseRelation;
export { db as Database };