export class IrreversibleOrder extends Error {
  constructor(sql: string) {
    super(
      `The order of the relation cannot be reversed because it is not reversible: ${sql}`,
    );
  }
}

export class RecordNotFound extends Error {
  params: unknown[];
  constructor(
    private readonly modelName: string,
    ...params: unknown[]
  ) {
    super(
      `No record found for model "${modelName}" with parameters: ${JSON.stringify(params)}`,
    );
    this.params = params;
  }
}

export class InvalidIntegerValue extends Error {
  constructor(value: unknown) {
    super(`Invalid integer value: ${value}`);
  }
}
