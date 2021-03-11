
import Relation, { Database } from './lib/relation';
import { sql } from './lib/sql';
import { RunResult } from 'sqlite3';

// Database.run(".tables").then((res: RunResult) => console.log("yay"));

// Database.run(sql`
//   CREATE TABLE IF NOT EXISTS test(
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name VARCHAR(255)
//   );
// `).then((res: RunResult) => console.log("yay"));

// Database.all(sql`
//   SELECT * FROM test;
// `).then((res: any) => console.log(res));

new Relation<Test>().select(["id", "name"]).all;

Database.close().then(() => process.exit(0));
