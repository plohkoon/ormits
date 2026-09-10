import TestModel from "./models/test";

console.log(TestModel);
console.log(TestModel.tableName);
console.log(TestModel.fields);

let test = TestModel.where({ id: 1 });
console.log(test.toSql());
test = test.where("name = ?", "bob");
console.log(test.toSql());
test = test.limit(10);
console.log(test.toSql());
test = test.offset(5);
console.log(test.toSql());
test = test.order({ id: "asc" });
console.log(test.toSql());

// let relation = TestModel.select(["id", "name"]);
// relation = relation.select("hi, no");
// relation = relation.where({ id: 1, name: ["test"] });
// relation = relation.where('name = "bob"');
// relation = relation.where({id: 2}, true);
// let otherRelation = relation.order({id: "DESC"})
// relation.all().then(res => console.log(res));
// console.log(relation)

// console.log(relation.relationQuery, otherRelation.relationQuery);
