
import db from './db';
import { sql } from './sql';

interface QueryType<T> {
  select: Set<KeysMatching<T, string>>;
}

class Relation<T> extends Array<T> {
  data: T[];
  query: QueryType<T>;

  constructor() {
    super();
    this.data = [];
    this.query = {
      select: new Set()
    };
  }

  select(fields: KeysMatching<T, string>[]) : Relation<T> {
    fields.forEach((f) => this.query.select.add(f));
    return this;
  }

  get all() : T[] {
    let selects: string = this.query.select.size > 0 ?
        Array.from(this.query.select).join(', ') : "*";
    console.log(selects);
    return this.data;
    // sql`
    //  SELECT ${selects} FROM ${T.name}
    // `;
  }

  get items() : T[] {
    return this.all;
  }
}

export default Relation;
export { db as Database };