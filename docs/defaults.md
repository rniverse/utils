# `@rniverse/utils` — defaults reference

Every default value utils applies when a caller doesn't pass one: environment
variables, function parameters, option objects, and fixed constants that
behave like defaults. Values are taken from the source on `main` (commit
`84e3310`); the file each lives in is listed so it can be re-checked.

Units: all durations are **milliseconds** unless the row says otherwise.

First section: what *can't* be changed from code. The rest: defaults, module by module.

Built-in default lists and settings live in `lib/enum/` and are importable
(`@rniverse/utils/enum`), so callers can build on them — e.g.
`createLogger({ redact: [...MASK_PROPS, 'apiKey'] })`:

| Enum | Value | Used by |
|---|---|---|
| `MASK_PROPS` | `password`, `hash`, `token`, `accessToken`, `refreshToken`, `secret`, `authorization`, `cookie` | logger redaction, `sanitize`, `mask` |
| `MASK_CENSOR` | `***` | logger redaction, `mask` |
| `SAFE_REQUEST_ID_REGEX` | `^[A-Za-z0-9._-]{1,128}$` | `trace$.seed` |
| `PASSWORD_DEFAULTS` | `argon2id`, `memoryCost: 65_536` (KiB), `timeCost: 3`, `parallelism: 4`, `hashLength: 32` | `password`, `new Password()` |

## Not changeable from code

Everything else in this file is a *default* — a caller can pass something
different. Below: first the settings that read an environment variable (and
whether code can override them), then the values nothing can change short of
editing utils.

### Settings that read an environment variable

Each env var sits between an explicit option (wins) and the built-in default
(used when the var is unset or blank).

| Setting | Code option | Env var | Built-in default | Catch |
|---|---|---|---|---|
| Log level | `createLogger({ level })` | `LOG_LEVEL` | `info` | The shared `log` is created at import, so for `log` the env var must be set **before** utils is imported. At runtime pino's `log.level = 'debug'` still works. |
| Pretty vs JSON logs | `createLogger({ pretty })` | `NODE_ENV=test` or `LOG_PRETTY=true` (or a TTY) | JSON | Same import-time catch for `log`. |
| Masked property names | `createLogger({ redact })`; `sanitize(obj, keys)` / `mask(obj, keys)` | `MASK_PROPS` (comma-separated) | `MASK_PROPS` enum | **The env var replaces the list, it doesn't add to it** — `MASK_PROPS=apiKey` stops masking `password`. Read on every `sanitize`/`mask` call and every `createLogger()`; again, `log` sees it as of import. |
| Accepted inbound request id | — none; env only | `SAFE_REQUEST_ID_REGEX` | `SAFE_REQUEST_ID_REGEX` enum | Read on every `trace$.seed` call (compiled once per distinct value). An invalid pattern throws on the first inbound request, naming the env var. |

These are all the environment reads in utils. `INSTANCE_NAME`, listed in the
README, is read by `@rniverse/connectors`, not by utils.

### Hardcoded — no way to change

**Logger** (`logger.ts`)

| Value | Fixed at |
|---|---|
| Redaction depth | each masked prop at the top level and up to two levels deep (`x`, `*.x`, `*.*.x`) |
| Redaction text | `***` (`MASK_CENSOR`) |
| Extra level | `log` = 25 |
| Fields added to every line | `reqId`, `userId` from the request context |
| Pretty format | colourised, synchronous, timestamp `yyyy-mm-dd HH:MM:ss l`, hides `pid` / `hostname` |

**HTTP client** (`request.ts`)

| Value | Fixed at |
|---|---|
| `Retry-After` header | ignored — waits always follow `backoff` |
| Which methods retry by default | `GET` `HEAD` `PUT` `DELETE` `OPTIONS` (others need a per-call `retries`) |
| Trace header names | `x-request-id`, `x-user-id` |
| Request body encoding | anything `fetch` can send natively goes out as-is with no `content-type` set by utils: string, `Blob` / `File`, `FormData` (fetch adds the multipart boundary), `URLSearchParams`, `ReadableStream`, `ArrayBuffer`, typed arrays / `Buffer` / `DataView`. Anything else (a plain object, array, number…) is JSON-encoded with `content-type: application/json`. An explicit `content-type` header still wins. |
| Streamed bodies and retries | a `ReadableStream` can be read once, so a retried request with a stream body fails its retry — keep `retries` at 0 for streams |
| Response parsing | JSON when `content-type` contains `json`, else text; `204` / `205` / empty → `undefined` |
| Error on non-2xx | `get` / `post` / `put` / `patch` / `delete` throw `HttpError`; only `send` returns the raw `Response` |

**Request context** (`context/req.context.ts`)

| Value | Fixed at |
|---|---|
| Generated request id | UUID v7 — when no seed / custom id is supplied, the generator can't be swapped |

**Validation** (`ajv.ts`)

| Value | Fixed at |
|---|---|
| The `ajv` instance | one shared instance: `allErrors: true`, logs through `log`, with `ajv-formats` and `ajv-keywords`. There's no factory for a differently-configured instance. |

**Crypto** (`crypto.ts`)

| Value | Fixed at |
|---|---|
| `randomToken` encoding | base64url (only the byte count is a parameter) |
| `randomInt` range | draws from 32 bits, so `max − min` must stay below 2^32 |

**Parsing and formatting**

| Value | Fixed at |
|---|---|
| Duration strings (`duration.ts`) | units `s m h d w y` only; no months; `1y` = 365 days |
| Blank env values (`env.ts`) | `''` or whitespace counts as unset |
| `fmt` placeholders (`fmt.ts`) | `{key}` syntax (dot paths allowed); a key that doesn't match exactly falls back to a case-insensitive match; an unknown key is left in the text as-is |
| `templated` `now` (`lodash.ts`) | ISO 8601 string (`new Date().toISOString()`) |
| Sequence counters (`seq.ts`) | each generator starts at 1 |

**Resilience** (`resilience/`) — deliberate, part of the design (`docs/resilience.md`):

| Value | Fixed at |
|---|---|
| `resilient` retrying `CircuitOpenError` | never |
| Caller abort | never retried, never counted by a breaker |
| Breaker counting | consecutive failures only (no failure-rate window) |
| Stuck half-open trial | expires after the breaker's `cooldown` (no separate setting) |
| Longest single timer | `MAX_TIMER_MS` = 2_147_483_647 — the runtime's `setTimeout` limit, not a choice |

## Environment variables

Read through `environment.get(name, fallback)` (`lib/utils/env.ts`). A blank or
whitespace-only value counts as **unset**, so the fallback applies.

| Variable | Default | Effect | Source |
|---|---|---|---|
| `LOG_LEVEL` | `info` | pino log level | `logger.ts` |
| `LOG_PRETTY` | unset | `true` forces pretty logs | `logger.ts` |
| `NODE_ENV` | unset | `test` forces pretty logs | `logger.ts` |
| `MASK_PROPS` | the `MASK_PROPS` enum | comma-separated property names to mask — **replaces** the default list | `sanitize.ts` (`secrets()`), used by `logger.ts` |
| `SAFE_REQUEST_ID_REGEX` | the `SAFE_REQUEST_ID_REGEX` enum | pattern an inbound `x-request-id` must match to be adopted | `request.ts` |

`environment.required(name)` has no default — it throws
`Missing required environment variable: <name>` when unset or blank.

## Logger — `lib/utils/logger.ts`

`createLogger({ level, pretty, redact, destination })` — each option falls
back to its env var, then the built-in default. `log` is `createLogger()` with
no options, created at import.

| Setting | Default |
|---|---|
| Level | `level`, else `LOG_LEVEL`, else `info` |
| Extra level | `log` = 25 (between `debug` 20 and `info` 30), call as `log.log(...)` |
| Output | `pretty`, else pretty (colourised, synchronous) when `NODE_ENV=test`, or `LOG_PRETTY=true`, or stdout is a TTY; otherwise newline-delimited JSON |
| Destination | `destination`, else stdout |
| Pretty timestamp | `yyyy-mm-dd HH:MM:ss l` |
| Pretty hides | `reqId`, `userId`, `pid`, `hostname` (reqId/userId are prefixed onto the message instead) |
| Mixed into every line | `reqId`, `userId` from the current request context |
| Redaction censor | `***` (`MASK_CENSOR`) |
| Redacted props | `redact`, else `MASK_PROPS` env, else the `MASK_PROPS` enum — each at the top level and up to two levels deep (`x`, `*.x`, `*.*.x`, so `req.headers.cookie` is covered) |

## HTTP client — `http()`, `lib/utils/request.ts`

| Option | Default | Notes |
|---|---|---|
| `baseURL` | none | paths must then be absolute URLs |
| `headers` | none | a per-call header of the same name wins |
| `timeout` (client or per call) | `0` = no limit | per **attempt**; a timed-out attempt rejects with `TimeoutError` |
| `retries` (client or per call) | `2` for `GET` `HEAD` `PUT` `DELETE` `OPTIONS`; `0` for everything else (`POST`, `PATCH`) | extra attempts after the first |
| `retryable` (client or per call) | retry on a network error, a timeout, or a `5xx` response | `(result, context) => boolean` over `{ ok, data: Response } \| { ok: false, error }` — e.g. add `429`. Decides *which* outcomes retry; `retries` still decides how many, and `POST`/`PATCH` still need `retries` set. Per call overrides client. A caller abort is never retried. |
| `backoff` (client or per call) | `{ strategy: 'exponential', min: 200, max: 2_000 }` → waits 200, 400, 800 … capped at 2000 | partial: unset fields keep the default; per-call overrides client field by field. Differs from `retry`'s own default (10ms–3s) on purpose — HTTP retries back off harder |
| `propagate` | `true` | adds trace headers to outbound calls |
| `fetch` | the global `fetch` | |
| Request `content-type` | `application/json` when the body is JSON-encoded; none when sent as-is (string, `Blob`/`File`, `FormData`, `URLSearchParams`, stream, `ArrayBuffer`, typed array / `Buffer`) | an explicit header wins |
| Accepted inbound request id (`trace$.seed`) | `SAFE_REQUEST_ID_REGEX` env, else `^[A-Za-z0-9._-]{1,128}$` | anything else is ignored and a fresh id generated |
| Response parsing | JSON if `content-type` contains `json`, otherwise text; `204` / `205` / empty body → `undefined` | |

**Trace headers (`trace$`)**

| Constant | Value |
|---|---|
| Request-id header | `x-request-id` |
| User-id header | `x-user-id` (sent outbound, **never** read inbound) |
| Accepted inbound request id | `SAFE_REQUEST_ID_REGEX` env, else `^[A-Za-z0-9._-]{1,128}$` — anything else is ignored and a fresh id is generated |

## Resilience — `lib/utils/resilience/`

Design and rationale: `docs/resilience.md`.

**`retry`**

| Option | Default |
|---|---|
| `attempts` | `1` — retry is opt-in; `< 1` is treated as `1`; `Infinity` retries until success or abort |
| `backoff.strategy` | `exponential` |
| `backoff.min` | `10` — first wait, what exponential doubles from, and the floor |
| `backoff.max` | `3_000` — ceiling |
| `retryable` | `(result) => !result.ok` — retry errors only; returned values pass through |
| `signal` | none |

With defaults, exponential waits: 10, 20, 40, 80, 160, 320, 640, 1280, 2560,
3000, 3000 …

**`timeout(work, ms)`**

| Value | Meaning |
|---|---|
| `ms = 0` or `Infinity` | no limit |
| negative / `NaN` | `RangeError` |
| above `2_147_483_647` | `RangeError` (setTimeout's ceiling) |

**`CircuitBreaker`**

| Option | Default |
|---|---|
| `threshold` | `5` consecutive counted failures (integer ≥ 1) |
| `cooldown` | `30_000` |
| `trips` | `(result) => !result.ok` — every error counts, no success does |

**`resilient`**

| Option | Default |
|---|---|
| `timeout.total` | `0` = no overall limit |
| `timeout.attempt` | `0` = no per-attempt limit |
| `retry` | `retry`'s defaults above (so one attempt) |
| `breaker` | none |

## Generic — `lib/utils/generic.ts`

| Function / constant | Default |
|---|---|
| `safeParseInt(value, fallback, radix)` | `fallback = 0`, `radix = 10` |
| `boundedParseInt(value, { min, max, fallback })` | `fallback = 0`; no `min` / `max` clamp unless given |
| `sleep(ms, { signal })` | `0` resolves next tick; `Infinity` waits until aborted; negative / `NaN` / above `MAX_TIMER_MS` → `RangeError` |
| `MAX_TIMER_MS` | `2_147_483_647` (~24.8 days) |

## Sanitize — `lib/utils/sanitize.ts`

| Function | Default |
|---|---|
| `secrets()` | `MASK_PROPS` env (comma-separated), else the `MASK_PROPS` enum |
| `sanitize(obj, keys, options)` | `keys = secrets()`, shallow (`deep: false`) |
| `mask(obj, keys, maskWith, options)` | `keys = secrets()`, `maskWith = '***'` (`MASK_CENSOR`), shallow (`deep: false`) |

Same list as the logger's redaction, from the same `secrets()` — the two can't
drift apart. `sanitize` / `mask` match keys at any depth when `deep: true`;
the logger masks up to two levels deep.

## Crypto — `lib/utils/crypto.ts`

| Function | Default |
|---|---|
| `randomToken(bytes)` | `bytes = 32`, returned base64url |

## Sequence — `lib/utils/seq.ts`

| Function | Default |
|---|---|
| `sync$seq.get` / `async$seq.get` options | `length = 10`, `radix = 36` (only applied when `type: 'code'`); no prefix |
| `sync$seq.next.code(prefix?)` / `async$seq.next.code(prefix?)` | `type: 'code'`, so length `10`, radix `36` |
| Counter start | first value is `1` (counter starts at `0`, pre-incremented) |

## Lodash helpers — `lib/utils/lodash.ts`

| Function | Default |
|---|---|
| `cleanup(obj, clear)` | `clear = isNil` — removes `null` / `undefined` |
| `pickOne(obj, keys, df)` | `df` = `undefined` when not found |
| `templated(template, input)` | per key: `hardcode`, else first non-nil `getters` value, else ISO timestamp if `now`; then `default` if still nil |

## Request context — `lib/utils/context/req.context.ts`

| Function | Default |
|---|---|
| `cxt$req.bindFetch(handler, seed)` | new store with `requestId` = a fresh UUID v7 unless `seed` supplies one |
| `runWithContext(fn, custom)` | `requestId` = `custom.requestId`, else a fresh UUID v7 |

## ID — `lib/utils/id.ts`

| Function | Default |
|---|---|
| `uuid.generate` | UUID **v7** (time-ordered) |
| `ulid.generate` | standard ULID |

## Duration strings — `lib/utils/duration.ts`

Not defaults so much as fixed rules: `<integer><unit>`, unit one of
`s m h d w y`; `1y` = exactly 365 days; no month unit, no long-form words.

## Validation — `lib/utils/ajv.ts`

| Setting | Default |
|---|---|
| `allErrors` | `true` |
| Logger | utils' `log` |
| Plugins | `ajv-formats`, `ajv-keywords` |

## Datetime — `lib/utils/datetime.ts`

`date` is dayjs with these plugins extended by default: `utc`, `timezone`,
`advancedFormat`, `customParseFormat`, `calendar`, `relativeTime`,
`duration`, `isSameOrBefore`, `isSameOrAfter`, `isBetween`, `isToday`,
`isTomorrow`, `isYesterday`, `isLeapYear`, `dayOfYear`, `weekOfYear`,
`weekYear`, `weekday`, `isoWeek`, `isoWeeksInYear`, `quarterOfYear`,
`toArray`, `toObject`, `minMax`, `objectSupport`, `arraySupport`,
`bigIntSupport`, `localeData`, `localizedFormat`, `buddhistEra`,
`updateLocale`. No default timezone or locale is set.

## Password — `lib/utils/password.ts`

`password` is `new Password()` with `PASSWORD_DEFAULTS`; `new Password(options)`
for other settings (partial — unset fields keep the defaults).

| Option | Default |
|---|---|
| `type` | `argon2id` |
| `memoryCost` | `65_536` KiB (64 MiB) |
| `timeCost` | `3` |
| `parallelism` | `4` |
| `hashLength` | `32` bytes |

The defaults equal argon2's own today, pinned so a library upgrade can't
change them silently. `verify` needs no settings — they're stored in the
digest, so a digest made by any instance verifies with any other. `argon2` is
an optional dependency, loaded once on first use (via `lazy`); a failed load
isn't cached, so installing it later works without a restart.
