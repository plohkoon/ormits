import { DataType } from "./base_types";

class Test implements DataType {
  id: number;
  name: string;

  get data_name() : string {
    return "test";
  }
}

export default Test;
