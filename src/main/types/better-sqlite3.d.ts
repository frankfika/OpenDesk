// Minimal stub for `better-sqlite3`, which is an optional native dependency
// loaded via `require()` with a try/catch fallback inside
// `sqlite-fts5-adapter.ts`. The real package brings its own d.ts when
// installed; this declaration exists so TS type-checks the fallback path
// even when the binary isn't on disk (CI, fresh dev clones, etc.).
declare module 'better-sqlite3' {
  namespace Database {
    interface RunResult {
      changes: number
      lastInsertRowid: number | number[]
    }

    interface Statement<BindParameters extends unknown[] = unknown[]> {
      run(...params: BindParameters): RunResult
      get(...params: BindParameters): unknown
      all(...params: BindParameters): unknown[]
      iterate(...params: BindParameters): IterableIterator<unknown>
      pluck(toggleMode?: boolean): this
      expand(toggleMode?: boolean): this
      raw(toggleMode?: boolean): this
      columns(): { name: string; column: string; type: string }[]
      bind(...params: BindParameters): this
      reset(): this
    }

    interface DatabaseOptions {
      readonly?: boolean
      fileMustExist?: boolean
      timeout?: number
      verbose?: (msg: unknown) => void
      nativeBinding?: string
    }
  }

  // `export =` makes the module itself a constructable class so callers
  // can use both `require('better-sqlite3')` and `InstanceType<typeof
  // import('better-sqlite3')>` (which the SQLiteFTS5Adapter relies on).
  class Database {
    constructor(filename: string, options?: Database.DatabaseOptions)
    prepare<BindParameters extends unknown[] = unknown[]>(
      sql: string
    ): Database.Statement<BindParameters>
    exec(sql: string): this
    close(): void
    pragma(source: string, options?: { simple?: boolean; safe?: boolean }): unknown
    transaction<F extends (...args: never) => unknown>(fn: F): F
    open(): boolean
  }

  export = Database
}
