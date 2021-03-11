
// Forms a new type that takes optional keys matching original type T
// and values matching type K
type RecordWithKeys<T, K> = Partial<Record<keyof T, K>>
