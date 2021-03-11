
import db from './db';
import { sql } from './sql';

interface QueryType<T> {
  select: Set<KeysOf<T>>;
  where: string[];
}

class Relation<T> extends Array<T> {
  private data: T[] = [];
  private query: QueryType<T> = {
    select: new Set(),
    where: []
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

      stringedCondition = Object.keys(condition).map((key: KeysOf<T>) => `${key} ${equiv} "${condition[key]}"`).join(" AND ")
    } else {
      stringedCondition = condition;
    }
    this.query.where.push(stringedCondition);
    return this;
  }

  async all() : Promise<T[]> {
    let { select, where } = this.query;

    let selects: string = select.size > 0 ?
        Array.from(this.query.select).join(', ') : "*";

    let wheres: string = where.length > 0 ? "where " + where.map((str) => `(${str})`).join(" AND ") : '';

    return db.all(sql`
      SELECT ${selects} FROM test ${wheres};
    `);
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