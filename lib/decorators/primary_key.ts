import {
  decoratorWithConfig,
  fieldOrClassDecorator,
} from "../helpers/decorator_helper";
import { metadataChannel } from "../helpers/metadata_channel";

export const primaryKeyChannel = metadataChannel<Array<string>>(
  "ormits:primary_key",
  {
    empty: () => [],
    inherit: (parent) => [],
  },
);

export interface PrimaryKeyConfig {
  name?: string;
}

function registerPrimaryKey(
  metadata: DecoratorMetadataObject,
  names: readonly string[],
  _config: PrimaryKeyConfig | undefined,
) {
  const pk = primaryKeyChannel.own(metadata);
  if (pk.length > 0) {
    throw new Error(
      `primary key already declared as [${pk.join(", ")}]; cannot redeclare as [${names.join(", ")}]`,
    );
  }
  pk.push(...names);
}

export const primaryKey =
  fieldOrClassDecorator<PrimaryKeyConfig>(registerPrimaryKey);
