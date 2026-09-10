import { table } from "lib/decorators/table";
import { Bool, boolean, Int, int, Text, text } from "lib/decorators/field";
import { BaseModel } from "lib/model";
import { primaryKey } from "lib/decorators/primary_key";

@table({ tableName: "test" })
@primaryKey(["id"])
class TestModel extends BaseModel {
  @int id!: Int;
  @text name!: Text;
  @boolean deleted!: Bool;
}

export default TestModel;
