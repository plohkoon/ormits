import BaseRelation from "../lib/base_relation";
import BaseModel from "../lib/base_model";
import Test from "../types/test";
import ActiveRecord from "../lib/active_record";

// class TestRelation extends BaseRelation<Test, TestRelation> {

// }

// class TestModel extends BaseModel<Test>() {
//   static relation() {
//     return new TestRelation('test');
//   }
// }

@ActiveRecord.table("tests")
class TestModel extends ActiveRecord.Base<Test>() {

}

export default TestModel;
