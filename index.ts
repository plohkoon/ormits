
import ActiveRecord from './lib/active_record';
import TestModel from './models/test';
import Test from './types/test';

console.log(TestModel.tableName);


let relation = TestModel.select(["id", "name"]);
console.log(relation)
// relation = relation.where({ id: 1 });
// relation = relation.where('name = "bob"');
// relation = relation.where({id: 2}, true);
// let otherRelation = relation.order({id: "DESC"})
// relation.all().then(res => console.log(res));

// console.log(relation.relationQuery, otherRelation.relationQuery);
