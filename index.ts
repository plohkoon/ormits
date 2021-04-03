
import TestModel from './models/test';

let relation = TestModel.select(["id", "name"]);
// relation = relation.where({ id: 1 });
// relation = relation.where('name = "bob"');
// relation = relation.where({id: 2}, true);
let otherRelation = relation.order({id: "DESC"})
// relation.all().then(res => console.log(res));

console.log(relation.relationQuery, otherRelation.relationQuery);
