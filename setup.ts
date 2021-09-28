import { RunResult } from "sqlite3";
import Database from "./lib/db";
import { sql } from "./lib/sql";

Database.run(sql`
  CREATE TABLE IF NOT EXISTS test(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255)
  );
`).then((res: RunResult) => {
  console.log("yay");
  process.exit(0);
});
