
import db from './db';
import { sql } from './sql';

interface QueryType<T> {
  select: Set<KeysOf<T>>;
  where: string[];
  order: string[];
}

class Relation<T> extends Array<T> {
  private data: T[] = [];
  private query: QueryType<T> = {
    select: new Set(),
    where: [],
    order: []
  };

  select(fields: KeysOf<T>[]) : Relation<T> {
    fields.forEach((f) => this.query.select.add(f));
    return this;
  }

  where(condition: string | Record<KeysOf<T>, any>, not: boolean = false) : Relation<T> {
    let stringedCondition : string = '';
    if (typeof condition !== "string") {
      let equiv : '=' | '!=' = '=';
      if (not) {
        equiv = '!=';
      }

      stringedCondition = Object.keys(condition).map((key: KeysOf<T>) => `${key} ${equiv} "${condition[key]}"`).join(" AND ");
    } else {
      stringedCondition = condition;
    }
    this.query.where.push(stringedCondition);
    return this;
  }

  order(order: string | Record<KeysOf<T>, "ASC" | "DESC">) : Relation<T> {
    let stringedOrder : string = '';
    if (typeof order !== "string") {
      stringedOrder = Object.keys(order).map((key: KeysOf<T>) => `${key} ${order[key]}`).join(" ");
    } else {
      stringedOrder = order
    }

    this.query.order.push(stringedOrder);
    return this;
  }

  async all() : Promise<T[]> {
    let { select, where, order } = this.query;

    let selects: string = select.size > 0 ?
        Array.from(this.query.select).join(', ') : "*";

    let wheres: string = where.length > 0 ? "WHERE " + where.map((str) => `(${str})`).join(" AND ") : '';

    let orders: string = order.length > 0 ? "ORDER BY " + order.map((str) => `${str}`).join(", ") : '';

    let sqlString : string = sql`
      SELECT ${selects} FROM test ${wheres} ${orders};
    `

    console.log(sqlString);

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

export default Relation;
export { db as Database };