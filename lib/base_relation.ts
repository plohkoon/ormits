
import { DataType } from '../types/base_types';
import { RecordWithKeys } from '../types/utils';
import db from './db';
import { sql } from './sql';

interface QueryType<T> {
  select: Set<keyof T>;
  where: string[];
  order: string[];
}

class BaseRelation<T extends DataType, K extends BaseRelation<any, any>> extends Array<T> {
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

  duplicate = () : K => Object.create(this);

  select(fields: (keyof T)[]) : K {
    let dup = this.duplicate();
    fields.forEach((f) => dup.query.select.add(f));
    return dup;
  }

  where(condition: string | RecordWithKeys<T, any>, not: boolean = false) : K {
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

    let dup = this.duplicate();
    dup.query.where.push(stringedCondition);
    return dup;
  }

  order(order: string | RecordWithKeys<T, "ASC" | "DESC">) : K {
    let stringedOrder : string = '';
    if (typeof order !== "string") {
      let keys : (keyof T)[] = Object.keys(order) as (keyof T)[];
      stringedOrder = keys.map((key: keyof T) => `${key} ${order[key]}`).join(" ");
    } else {
      stringedOrder = order
    }

    let dup = this.duplicate();
    this.query.order.push(stringedOrder);
    return dup;
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

  get relationQuery() {
    return this.query;
  }
}

export default BaseRelation;
export { db as Database };
