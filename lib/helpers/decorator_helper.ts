/**
 * The point of this module is to make the decorators
 * both decorator factories and decorators themselves.
 * The direct version of the invocation is for syntactic sugar/simplicity.
 * The factory version is for passing configuration to the decorator.
 */
// context must stay `any`: a concrete decorator narrows it (e.g. to
// ClassDecoratorContext), which contravariance rejects against the
// full DecoratorContext union.
type AnyDecorator = (value: any, context: any) => any;
type ConfigurableDecorator<Config, D extends AnyDecorator> = D &
  ((config?: Config) => D);

// There is a footgun in this function. If for some reason
// our decorator accepts > 1 argument and the second argument
// has a "kind" parameter we might accidentally lose here.
function isDecoratorInvocation(args: unknown[]): boolean {
  const context = args[1];
  return (
    args.length === 2 &&
    typeof context === "object" &&
    context !== null &&
    typeof (context as DecoratorContext).kind === "string"
  );
}

function decoratorWithConfig<Config extends object, D extends AnyDecorator>(
  factory: (config?: Config) => D,
): ConfigurableDecorator<Config, D> {
  function wrapped(...args: unknown[]) {
    if (isDecoratorInvocation(args)) {
      return factory()(args[0], args[1] as DecoratorContext);
    }
    return factory(args[0] as Config | undefined);
  }
  return wrapped as ConfigurableDecorator<Config, D>;
}

/**
 * A decorator that works at both field level and class level:
 *   @primaryKey id                      bare field form
 *   @primaryKey({ ...config }) id       configured field form
 *   @primaryKey(["a", "b"], config?)    class form (compound)
 * The field form is exactly the class form with a one-element names
 * list. Class-form names are compile-checked against the instance type.
 */
type ClassWithFields<Names extends readonly string[]> = abstract new (
  ...args: any[]
) => { [K in Names[number]]: unknown };

type FieldDecorator = (
  value: undefined,
  context: ClassFieldDecoratorContext,
) => void;

// Overload order matters for error messages: TS reports the *last*
// overload's mismatch, so the config form goes last — a config typo then
// reads "'bogus' does not exist in type 'SomeConfig'".
type HybridDecorator<Config> = {
  (value: undefined, context: ClassFieldDecoratorContext): void;
  <const Names extends readonly string[]>(
    names: Names,
    config?: Config,
  ): <T extends ClassWithFields<Names>>(
    value: T,
    context: ClassDecoratorContext<T>,
  ) => void;
  (config?: Config): FieldDecorator;
};

// Each channel module supplies this; all semantics live here.
type Register<Config> = (
  metadata: DecoratorMetadataObject,
  names: readonly string[],
  config: Config | undefined,
) => void;

function fieldOrClassDecorator<Config extends object>(
  register: Register<Config>,
): HybridDecorator<Config> {
  const fieldDecorator =
    (config: Config | undefined): FieldDecorator =>
    (_value, context) => {
      if (context.kind !== "field") {
        throw new Error(
          `bare form only applies to fields, got a ${context.kind}`,
        );
      }
      if (context.static) {
        throw new Error(
          `static field "${String(context.name)}" is not a column`,
        );
      }
      if (context.private) {
        throw new Error(
          `private field ${String(context.name)} is not a column`,
        );
      }
      register(context.metadata, [String(context.name)], config);
    };

  function wrapped(...args: unknown[]) {
    if (isDecoratorInvocation(args)) {
      return fieldDecorator(undefined)(
        args[0] as undefined,
        args[1] as ClassFieldDecoratorContext,
      );
    }
    if (Array.isArray(args[0])) {
      const names = args[0] as readonly string[];
      const config = args[1] as Config | undefined;
      return (_value: unknown, context: ClassDecoratorContext) => {
        register(context.metadata, names, config);
      };
    }
    return fieldDecorator(args[0] as Config | undefined);
  }
  return wrapped as HybridDecorator<Config>;
}

export { decoratorWithConfig, fieldOrClassDecorator, isDecoratorInvocation };
export type {
  AnyDecorator,
  ConfigurableDecorator,
  HybridDecorator,
  ClassWithFields,
  Register,
};
