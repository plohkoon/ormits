
import Relation from './lib/relation';

// Database.run(sql`
//   CREATE TABLE IF NOT EXISTS test(
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name VARCHAR(255)
//   );
// `).then((res: RunResult) => console.log("yay"));

// Database.all(sql`
//   SELECT * FROM test;
// `).then((res: any) => console.log(res));

let relation = new Relation<Test>()

relation = relation.select(["id", "name"]);
relation = relation.where({ id: 1 });
relation = relation.where('name = "bob"');
relation = relation.where({id: 2}, true);
await relation.all().then(res => console.log(res));
