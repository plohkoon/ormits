import Test from "types/test";
// import Base, { table } from "lib.old/active_record/model";
import { BaseModel, model } from "lib/model";

// @table("tests")
// class TestModel extends Base<Test>() {

// }

@model
class TestModel {}
interface TestModel extends ReturnType<TestModel> {}

export default TestModel;
