import { DataType } from "../types/base_types";
import { RecordWithKeys } from "../types/utils";
import BaseRelation from "./base_relation";

function BaseModel<T extends DataType>() {
  class BaseModel {
    static tableName = '';
    static relation(){
      return new BaseRelation<T, BaseRelation<any, any>>('');
    }
    static select(fields: (keyof T)[]) {
      return this.relation().select(fields);
    }
    static where(condition: string | RecordWithKeys<T, any>, not: boolean = false) {
      return this.relation().where(condition, not);
    }
    static order(order: string | RecordWithKeys<T, "ASC" | "DESC">){
      return this.relation().order(order);
    }
    static async all() {
      return this.relation().all();
    }
  }

  return BaseModel;
}

export default BaseModel;
