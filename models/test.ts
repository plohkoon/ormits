import BaseRelation from "../lib/base_relation";
import BaseModel from "../lib/base_model";
import Test from "../types/test";

class TestRelation extends BaseRelation<Test, TestRelation> {

}

class TestModel extends BaseModel<Test>() {
  static relation() {
    return new TestRelation('test');
  }
}

export default TestModel;
