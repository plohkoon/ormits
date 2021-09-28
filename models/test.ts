import Test from "../types/test";
import ActiveRecord from "../lib/active_record";
import Base, { table } from "../lib/active_record/model";

@table("tests")
class TestModel extends Base<Test>() {

}

export default TestModel;
