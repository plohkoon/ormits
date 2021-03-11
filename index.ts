
import TestModel from './models/test';

// Database.run(sql`
//   CREATE TABLE IF NOT EXISTS test(
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name VARCHAR(255)
//   );
// `).then((res: RunResult) => console.log("yay"));

// Database.all(sql`
//   SELECT * FROM test;
// `).then((res: any) => console.log(res));

// let relation = new BaseRelation<Test>();

let relation = TestModel.select(["id", "name"]);
// relation = relation.where({ id: 1 });
// relation = relation.where('name = "bob"');
// relation = relation.where({id: 2}, true);
relation = relation.order({id: "DESC"})
relation.all().then(res => console.log(res));
