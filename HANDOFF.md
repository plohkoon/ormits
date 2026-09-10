# ormits — Session Handoff

Last updated: 2026-09-09

## Ground rule (read this first)

**Greg implements. The AI is an advisor / interactive rubber duck.** The AI's
job: bounce ideas, review designs, diagnose type errors, verify with
throwaway scratch files, and do explicitly-delegated chores (dependency
upgrades, config plumbing). It does **not** write or edit files in `lib/`,
`models/`, or entry points unless Greg explicitly directs it to for a
specific file. When in doubt: describe the approach, show sketch code in
chat, let Greg type it.

## Vision

An ActiveRecord-like ORM in TypeScript:

- Models defined with decorators: `@table`, typed field sugar (`@int`,
  `@text`, `@boolean`), `@primaryKey`, `@index`.
- Every decorator usable bare **or** with config: `@table` and
  `@table(config)` both work.
- Models are `class Book extends BaseModel` — **no** `Base<Book>()` generic
  call (Greg explicitly rejects that API). Typed statics come from
  `this`-parameter inference: `static where<T extends BaseModel>(this: new () => T, ...)`.
- SQL-ish chainable query interface (old prototype in `lib/active_record/relation.ts`).
- Convention over configuration: zero-decorator defaults should work;
  decorators override.

## Toolchain (settled)

- **TC39 standard decorators**, not legacy `experimentalDecorators`.
  Consequence: no `reflect-metadata` type inference — that's *why* the typed
  sugar decorators (`@int` etc.) exist and why raw `@field` requires a
  config with `columnType`.
- TypeScript **7** (native compiler). TS7 removed `baseUrl` → we use
  `"paths": {"*": ["./*"]}`; `@types/node` needs explicit `"types": ["node"]`.
- Runtime: **tsx** (`yarn start <file>`; ts-node is dead). `yarn typecheck`
  runs `tsc --noEmit`. VS Code's bundled TS ≠ tsc 7; if editor and CLI
  disagree, trust `yarn typecheck` (TypeScript Native Preview extension is
  the eventual fix; not installed).
- sqlite3 v6 (ships its own types).
- `exactOptionalPropertyTypes: true` (added 2026-09-08): `{ name?: string }`
  no longer accepts `{ name: undefined }`, so `where({ name: maybeUndefined })`
  is a compile error at the call site. Only casualty was the `as ConfigFor<T>`
  cast in `typedField` → now `as FieldConfig`.

## Architecture decisions (settled, with rationale)

### Metadata channels
All decorator metadata flows through `context.metadata` (attached to the
class as `Class[Symbol.metadata]` automatically — works even without
`@table`). `lib/helpers/metadata_channel.ts` is the factory: private symbol
key + `own()` writer (hasOwn copy-forward dance) + `read()`/`readClass()`.
The **`inherit` policy is per-channel and deliberate**:

- fields: `(parent) => ({ ...parent })` — subclasses inherit columns.
- primary key: `() => []` — a subclass's own declaration *replaces* the
  parent's (prototype-chain shadowing does inheritance for free when the
  subclass declares nothing).
- future index channel: copy-forward, but must **deep-copy** members
  (first channel where shallow spread aliases mutable state).

`lib/polyfills/metadata.ts` holds the `Symbol.metadata` polyfill —
`??=` + `Symbol.for` (matches esbuild's fallback so ordering can't split
the symbol). Imported first in `model.ts`, `field.ts`, `table.ts`.

### Decorator call-shape helpers
- `decoratorWithConfig` (`lib/helpers/decorator_helper.ts`): "bare or
  configured, one decorator kind" — used by `@table` and the field sugar.
  Dispatch: a real decorator invocation always has `args[1].kind`.
  **`AnyDecorator`'s context must stay `any`** — typing it `DecoratorContext`
  breaks contravariantly when factories narrow to `ClassDecoratorContext`
  (this bug was reintroduced once already from an old editor buffer).
- **Agreed but not yet built**: a second helper, `fieldOrClassDecorator`,
  with a shared `HybridDecorator<Config>` type (three overloads) for the
  field/class hybrid decorators below. Helper owns dispatch + type surface
  (+ the static/private field guard); each channel module owns only its
  `register(metadata, names, config)` function where all semantics live.

### Fields
`lib/field.ts`: `FieldConfig` is a **discriminated union on `columnType`**
(per-type options, per-type `default` typing). `ValueFor<T>` maps column
type → TS type so `@int name: string` is a compile error. Raw
`field(config)` is always-called (config's `columnType` required —
enforced structurally because a required-arg factory can't wrap in
`decoratorWithConfig`). Sugar via `typedField(columnType)`. Fields use `!`
(`id!: number`) — hydration assigns, not the constructor; `declare` can't
be decorated.

### Primary key & index — hybrid API (settled design, NOT yet implemented)
Both work at **field level** (sugar) and **class level** (compound), with
the invariant: *the field form is exactly the class form with a
one-element names list; same options type at both levels.*

- Field level: `@primaryKey @int id!: number`, `@index({ unique: true }) @text email!: string`.
  Bare **and** configured both allowed.
- Class level: `@primaryKey(["orgId", "userId"])`,
  `@index(["orgId", "email"], { unique: true, name?: ... })` — order is
  argument order (indexes are order-significant; definition-order and
  position-config designs were considered and rejected).
- Class-level names are **compile-checked** via a constraint on the
  returned decorator (`const Names` tuple + `ClassWithFields<Names>`
  mapped type) — the "strings can't be checked" objection was wrong.
- **PK channel is write-once per class**: second declaration (any level)
  throws. Kills implicit compound-by-definition-order.
- **Index name collision throws** (two field-level `@index({name: "x"})`
  do NOT group — grouping is exclusively the class form).
- Semantic validation (PK columns exist / not nullable, index columns
  exist) happens at **read time** (schema generation), not registration —
  field-level registration order makes registration-time checks unsound.
- Dispatch disambiguation: `kind` sniff → decorator invocation;
  `Array.isArray(args[0])` → class form; else field config call.

### Errors — how to read the garble
With `D & ((config?) => D)` intersection types, a failed decorator
application falls through to the config-call signature. Any TS1270 whose
"return type" looks like a decorator signature, or "X has no properties in
common with SomeConfig", means **the decorator overload didn't match** —
usually a `Value` type mismatch or a missing `extends BaseModel`. Past
instances: `ValueFor` missing its `[T]` index; `TestModel` not extending
`BaseModel`.

## Current state of the tree

Layout reorganised 2026-09-08: `lib/active_record/` and `types/` deleted
(nothing reusable; old `Base<T>()` API). Decorators moved under
`lib/decorators/`. No barrel `lib/index.ts` yet — when one is added, the
`@index` decorator file must NOT be called `index.ts` (use `indexes.ts`).

| File | Status |
|---|---|
| `lib/helpers/decorator_helper.ts` | ✅ `decoratorWithConfig`, `fieldOrClassDecorator`, `HybridDecorator`, `ClassWithFields`, `isDecoratorInvocation` |
| `lib/helpers/metadata_channel.ts` | ✅ `own`/`read`/`readClass`/`readOwnClass` (own-read checks `Object.hasOwn(klass, Symbol.metadata)` first — undecorated subclass shares parent's metadata object) |
| `lib/helpers/string_helpers.ts` | ✅ `tableize` (snake_case + "s", acronym-aware). TODO real inflector |
| `lib/polyfills/metadata.ts` | ✅ |
| `lib/decorators/field.ts` | ✅ table-driven (`ColumnTypes`), branded `Column<T,K>` + `Int`/`Text`/`Bool`, `FieldKeys`/`Attributes`/`ColumnTypeOf`, nullable-widened decorators. Debug `console.log` still in `registerField`. No static/private guard |
| `lib/decorators/primary_key.ts` | ✅ hybrid write-once on `fieldOrClassDecorator` |
| `lib/decorators/table.ts` | ✅ `tableChannel`; `@table` is pure override sugar. Nits: `BaseModel` import should be `import type`; unused `TableMeta` |
| `lib/model.ts` | ✅ getters `tableName`/`fields`/`primaryKey` (no `T` needed → accessors, work on abstract classes); `columnMetaFor(prop)` throws on unknown property; `fromRow()`, `all()`, and forwarding statics `select/where/order/limit/offset` via `Parameters<Relation<T>[...]>`. **Known issue:** `ModelClass<T>`/`ConcreteModelClass<T>` are currently interchangeable and both reject abstract classes, because `typeof BaseModel` contributes a concrete construct signature. Verified fix: `type StaticSide = Omit<typeof BaseModel, "prototype">` (mapped type drops construct signatures) and intersect that instead |
| `lib/relation.ts` | ✅ **builder half complete, verified end-to-end against in-memory sqlite (13 cases)**: immutable `select`/`where`/`order`/`limit`/`offset`; `toSql()` → exported `Query` (`sql` + `bindings`; `toString()` interpolates for display only; inspect symbol). Property→column at chain time via `columnFor` → `model.columnMetaFor`; identifiers `"table"."column"`, `FROM "table"`. Where clauses parenthesised, `IN (?, ?)` expanded, empty array → `1 = 0`, `null` → `IS NULL`, `OFFSET` without `LIMIT` → `LIMIT -1`, `limit`/`offset` validated as non-negative integers. `assertBindable` at `where()` entry (both forms): only `string|number|boolean|null` (and arrays of those) may be bound; `undefined`, non-finite numbers, `Date`, etc. throw with `Model.prop` context. **Flattening of richer types (Date → string) is deferred to the adapter.** `quoteForDisplay` deliberately throws on unknown types — unreachable from a `Relation` |
| `lib/core/db.ts` | 🗑 superseded by `lib/adapters/sqlite.ts`; only `setup.ts` still imports it — delete both once schema generation replaces `setup.ts` |
| `lib/core/sql.ts` | whitespace-collapsing `sql` tag; keep for DDL |
| `models/test.ts` | ✅ bare `@table`, class-form `@primaryKey(["id"])`. Derives `test_models`; `setup.ts` still creates `test` |
| `index.ts` | smoke test; still imports deleted `./types/test` (only typecheck error) |

### `where` signature — decided 2026-09-08
Single signature, rest param as a union of labelled tuples:
`where(...args: [conditions: WhereConditions<T>] | [sql: string, ...bindings: unknown[]])`.
Rejected: two overloads (error anchors on the callee, "No overload matches");
four padded overloads (moves the error onto the bad key via an undocumented
checker threshold — >3 arity-compatible candidates — but `Parameters<>` only
sees the last overload, so the forwarding static breaks); generic first
argument with conditional rest (loses excess-property checking entirely).
Alternative still open if the tuple error text grates: split into
`where(conditions)` + `whereRaw(sql, ...bindings)`.

### Relation design (agreed)
Async iterable (`Symbol.asyncIterator`), not `extends Array`. Lazy: chain
methods only copy state; terminals (`all`, `first`, `last`, `count`, `find`,
`findBy`, iteration) execute. **Not thenable** (a `then` makes it
un-returnable from async functions). No result caching. `toSQL()` returns
`{ sql, bindings }`; maps property names → column names via the fields
channel; default order for `first`/`last`/`find` comes from `primaryKey()`.
`find` throws `RecordNotFound` (an `Error` subclass), `findBy` returns null.
Model statics never build SQL; `all()` is the only constructor call.

## Next steps (agreed order)

1. `fieldOrClassDecorator` helper + `HybridDecorator<Config>` type
   (includes the static/private guard). ✅ **Landed 2026-09-07** in
   `lib/helpers/decorator_helper.ts`; verified by scratch cases (tsc clean
   incl. `@ts-expect-error` cases, runtime correct under tsx). Notes:
   - `HybridDecorator` is an **overload list** (object type with three
     call signatures), not an `&` intersection. Order: bare field form,
     class form, config form **last** — TS reports the *last* overload's
     mismatch, so a config typo reads "'bogus' does not exist in type
     'PrimaryKeyConfig'" instead of "...in type 'readonly string[]'".
   - `ClassWithFields<Names> = abstract new (...args: any[]) => { [K in Names[number]]: unknown }`
     gives a genuinely readable error: "Property 'nope' is missing in type
     'BadName'".
   - Guard in the field path also throws on `context.kind !== "field"`
     (bare form on a class/method — types already reject it, runtime
     belt-and-braces).
   - `isDecoratorInvocation` is exported and shared by both helpers.
   - **Open question (verified, undecided 2026-09-07):** autocomplete for
     class-form names. The inferred form `@pk(["a","b"])` can only
     *validate* (at application site) — the argument is typed before TS
     knows the class. Adding an overload
     `<T extends BaseModel>(names: readonly FieldKeys<T>[], config?) => (value: Ctor<T>, ctx) => void`
     enables `@pk<Foo>(["a","b"])`: completions from `FieldKeys<Foo>`
     (methods excluded), typo error at the argument, and `Ctor<T>` catches
     naming the wrong class. TS allows the self-reference in a decorator
     expression (type position, no TDZ). Both overloads coexist: explicit
     type arg fails the `const Names` overload's constraint and moves on.
2. ✅ **Landed 2026-09-07.** `lib/primary_key.ts` rewritten on the helper:
   `registerPrimaryKey` with write-once throw; channel keeps `inherit: () => []`.
3. New `lib/index.ts` (decorator): index channel
   (`Record<name, {unique, members}>`, deep-copy inherit), name-collision
   throw, auto-name single-column indexes at DDL time (needs table name —
   resolve names at schema generation, not registration).
4. `BaseModel` statics with `this`-parameter typing. **Table-name half
   landed 2026-09-07**: `lib/helpers/string_helpers.ts` `tableize`
   (snake_case + "s", handles acronyms: `HTTPRequestLog` → `http_request_logs`;
   TODO real inflector), `tableChannel`, `readOwnClass`, `BaseModel.tableName`
   getter. **Decision: no STI by default** — an explicit `@table` names that
   class only; subclasses (decorated or not) derive their own name unless
   they declare `@table` themselves. STI will come later as an explicit
   opt-in `@sti` decorator (shape TBD); it must not be the implicit
   behaviour of `@table` inheritance. Verified: undecorated / field-only / re-decorated /
   explicit subclasses of `@table({tableName:"people"}) User` all behave.
   Remaining: `fields()`, `where()`, `fromRow()` with `this: abstract new () => T`
   / `new () => T`; `Attributes<T>` = `Partial<Pick<T, FieldKeys<T>>>`.
5. Schema generation / `validate` (read-time semantic checks live here).
6. `Relation`: (a) ✅ aliasing fixed; (b) ✅ builder half done 2026-09-08;
   (c) ✅ execution half done 2026-09-08: `all()`, `first(n?)`/`last(n?)`
   (overloads: no arg or `1` → `T | undefined`, `n` → `T[]`), `count()`
   (strips limit/offset), `findBy(...whereArgs)`, `find(...keys)`
   (**positional, in `@primaryKey` declaration order**; arity-checked;
   throws `RecordNotFound`), `Symbol.asyncIterator` (loads all up front).
   `effectiveOrder(dir)` = user's order (flipped for `last`; raw clauses
   throw `IrreversibleOrder`) or primary key when unordered — used only by
   first/last, never by `toSql`, so `all()` stays unordered. Errors live in
   `lib/errors.ts`-ish (`RecordNotFound`, `IrreversibleOrder`,
   `InvalidIntegerValue`). Verified against in-memory sqlite. Known nits:
   `Exclude<number, 1>` is just `number`, so `first(n)` with a non-literal
   `n` that is 1 at runtime returns `T` while the type says `T[]`;
   `last(n)` returns rows in reversed order (Rails re-reverses to original);
   `RecordNotFound` message double-brackets the keys.
6a. ✅ **Adapter landed 2026-09-08.** `lib/adapters/adapter.ts`: `Adapter`
   interface (= `Executor` {all,get,run taking `Query`} + connect/disconnect/
   exec/transaction(callback) + dialect {quoteIdentifier, placeholder(1-based),
   limitOffset} + values {toDatabase, fromDatabase, columnTypeSQL}) and
   `BaseAdapter` (abstract for communication; standard-SQL defaults for
   dialect; strict per-type value conversion that throws `TypeError` on
   mismatch — no silent coercion; `undefined` → NULL in `toDatabase` for the
   save path, while `where()` still rejects it first). `lib/adapters/sqlite.ts`:
   `SqliteAdapter(path)`, promisified sqlite3, `run` uses `function` for
   `this.lastID/changes`, `transaction` = BEGIN/COMMIT/ROLLBACK on the one
   handle (concurrent transactions would interleave — promise queue later),
   overrides `limitOffset` (`LIMIT -1`) and `columnTypeSQL` (boolean → INTEGER).
   `lib/query.ts` holds `Query`. `BaseModel.establishConnection(adapter)` /
   `connection` getter (static prop → per-subtree override via ctor chain;
   throws if unset — so `toSql()` needs a connection even to quote).
   `Relation` uses the adapter for quoting, placeholders (`bind()` helper is
   the *only* push), paging, and `toDatabase` before `assertBindable`;
   `fromRow` uses `fromDatabase`. Verified: full sqlite suite green through
   the adapter, boolean round-trip `true → 1 → true`. **No connection pool
   by design** (SQLite serialises writes; seam = callers never hold a
   connection + callback-scoped transactions). `lib/core/db.ts` is now dead.
7. `@sti` decorator (future, explicit opt-in): subclass shares the parent's
   table plus a discriminator column. Will need its own channel and to
   override the `tableName` own-read for opted-in subclasses.


**Order revised 2026-09-08 (Greg):**
8. `save()` / persistence on the instance side — first consumer of
   `adapter.run` and `lastInsertId`. (Was step 5/3 ordering; now first.)
9. Schema generation **and migration generation/management** — replaces
   `setup.ts` + `lib/core`; read-time semantic validation lives here.
10. `@index` decorator (`lib/decorators/indexes.ts`, not `index.ts`).
11. Then: scopes, and foreign keys / relations (associations).
   (`@sti` remains a later explicit opt-in.)

### Field typing — exactness investigation (2026-09-08, verified in scratch)
- **Decorators cannot set or infer a field's type.** `@int id;` → TS7008
  implicit any + decorator mismatch. Deliberate TS design; the `!: number`
  annotation is the price of decorator-based registration. Redundancy is at
  least *checked* (`ValueFor` makes `@int name!: string` an error).
- `FieldKeys<T>` therefore over-approximates: any non-function, non-BaseModel
  instance member looks like a column. Runtime is the real guard (persistence
  walks the fields channel only; `columnMetaFor` throws on unknown props).
  Conventions: `#private` for non-persisted state, getters for derived.
- **Branded column type works, but only with an *optional* brand:**
  `type Column<T, K> = T & { readonly [brand]?: K }` (`unique symbol`, not a
  string key). Verified: exact `FieldKeys` (plain `number` excluded), plain
  assignment `u.id = 5`, arithmetic, non-literal assignment, and the column
  kind is recoverable from the field type. A *required* brand
  (`T & { __ormitsField: true }`) breaks `u.id = 5`.
- ✅ **Adopted (a) 2026-09-09: brand the annotation.** Models now write
  `@int id!: Int`, `@text name!: Text`, `@boolean deleted!: Bool`.
  `field.ts` is table-driven: one `ColumnTypes` interface
  (`{ value, config }` per type) → `ColumnType`, `ValueFor`, `SugarConfigFor`,
  `ConfigFor`, `FieldConfig` (discriminated union, derived) all follow. A new
  column type = one table entry + `export const x = typedField("x"); export type X = ...`
  (+ the adapter's three exhaustive switches). Decorator `Value` is
  `ValueFor<T> | null`, so `@text({ nullable: true }) nick!: Text | null`
  is legal (was rejected before). `FieldKeys`/`Attributes`/`ColumnTypeOf`
  live in `field.ts` (brand-based, `NonNullable` so nullable columns count);
  `WhereConditions`/`OrderConditions` in `relation.ts`; `Bindable` in
  `adapter.ts`. No `types.ts`. Consequences: `FieldKeys` is exact —
  `#private`, getters, `cache = new Map()`, and BaseModel members are all
  excluded without special-casing, so `#persisted`/`isNewRecord` are free.
  Missing halves are loud but late: `: Int` without `@int` → runtime
  `columnMetaFor` throw at first query; `@int` with `: number` → bare form
  errors at the declaration (overload-resolution quirk in the
  `D & ((config?) => D)` intersection, garbled TS1270), configured form
  compiles but the field is invisible to `where`/`order`/`select`.
  (b) initializer style remains a known alternative, not adopted.
- Field-typing `/btw`: TS decorators can't set/infer types by design
  (runtime vs erased types, circularity of `Value` flowing into the
  decorator, TC39 "same type in, same type out"; TS#4881). Permanent.

Loose ends, no particular order: strip debug `console.log`s; decide `date`/`real` column types (union currently has
integer/text/boolean only).
