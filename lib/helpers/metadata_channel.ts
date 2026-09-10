export function metadataChannel<V>(
  name: string,
  opts: {
    empty: () => V;
    inherit: (parent: V) => V;
  },
) {
  const KEY = Symbol(name);

  return {
    own(metadata: DecoratorMetadataObject): V {
      if (!Object.hasOwn(metadata, KEY)) {
        const parent = metadata[KEY] as V | undefined;
        metadata[KEY] =
          parent === undefined ? opts.empty() : opts.inherit(parent);
      }
      return metadata[KEY] as V;
    },
    read(metadata: DecoratorMetadataObject | null | undefined): Readonly<V> {
      return (metadata?.[KEY] as V | undefined) ?? opts.empty();
    },
    readClass(klass: abstract new (...args: any[]) => unknown): Readonly<V> {
      return this.read(klass[Symbol.metadata]);
    },
    readOwnClass(
      klass: abstract new (...args: any[]) => unknown,
    ): Readonly<V> | undefined {
      if (!Object.hasOwn(klass, Symbol.metadata)) return undefined; // undecorated subclass shares parent's object
      const metadata = klass[Symbol.metadata];
      return metadata && Object.hasOwn(metadata, KEY)
        ? (metadata[KEY] as V)
        : undefined;
    },
  };
}
