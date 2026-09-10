import { decoratorWithConfig } from "../helpers/decorator_helper";
import { metadataChannel } from "../helpers/metadata_channel";
import { tableize } from "../helpers/string_helpers";
import { BaseModel } from "../model";
import "../polyfills/metadata";

interface TableMeta {
  tableName?: string;
}

export const tableChannel = metadataChannel<TableMeta>("ormits:table", {
  empty: () => ({}),
  inherit: (parent) => ({ ...parent }),
});

export interface TableConfig {
  tableName?: string;
}

export const table = decoratorWithConfig((config?: TableConfig) => {
  return function <T extends typeof BaseModel>(
    constructor: T,
    context: ClassDecoratorContext,
  ) {
    const tableMeta = tableChannel.own(context.metadata);
    if (config?.tableName) {
      tableMeta.tableName = config.tableName;
    } else {
      tableMeta.tableName = tableize(constructor.name);
    }

    return constructor;
  };
});
