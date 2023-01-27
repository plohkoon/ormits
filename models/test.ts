import Test from "types/test";
// import Base, { table } from "lib.old/active_record/model";
import { BaseModel, model } from "lib/model";

// @table("tests")
// class TestModel extends Base<Test>() {

// }

@model("tests")
class TestModel extends BaseModel {
  id: number;
  name: string;

  constructor(id: number, name: string) {
    super();
    this.id = id;
    this.name = name;
  }
}

export default TestModel;
