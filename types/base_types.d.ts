
export interface DataType {
  data_name: string;
}

interface QueryType<T> {
  select: Set<keyof T | string>;
  where: string[];
  order: string[];
}

type OptionalOrArray<T> = {
  [K in keyof T]?: T[K] | Array<T[K]>;
}

type levels = "log" | "warn" | "error" | "critical"
