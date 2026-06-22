// Minimal local types for the `unzipper` package, which ships without
// TypeScript definitions. We only use a tiny surface (a streaming `Parse`
// that accepts a piped Readable, emits `entry` events for each file
// inside the archive, and closes/errors out at the end), so a hand-rolled
// module declaration keeps the project moving without pulling in a stale
// @types/unzipper.
declare module 'unzipper' {
  interface Entry {
    path: string
    on(event: 'data', listener: (chunk: Buffer) => void): this
    on(event: 'end', listener: () => void): this
    on(event: 'error', listener: (err: Error) => void): this
    autodrain(): void
  }

  // Parse() returns a Writable stream — you pipe a Readable into it, and it
  // re-emits the archive entries as `entry` events.
  type ParseStream = NodeJS.WritableStream & {
    on(event: 'entry', listener: (entry: Entry) => void): ParseStream
    on(event: 'close' | 'end', listener: () => void): ParseStream
    on(event: 'error', listener: (err: Error) => void): ParseStream
  }

  export function Parse(): ParseStream
}
