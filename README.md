# @rniverse/utils

Shared utilities for the RNiverse monorepo — environment, logging, request-context
propagation, an HTTP client, IDs, crypto, dates, validation, and lodash-style
helpers.

This file is the reference: every export, its signature, and what it does. It is
kept in sync with the code — you should not need to open the source to know what's
available.

---

## Install

```bash
bun add github:rniverse/utils#dist
```

| kind | package | needed for |
|---|---|---|
| peer | `pino` `^10.3.1`, `pino-pretty` `^13.1.3` | `log` / `createLogger` |
| peer | `typescript` `^7.0.2` | build |
| optional | `argon2` `^0.45.1` | `password.hash` / `password.verify` (native build; loaded lazily) |
| bundled | `dayjs`, `es-toolkit`, `jose`, `ulid`, `uuid`, `undici`, `valibot`, `ajv` (+ `ajv-formats`, `ajv-keywords`) | the rest |

### Entry points

Import from the root, or a subpath to pull in **only** that module (the root
barrel has side effects — it initialises the pino stream, extends `dayjs` with 30+
plugins, and loads `jose`):

```
@rniverse/utils            everything (barrel)
@rniverse/utils/env        environment
@rniverse/utils/logger     log, createLogger
@rniverse/utils/context    cxt$req, RequestContext, runWithContext
@rniverse/utils/request    http, trace$, HttpError
@rniverse/utils/resilience retry, timeout, resilient, CircuitBreaker, TimeoutError, CircuitOpenError
@rniverse/utils/lazy       lazy
@rniverse/utils/result     ok, err, Result
@rniverse/utils/crypto     randomToken, randomInt, sha256hex
@rniverse/utils/password   password
@rniverse/utils/duration   duration
@rniverse/utils/sanitize   sanitize, mask
@rniverse/utils/datetime   date
@rniverse/utils/id         uuid, ulid
@rniverse/utils/generic    sleep, isBun, safeParseInt, boundedParseInt
@rniverse/utils/fmt        fmt
@rniverse/utils/patch      opt-in: installs String.prototype.fmt (global mutation)
```

### Environment variables

| var | read by | effect |
|---|---|---|
| `NODE_ENV` | `logger` | `production` → newline-JSON logs instead of pretty |
| `LOG_LEVEL` | `logger` | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal`\|`silent` (default `info`) |
| `LOG_PRETTY` | `logger` | `true` forces pretty output even without a TTY |

---

## environment — `@rniverse/utils/env`

The only sanctioned way to read `process.env`. Blank / whitespace-only values are
treated as unset.

```ts
environment.get(name: string): string | undefined
environment.get(name: string, fallback: string): string
environment.required(name: string, fallback?: string): string   // throws if unset and no fallback
```

---

## Logging — `@rniverse/utils/logger`

```ts
log: pino.Logger              // the shared instance
createLogger(): pino.Logger   // a fresh instance (same config)
```

- **Format** — newline-delimited JSON, except pretty + synchronous when
  `NODE_ENV=test`, `LOG_PRETTY=true`, or stdout is a TTY.
- **Context** — every line carries `reqId` / `userId` pulled from the current
  request context (see below).
- **Redaction** — `password`, `hash`, `token`, `secret`, `authorization`,
  `accessToken`, `refreshToken`, `headers.cookie` (and one level deep, `*.x`) are
  replaced with `***`.
- **Extra level** — `log.log(...)` sits at 25, between `debug` and `info`.

---

## Request context — `@rniverse/utils/context`

Per-request / per-job ambient state on `AsyncLocalStorage`. A store exists only
inside `run()` / `bindFetch()` / `runWithContext()`. Mutation edits the store in
place (no `enterWith`).

```ts
type TRequestContext = { requestId: string; userId?: string; [k: string]: unknown }

class RequestContext<S extends TRequestContext = TRequestContext> {
  run<T>(store: S, fn: () => T): T                          // the core primitive
  bindFetch<A, R>(handler: (...a: A) => R,
                  seed?: (...a: A) => Partial<S> | undefined): (...a: A) => R
  store(): S | undefined                                    // the whole store
  get<K extends keyof S>(key: K): S[K] | undefined
  set<K extends keyof S>(key: K, value: S[K]): void         // in-place; no-op outside a context
  patch(values: Partial<S>): void                           // in-place merge
  requestId(): string | undefined
  userId(): string | undefined
}

cxt$req: RequestContext                                     // the shared instance
runWithContext<T>(fn: () => T, custom?: Partial<TRequestContext>): T   // for scripts / jobs
```

HTTP servers: wrap the fetch handler once.

```ts
Bun.serve({ fetch: cxt$req.bindFetch(app.handle, trace$.seed) });
```

---

## HTTP client — `@rniverse/utils/request`

A JSON client that propagates the request context onto outbound calls, so a chain
A → B → C shares one `requestId`.

```ts
http(config?: ClientConfig): HttpClient

type ClientConfig = {
  baseURL?: string
  headers?: Record<string, string>   // sent on every request
  timeout?: number                   // ms, per attempt
  retries?: number                   // extra attempts for idempotent calls on net-error / 5xx (default 2)
  propagate?: boolean                // attach trace headers (default true; false for third-party)
  fetch?: typeof fetch               // override (tests)
}

type RequestConfig = {
  query?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  body?: unknown                     // non-BodyInit → JSON.stringify + application/json
  timeout?: number
  retries?: number
  signal?: AbortSignal
}

type HttpClient = {
  send(method, path, opts?): Promise<Response>              // raw Response, never throws on status
  get   <T>(path, opts?): Promise<T>                        // parsed; throws HttpError on non-2xx
  post  <T>(path, opts?): Promise<T>
  put   <T>(path, opts?): Promise<T>
  patch <T>(path, opts?): Promise<T>
  delete<T>(path, opts?): Promise<T>
}

class HttpError extends Error { status: number; body: unknown }
```

Trace propagation — for the receiving side and for non-`http` clients:

```ts
trace$.REQUEST_ID          // 'x-request-id'
trace$.USER_ID             // 'x-user-id'
trace$.headers(): Record<string, string>                    // the current context as headers
trace$.seed(req: Request): Partial<TRequestContext> | undefined  // pass to cxt$req.bindFetch
```

`trace$.seed` adopts a safe inbound `x-request-id` only; `x-user-id` is ignored
(identity comes from auth, never a header).

---

## Resilience — `@rniverse/utils/resilience`

Full design and rationale: [`docs/resilience.md`](docs/resilience.md).

```ts
type Outcome<T> = Ok<T> | Err          // { ok: true, data } | { ok: false, error }

// Stop waiting after ms (0 / Infinity = no limit). Aborts the signal work received.
timeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number, opts?: { signal? }): Promise<T>

// Call again on outcomes `retryable` accepts. attempts counts the first call; default 1.
retry<T>(work: ({ attempt, signal }) => Promise<T>, {
  attempts?: number,                                   // default 1 — retry is opt-in
  backoff?: { strategy?: 'fixed' | 'exponential' | 'jitter', min?: number, max?: number },  // default exponential, 10ms–3s
  retryable?: (result: Outcome<T>, { attempt, attempts, delay, elapsed }) => boolean | Promise<boolean>,  // default: errors only
  signal?: AbortSignal,
  on?: { retry?: ({ attempt, attempts, delay, elapsed, result }) => void },
}): Promise<T>

// Fail fast once a dependency keeps failing; one trial call after cooldown.
new CircuitBreaker({ threshold?: 5, cooldown?: 30_000, trips?: (result) => boolean, on?: { open, trial, close } })
breaker.run(work, { signal? })        // throws CircuitOpenError (remaining ms) while open
breaker.state                         // 'closed' | 'open' | 'half-open'

// total timeout › retry › breaker › attempt timeout › work. CircuitOpenError is never retried.
resilient<T>(work, { timeout?: { total?, attempt? }, retry?, breaker?, signal? }): Promise<T>
```

The caller's own errors always come out unchanged (no wrapping); negative
durations throw `RangeError`.

## Lazy — `@rniverse/utils/lazy`

```ts
const admin = lazy(() => connectAdmin());
await admin.get();   // first call loads; concurrent calls share that load; later calls get the cached value
admin.reset();       // forget it — the next get() loads again
```

A failed load isn't cached. A load still in flight during `reset()` never
overwrites a newer one.

---

## Result — `@rniverse/utils/result`

```ts
type Ok<T = unknown>  = { ok: true; data: T }
type Err<E = unknown> = { ok: false; error: E }
type Result<T = unknown, E = unknown> = { ok: true; data?: T } | { ok: false; error: E }

ok(): { ok: true }
ok<T>(data: T): { ok: true; data: T }
err<E>(error: E): { ok: false; error: E }
```

---

## IDs — `@rniverse/utils/id`

Time-ordered, sortable.

```ts
uuid.generate(): string                 // UUID v7
uuid.extractTime(id: string): number    // ms since epoch

ulid.generate(): string                 // ULID (26-char Crockford base32)
ulid.extractTime(id: string): number
ulid.ulidFactory(): () => string        // monotonic factory (guaranteed ordering)
```

## Sequences — barrel only

Monotonic counters / prefixed codes.

```ts
type SeqOptions = { prefix?: string; type?: 'code' | string; length?: number; radix?: number }
getCode(str: string, length = 10): string               // left-pad with '0'

sync$seq.get(options?): () => string                     // sync counter
sync$seq.next.seq(): () => bigint
sync$seq.next.code(prefix?): () => string

async$seq.get(options?): () => Promise<string>           // concurrency-safe counter
async$seq.next.seq(): () => Promise<bigint>
async$seq.next.code(prefix?): () => Promise<string>
```

---

## Crypto — `@rniverse/utils/crypto`

Web Crypto, no deps.

```ts
randomToken(bytes = 32): string                 // CSPRNG, base64url
randomInt(min: number, max: number): number     // CSPRNG, inclusive, unbiased
sha256hex(value: string): Promise<string>       // hex
```

> `random` (below) is `Math.random` — never use it for anything security-sensitive.

## Password — `@rniverse/utils/password`

Consistent `(plain, digest)` order. `argon2` is optional and loaded lazily — the
first call throws a clear message if it isn't installed.

```ts
password.hash(plain: string): Promise<string>
password.verify(plain: string, digest: string): Promise<boolean>
```

## JWT — barrel only

```ts
jose        // the whole `jose` library, re-exported (so you don't add a second dependency)
```

Use it directly — `jose.SignJWT`, `jose.jwtVerify`, `jose.importPKCS8`,
`jose.exportJWK`, … There are no wrapper helpers: bring your own algorithm and
keys.

---

## Date — `@rniverse/utils/datetime`

```ts
date: typeof dayjs      // dayjs, pre-extended
```

Plugins already applied: `utc`, `timezone`, `advancedFormat`, `customParseFormat`,
`calendar`, `relativeTime`, `duration`, `isSameOrBefore`, `isSameOrAfter`,
`isBetween`, `isToday`, `isTomorrow`, `isYesterday`, `isLeapYear`, `dayOfYear`,
`weekOfYear`, `weekYear`, `weekday`, `isoWeek`, `isoWeeksInYear`, `quarterOfYear`,
`toArray`, `toObject`, `minMax`, `objectSupport`, `arraySupport`, `bigIntSupport`,
`localeData`, `localizedFormat`, `buddhistEra`, `updateLocale`.

## Duration — `@rniverse/utils/duration`

Compact strings `<integer><unit>`, unit one of `s m h d w y`. No months, no
long-form. `1y` = exactly 365 days.

```ts
duration.toSeconds(input: string): number       // '1d' -> 86400
duration.toMs(input: string): number
```

---

## Data helpers — `_` (barrel only)

`es-toolkit` (lodash-compatible) plus `get` / `set` / `has` from `es-toolkit/compat`
and four extras. Also exported as standalone functions.

```ts
_                                       // the combined namespace

cleanup(obj, clear = isNil): any        // recursively drop nil (or `clear`-matching) values; non-mutating
pickOne<T>(obj, keys: string | string[], default?): any   // first non-nil value among the paths
templated(template: Record<string, TemplateConfig>, input: TObject): TObject
titleCase(str: string): string          // 'hello_world' -> 'Hello World'

type TemplateConfig = { hardcode?; getters?: string[]; now?: boolean; default?: any }
```

## Sanitize — `@rniverse/utils/sanitize`

```ts
sanitize<T>(obj: T, keys = ['password','hash','token','secret'], opts?: { deep?: boolean }): Partial<T>   // drop keys
mask<T>(obj: T, keys = ['password','hash','token','secret'], maskWith = '***', opts?: { deep?: boolean }): T  // replace values
```

Shallow by default; `{ deep: true }` walks nested objects and arrays.

## String format — `@rniverse/utils/fmt`

```ts
fmt(template: string, params: object): string
fmt(template: string, ...positional: (string | number)[]): string
```

`'Hi {user.name}'.` … supports dot paths, positional `{0}`, case-insensitive key
fallback, nil-safe. `import '@rniverse/utils/patch'` additionally installs
`String.prototype.fmt` (global mutation — opt-in only).

---

## Validation

```ts
t                    // the whole `valibot` namespace (barrel only)
ajv                  // a configured Ajv instance: allErrors + ajv-formats + ajv-keywords, pino as logger
```

## HTTP primitives — barrel only

```ts
export * from 'undici'   // fetch, Client, Pool, Agent, request, Headers, …
```

## Misc — `@rniverse/utils/generic`

```ts
sleep(ms: number, opts?: { signal?: AbortSignal }): Promise<void>  // Infinity = until aborted
isBun(): boolean
safeParseInt(value: unknown, fallback = 0, radix = 10): number
boundedParseInt(value: unknown, opts: { min?: number; max?: number; fallback?: number }): number
```

## Non-secure random — barrel only

```ts
random.int(min: number, max: number): number     // Math.random — NOT cryptographic
random.float(min: number, max: number): number
getRandomInt(min, max): number                   // alias of random.int
```

## Shared types — barrel only

```ts
type TObject   = { [k: string]: TObject | TObject[] | string | number | boolean | null | undefined }
type TNObject  = { [k: string]: TNObject | TNObject[] | string | number | boolean }   // non-nullable
type Result<T, E>, Ok<T>, Err<E>          // see Result
type TemplateConfig                        // see Data helpers
type RetryOptions<T>, RetryOutcome<T>      // see Retry
type ClientConfig, RequestConfig, HttpClient   // see HTTP client
type TRequestContext, SeqOptions
```

---

## Notes

- **Barrel side effects.** Importing `@rniverse/utils` initialises the logger
  stream, extends `dayjs`, and loads `jose`. Use a subpath when you only need one
  piece.
- **`@rniverse/utils/patch` is opt-in.** The root does *not* touch
  `String.prototype`; only importing the `patch` subpath does.
- **`argon2` is optional.** Not installed → `password.*` throws on first call.
