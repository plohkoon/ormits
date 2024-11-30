import { BaseModel, model } from "lib/model";
import { property } from "lib/property";

@model("tests")
class TestModel extends BaseModel {
  @property()
  id: number;
}

export default TestModel;
