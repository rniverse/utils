# Resilience primitives — design (draft for review)

Status: **built** on `utils` branch `feat/resilience` (not yet published or
integrated). Covers five resilience primitives
for `@rniverse/utils` — `sleep`, `timeout`, `retry`, `CircuitBreaker`, and
`resilient` (the composer) — plus `lazy`, a related utility that lives
outside the resilience module (§8). Integrating them into `http()`, the connectors,
and `@rniverse/shared`'s registry is a separate, later step — listed at the
end only so the design can be checked against real call sites.

Revision 4: `lazy` lives in `lib/utils/lazy.ts`, not under `resilience/`
(§8), with the `reset()` race mechanism spelled out; negative durations are
now an error everywhere (§3).

Revision 3: decisions recorded — the new `retry` replaces utils' current one;
`connectors`' `CircuitBreaker` is removed and this one is used everywhere;
retry defaults changed (no retries unless asked); plain
explanation of the circuit breaker added (§7).

Revision 2 folded in: `retryable(result, context)` seeing successes and
errors; one-object hooks; an external review (half-open concurrency,
`Retry-After` units, non-abortable work overlapping retries); two gaps that
review missed (a stuck trial, `run()` not knowing the caller's signal); and
`lazy`.

## 1. Why

Two concrete failures in `notify` with Kafka unreachable:

- **`GET /api/health` never answers.** The registry's `health()` awaits every
  connector with no time limit. The Redpanda check retries 3 times, and each
  ping hangs inside kafkajs's own retries. Bun's server drops an idle
  connection after 10 s, so the client gets an empty reply
  (`IncompleteMessage`) instead of `{ ok: false }`.
- **Every call pays the full cost of a dead dependency.** Even with a timeout,
  each request would wait the whole timeout before failing, and keep hitting
  the dead broker. Nothing remembers "this is down, fail fast for a while."

The existing pieces don't cover this: `utils`' `retry()` has no timeout and
no strategies; `http()` rolls its own timeout and backoff; `connectors`'
`CircuitBreaker` counts failed health checks but never blocks a call (it is
removed and replaced by the new one, §7). And "load once, share the
in-flight load" is hand-written twice in `connectors`
(`SQLConnector.connect()`'s `init_promise`, `RedpandaConnector.getAdmin()`'s
`admin_promise`) — `lazy` (§8).

## 2. Scope

In: `sleep`, `timeout`, `retry`, `CircuitBreaker`, `resilient` — the
`resilience/` module. Also `lazy` (§8), documented here but placed outside
that module.

Out, deliberately:

| Primitive | Why not now |
|---|---|
| Limiter / bulkhead (cap concurrent calls) | Real need is notify's retry cron draining pending rows into Resend. Build it with the cron. |
| Keyed single-flight (`share(key, load)`) | Concurrent callers for the same key share one load, nothing cached after. No current call site loads on a cache miss. Build when one appears. |
| Inbound rate limiter | Per-client keys + shared store (aham's deferred signin/signup limits). Different kind of thing, not a utils primitive. |
| Fallback | A plain `try/catch`. notify's publish-or-pending-row path already does this directly. |
| Hedging (duplicate slow requests) | No call site needs it; doubles load. |
| Idempotency key | Needed before retrying non-idempotent POSTs (aham → notify `send/sync`). An API feature — notify must dedupe — not a utils function. Goes with integration. |

## 3. Conventions shared by all five

- **Milliseconds everywhere.** Every duration option is a number of ms.
- **Negative durations are an error.** Any negative (or `NaN`) duration —
  `sleep(ms)`, `timeout(…, ms)`, backoff `min`/`max`, breaker
  `cooldown` — throws `RangeError` up front. A negative wait is always a bug
  (usually a subtraction gone wrong), so it fails loudly instead of being
  silently treated as "no wait" or "no limit".
- **Cancellation is an `AbortSignal`.** Every primitive accepts an optional
  `signal`. A caller abort rejects with `signal.reason`, is never retried,
  and is never counted against a breaker.
- **Errors are never wrapped.** The caller's own error comes out unchanged, so
  `err instanceof HttpError` keeps working. The only new error types are the
  ones these primitives raise themselves: `TimeoutError`, `CircuitOpenError`.
- **No logging, no env reads.** Primitives report through `on` hooks; the
  caller decides what to log. All settings come in as arguments (the caller's
  `config` module supplies them) — unlike `connectors`' old
  `CircuitBreaker`, which reads `CIRCUIT_*` env vars itself.
- **Hooks live under one `on` object** in every primitive (`on.retry`,
  `on.open`, …).
- **Hooks take one event object; predicates take the outcome plus one
  context object** — `on.retry({ attempt, delay, result })`,
  `retryable(result, { attempt, delay, … })`. Never a growing list of
  positional arguments, so fields can be added without breaking call sites.
- **Outcomes use utils' `Result` shapes.** Anywhere a callback judges "how did
  that call go?", it gets `Outcome<T> = Ok<T> | Err` — `{ ok: true, data }`
  or `{ ok: false, error }` — covering a resolved value *and* a thrown error.
  No new union type. (`Ok<T>` is utils' stricter shape where `data` is always
  present, so `result.data` is typed.)
- **`Outcome.ok` means "`work` didn't throw" — not "the result is good."** A
  `work` that *returns* `{ ok: false }` (a connector health result) arrives
  as `{ ok: true, data: { ok: false } }`. That's intentional: the utility
  layer reports execution; deciding whether a returned value is a failure is
  the caller's predicate's job. So a caller checking both writes
  `(result) => !result.ok || !result.data.ok`.
- **Portable.** Only `setTimeout`, `AbortController`, `AbortSignal`,
  `Math.random` (fine for jitter). No `Bun.*`. Every timer is cleared when its
  work settles, so nothing keeps the process alive.
- **Stateless except `CircuitBreaker`.** `sleep`/`timeout`/`retry`/
  `resilient` are plain functions. `CircuitBreaker` is a class you construct
  once per dependency.

## 4. `sleep`

```ts
sleep(ms: number, options?: { signal?: AbortSignal }): Promise<void>
```

- Resolves after `ms`. Rejects with `signal.reason` as soon as the signal
  aborts, and clears its timer.
- `ms === 0` resolves on the next tick. Negative `ms` throws `RangeError` (§3).
- `Infinity` waits until the signal aborts. Above `MAX_TIMER_MS`
  (2^31 − 1 ms, setTimeout's ceiling — past it runtimes fire immediately)
  rejects with `RangeError` rather than silently shortening the wait.
- **Lives in `generic.ts`, not in `resilience/`** — it replaces the existing
  `sleep(ms)` there (same call shape; `signal` is additive, so existing
  callers are unaffected). `retry` imports it from `generic`.

## 5. `timeout`

```ts
class TimeoutError extends Error {
  readonly ms: number;
}

timeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  options?: { signal?: AbortSignal },
): Promise<T>
```

- Runs `work` with a fresh signal. After `ms`, aborts that signal with a
  `TimeoutError` and rejects with the same error.
- `options.signal` links a caller's cancel: if it aborts first, the inner
  signal aborts too and the promise rejects with the caller's reason.
- `ms === 0` or `Infinity` means **no limit** — `work` runs untimed. Lets a
  config value of `0` switch a timeout off.
- Negative `ms` throws `RangeError` (§3) — it is not treated as "no limit".

**`timeout` bounds the caller's wait, not the lifetime of the work.** Work
that honours the signal (`fetch`, `sleep`, a nested `retry`) actually stops.
Work that ignores it (a kafkajs admin call) keeps running in the background —
the caller just stops waiting. No runtime can do better from the outside.

This matters most combined with `retry`: attempt 1 times out, attempt 2
starts, and attempt 1's underlying call is *still running* — two in-flight
calls against the same dependency, more with more attempts. For clients that
don't honour `AbortSignal`:

- set the client's **own** time limits (kafkajs `requestTimeout` /
  `connectionTimeout`) so the underlying call really ends;
- keep `attempts` low, and rely on the breaker to stop piling on.

```ts
const report = await timeout((signal) => connector.health({ signal }), 3000);
```

## 6. `retry`

Rewritten from scratch. Does one thing: **call again after an outcome it's
told to retry, with a wait in between.** Timeouts are not its job (§9).

```ts
type Outcome<T> = Ok<T> | Err;

type Backoff = {
  strategy: 'fixed' | 'exponential' | 'jitter';
  min: number;   // ms — the first wait, what exponential doubles from, and the floor
  max: number;   // ms — no wait is ever longer
};

type RetryContext = {
  attempt: number;    // the attempt that just finished, 1-based
  attempts: number;   // total allowed
  delay: number;      // ms the next wait will be, if this returns true
  elapsed: number;    // ms since the first attempt started
};

type RetryOptions<T> = {
  attempts?: number;                  // total calls, INCLUDING the first
  backoff?: Partial<Backoff>;
  retryable?: (result: Outcome<T>, context: RetryContext) => boolean | Promise<boolean>;
  signal?: AbortSignal;
  on?: {
    retry?: (event: RetryContext & { result: Outcome<T> }) => void;
  };
};

retry<T>(
  work: (context: { attempt: number; signal: AbortSignal }) => Promise<T>,
  options?: RetryOptions<T>,
): Promise<T>
```

Defaults: `attempts: 1`, `backoff: { strategy: 'exponential', min: 10, max: 3_000 }`,
`retryable: (result) => !result.ok` (retry errors only; successes pass
straight through).

**`attempts: 1` means retry is opt-in.** `retry(work)` with no options calls
`work` once and returns its outcome — nothing is retried until a caller asks
for more attempts. Every call site states its own retry budget.

**`attempts` counts every call, including the first.** `attempts: 3` means
one call plus up to two retries — not three retries. (Many libraries use
`retries` for "extra calls after the first"; this one doesn't.)

### `retryable(result, context)`

- **Sees successes and errors.** A resolved value arrives as
  `{ ok: true, data }`, a thrown error as `{ ok: false, error }` — see the
  `Outcome.ok` note in §3. So a 5xx `Response` or a `{ ok: false }` health
  result can be retried directly, no throwing inside `work` to trigger it.
- **May be async.** Retry awaits it — and nothing times the predicate itself.
  A `retryable` that never settles freezes `retry()`; only a `resilient`
  total timeout (§9) bounds it. Keep predicates to in-memory checks (status,
  error type, `ok` flags); async is there for the rare case that needs it.
- **Returns `true`** → wait `context.delay`, then call `work` again.
  **Returns `false`** → the outcome comes back unchanged: a success resolves
  with its value, an error rethrows as-is.
- **Not called after the last attempt** — nothing left to decide, so
  `context.delay` always describes a wait that will really happen.
- **If `retryable` itself throws**, retry stops and that error propagates.
- **`context.delay` is computed once, before the call**, so with `jitter`
  the predicate, the hook, and the actual wait all see the same value.
- **Caution with `Response` bodies:** a body can be read once. A predicate
  that reads `result.data.json()` and then returns `false` hands the caller a
  `Response` whose body is already consumed. Inspect `status`/headers, or read
  from `result.data.clone()`.

### Backoff

Two numbers. `min` is the first wait, the value exponential doubles from,
and the floor; `max` is the ceiling. Every wait is clamped to `[min, max]`,
whatever the strategy. For the wait after attempt `n` fails (`n` from 1):

| Strategy | Wait (then clamped to `[min, max]`) |
|---|---|
| `fixed` | `min` every time |
| `exponential` | `min × 2^(n−1)` |
| `jitter` | random between `min` and the `exponential` value — exponential backoff with jitter, stops many clients retrying in lockstep. The first wait is always `min` (the range is `[min, min]`); spread starts from the second. |

With the defaults (`min: 10`, `max: 3_000`): exponential waits 10, 20, 40,
80, 160, 320, 640, 1280, 2560, 3000 … ms; jitter picks between 10 and those
values.

`min: 0` is allowed but makes every strategy wait 0 — doubling zero stays
zero. Use it only to mean "retry immediately".

`min > max` is rejected up front with a `RangeError`.

### Behaviour

- **Out of attempts:** the last outcome is returned unchanged — resolve with
  its value, or rethrow its error. No `RetryError` wrapper, so
  `instanceof HttpError` keeps working.
- **Each attempt gets its own signal**, linked to the caller's. When an
  attempt is abandoned (timed out by `resilient`), only that attempt's signal
  aborts; the next attempt starts with a fresh one.
- **`on.retry(event)`** fires after `retryable` says yes, before the wait.
  `event` is the context plus `result`; "why did it retry" is just
  `result.ok`. Not fired when retry gives up.
- **Caller abort** (`signal`) stops immediately, mid-wait included, and
  rejects with `signal.reason`. It never reaches `retryable`.
- `attempts` below 1 is treated as 1.

```ts
const response = await retry(({ signal }) => fetch(url, { signal }), {
  attempts: 4,
  backoff: { strategy: 'jitter', min: 200, max: 5_000 },
  retryable: (result) => !result.ok || result.data.status >= 500,
  on: { retry: ({ attempt, delay }) => log.warn({ attempt, delay }, 'retrying') },
});
```

## 7. `CircuitBreaker`

### In plain terms

Named after the switch in a house's fuse box: when something goes badly
wrong, it cuts the line instead of letting damage continue, and someone has
to flip it back.

In code, it sits between your service and one dependency (Kafka, Resend, the
notify service) and remembers how recent calls to it went.

**Without one**, if Kafka is down, every request still tries Kafka, waits for
the timeout (say 1 s), then fails. 100 requests a second means 100 slow
failures a second, and 100 calls a second hammering a broker that's already
struggling.

**With one**, after a few failures in a row the breaker concludes "Kafka is
down" and stops trying. For a while, every call fails *instantly* — no
waiting, no traffic to Kafka. Then it lets one test call through to see
whether Kafka is back.

The two settings are the answers to two questions:

- **`threshold` — "how many failures in a row before I believe it's down?"**
  Too low (1) and one blip cuts the dependency off for everyone. Too high
  (50) and you pay many slow failures before it reacts. A few (3–5) is
  usual. *In a row* matters: any success resets the count, so a dependency
  that fails now and then never opens it — only one that keeps failing.
- **`cooldown` — "once I believe it's down, how long before I check again?"**
  Too short (1 s) and you keep poking a dependency that needs time to
  recover. Too long (10 min) and you keep refusing calls long after it came
  back. Roughly how long the dependency usually takes to restart or recover
  (tens of seconds) is a good start.

**Timeline**, `threshold: 3`, `cooldown: 30 s`, Kafka goes down at 12:00:00:

```
12:00:00  call 1 → fails (timeout)          failures = 1   closed
12:00:01  call 2 → fails                    failures = 2   closed
12:00:02  call 3 → fails                    failures = 3   → OPEN until 12:00:32
12:00:03  calls 4…500 → CircuitOpenError instantly, Kafka never touched
12:00:32  cooldown over                                    → half-open
12:00:33  call 501 → allowed through as the one test call
            ├─ Kafka back  → succeeds → CLOSED, normal traffic resumes
            └─ still down  → fails    → OPEN again until 12:01:03
          calls arriving while the test call is running → CircuitOpenError
```

Three states, in one line each:

- **closed** — normal. Calls go through; failures in a row are counted.
- **open** — refusing. Calls fail instantly with `CircuitOpenError`.
- **half-open** — testing. One call goes through; its result decides.

Why "closed" means *working*: like the electrical switch, a closed circuit
lets current flow; an open one breaks it.

It doesn't replace a timeout — it uses them. The timeout turns "Kafka hangs"
into a failure the breaker can count; the breaker turns "Kafka keeps
failing" into "stop calling Kafka for a while."

### API

```ts
type BreakerState = 'closed' | 'open' | 'half-open';

class CircuitOpenError extends Error {
  readonly remaining: number;   // ms until another call is permitted
}

type BreakerOptions = {
  threshold?: number;           // consecutive failures that open it
  cooldown?: number;            // ms to stay open before a trial
  trips?: (result: Outcome<unknown>) => boolean | Promise<boolean>;
  on?: {
    open?: (event: { failures: number; cooldown: number }) => void;
    trial?: (event: { since: number }) => void;   // entering half-open; since = ms it was open
    close?: (event: { since: number }) => void;   // back to normal; since = ms it wasn't closed
  };
};

class CircuitBreaker {
  constructor(options?: BreakerOptions);
  run<T>(work: () => Promise<T>, options?: { signal?: AbortSignal }): Promise<T>;
  get state(): BreakerState;
  reset(): void;
}
```

Defaults: `threshold: 5`, `cooldown: 30_000`, `trips: (result) => !result.ok`.

`trips` takes `Outcome<unknown>`, not `Outcome<T>`: one breaker guards many
calls with different return types (`run<T>` is per call), so its predicate
can't be tied to one `T`. Callers narrow inside `trips`.

### Lifecycle

```
             threshold consecutive failures
closed ─────────────────────────────────────→ open
  ↑                                             │
  │                                             │ cooldown elapses
  │           trial succeeds                    ↓
  └────────────────────────────────────── half-open
                                                │
               trial fails, or outlives cooldown│
  open ←────────────────────────────────────────┘  (fresh cooldown)
```

- **Closed (normal):** calls go through. Each outcome `trips` counts adds 1;
  any outcome it doesn't count resets the count to 0. Reaching `threshold`
  opens it.
- **Open:** `run` throws `CircuitOpenError` immediately — `work` is never
  called, the dependency is never touched.
- **Half-open:** exactly **one** trial call goes through; every concurrent
  caller gets `CircuitOpenError`. Trial succeeds → closed. Trial fails → open
  again, fresh cooldown.

### Internal state — no timers

Three fields, state derived on access:

```
failures     consecutive counted failures (closed only)
openUntil    null while closed; otherwise the time a trial becomes allowed
trial        null, or { startedAt, token } while a trial is running
```

| Condition | State |
|---|---|
| `openUntil === null` | closed |
| `now < openUntil` | open |
| `now >= openUntil` | half-open (trial slot free if `trial` is null, taken otherwise) |

The cooldown elapsing with no trial running is **half-open, not closed** —
the next caller becomes the trial. Reporting it as closed would let calls
through as normal traffic, needing `threshold` more failures to reopen
instead of one.

### Invariants

- **Trial reservation is synchronous.** In `run`, the check "cooldown over and
  no trial running" and the claim of the slot (`trial = { startedAt, token }`)
  happen before the first `await`. JavaScript runs that block without
  interleaving, so two concurrent callers can never both become the trial.
- **A stuck trial expires.** If the trial is still running `cooldown` ms after
  it started (hung, non-abortable work, no attempt timeout), the next caller
  treats it as failed: reopen with a fresh cooldown. Without this, one hung
  trial would hold the slot forever and every caller would get
  `CircuitOpenError` permanently. The late outcome of an expired trial is
  ignored — its `token` no longer matches.
- **The slot is held until `trips` resolves.** With an async `trips`, the
  trial isn't settled until the predicate is; concurrent callers keep getting
  `CircuitOpenError` until then.
- **A `trips` that never settles.** Nothing times the predicate itself. In
  half-open, the stuck-trial expiry above frees the slot after `cooldown`. In
  closed state, `run()` never settles, so the caller hangs — unless the call
  goes through `resilient` with a total timeout (§9), which bounds it. Keep
  `trips` to in-memory checks; async is for the rare case that needs it.

### What counts as a failure

- Whatever `trips` says — same `Outcome` shape as `retryable`, so a *returned*
  `{ ok: false }` can trip it too, not only a thrown error. Default: every
  error, no success.
- Pass `trips` to ignore errors that aren't the dependency's fault — a 4xx
  `HttpError` is the caller's mistake; a 5xx, a timeout, or a refused
  connection is the dependency. That policy belongs in `trips`, not hardcoded
  in `CircuitBreaker`.
- **Caller abort never counts.** That's why `run` takes the caller's
  `signal`: if the call fails while `signal.aborted`, the
  breaker leaves the count untouched and doesn't call `trips`.
- **`TimeoutError` counts** under the default `trips` — a hung dependency is
  exactly what this exists to catch.
- `run` always returns the outcome unchanged — `trips` only decides whether
  the breaker counts it.

### Other rules

- **`remaining` is milliseconds**, until another call is permitted. It is
  not a `Retry-After` value — that header takes seconds (or an HTTP date).
  An HTTP layer that wants to send one converts: `Math.ceil(remaining / 1000)`.
- **One instance per dependency, per process.** Not shared across replicas —
  each process learns on its own. Intentional: no shared store needed.
- **Consecutive failures, not a failure-rate window.** Right for "dependency
  is down." A rate window would be a **different breaker policy**, not a
  tweak to this one — if a dependency turns out flaky rather than dead, that
  gets its own design.

```ts
const kafkaBreaker = new CircuitBreaker({
  threshold: 3,
  cooldown: 30_000,
  on: { open: ({ failures }) => log.warn({ failures }, 'kafka circuit open') },
});
await kafkaBreaker.run(() => producer.send(message), { signal });
```

## 8. `lazy`

Not part of the resilience module: it's about loading a value once, not about
coping with a failing dependency. Lives directly in `lib/utils/lazy.ts`
(subpath `@rniverse/utils/lazy`), not under `resilience/`. It composes with
the primitives above but doesn't depend on them.

Load something once; everyone who asks while it's loading shares that one
load, instead of each starting their own — ten requests arriving before a
connection is up wait on one connection attempt, not ten.

es-toolkit's `_.once` (re-exported by utils as `_`) doesn't fit: it caches a
rejected promise forever, so one failed load is permanent, and it has no
`reset`. That's also why this isn't named `once`.

```ts
type Lazy<T> = {
  get(): Promise<T>;
  reset(): void;
};

lazy<T>(load: () => Promise<T>): Lazy<T>
```

```ts
const admin = lazy(() => connectAdmin());

await admin.get();   // first caller starts load()
await admin.get();   // callers during the load share its promise; later callers get the cached value
admin.reset();       // forget it (e.g. in close()); the next get() loads again
```

### Behaviour

- **Concurrent callers share one load.** Every `get()` while a load is in
  flight returns that same promise.
- **A successful load is cached** until `reset()`. No expiry — adding one
  turns this into a cache, which is a different tool.
- **A failed load is not cached.** Its callers get the error; the slot
  clears, so the next `get()` starts a fresh load.
- **No caller signal reaches `load`.** One caller giving up must not cancel
  the shared load for everyone else. A caller that wants to stop waiting
  wraps its own wait: `timeout(() => admin.get(), 1000)`.
- **Errors come out unchanged** — no wrapping.
- **Composes:** `lazy(() => resilient(connect, { … }))` — one shared load
  that is also time-limited and retried.

### `reset()` during a load — the race, and how it's prevented

The sequence that must be safe:

```
get()     → load A starts
reset()
get()     → load B starts
            load A settles
            load B settles
```

Required: **A must never overwrite B**, whichever order they settle in. Nor
may A's *failure* clear B's in-flight load — otherwise a `get()` right after
would start a third load while B is still running.

**Mechanism: slot identity.** `lazy` holds one field, `slot` — the promise of
the current load, or `null`. Each load remembers the exact promise it was
stored as, and on settling only touches `slot` if `slot` is still that same
promise:

```ts
let slot: Promise<T> | null = null;

function get(): Promise<T> {
  if (slot) return slot;
  const mine = Promise.resolve().then(load);  // a synchronous throw becomes a rejection
  slot = mine;
  mine.catch(() => {
    if (slot === mine) slot = null;           // clear only our own failed load
  });
  return mine;
}

function reset(): void {
  slot = null;
}
```

- A successful load writes nothing: its promise is already in `slot`, and a
  resolved promise *is* the cached value.
- `reset()` just drops the reference. Load A keeps running (it can't be
  cancelled), and A's callers still get A's outcome — they asked before the
  reset.
- After `reset()` and a new `get()`, `slot` holds B. When A settles,
  `slot === mine` is false, so A's success changes nothing and A's failure
  clears nothing.
- No counters or generation numbers: a promise is already a unique identity.
  JavaScript runs `get()` and `reset()` without interleaving, so the
  check-then-set in `get()` can't race another `get()`.

## 9. `resilient` — the composer

```ts
type ResilientOptions<T> = {
  timeout?: { total?: number; attempt?: number };  // ms
  retry?: Omit<RetryOptions<T>, 'signal'>;   // the one `signal` is top-level
  breaker?: CircuitBreaker;
  signal?: AbortSignal;
};

resilient<T>(
  work: (context: { attempt: number; signal: AbortSignal }) => Promise<T>,
  options?: ResilientOptions<T>,
): Promise<T>
```

Every layer is optional — omit one and it's simply not applied. What it adds
over hand-wiring: **one fixed, correct order**, so no call site gets it wrong.

```
total timeout
  └─ retry
       └─ breaker
            └─ attempt timeout
                 └─ work
```

Why this order:

- **Total timeout outermost:** bounds everything — work, every attempt, and
  retry waits. Its signal reaches retry, so an expired budget also stops a
  pending wait.
- **Retry outside the breaker:** each attempt passes through the breaker, so
  once it opens, remaining retries fail instantly instead of hitting the
  dependency.
- **Attempt timeout inside the breaker:** a hung attempt becomes a
  `TimeoutError` the breaker counts.
- **`CircuitOpenError` is never retried.** `resilient` checks it before the
  caller's `retryable` is consulted — retrying an open circuit only burns the
  budget. A `TimeoutError` from the attempt timeout goes through `retryable`
  like any other error.

The two paths this produces:

```
breaker open      → CircuitOpenError → not retried, fail fast
dependency hangs  → attempt timeout → TimeoutError → breaker counts it → retried
                  → … threshold reached → breaker opens → remaining attempts fail fast
```

```ts
const health = () =>
  resilient(({ signal }) => connector.health({ signal }), {
    timeout: { total: 3_000, attempt: 1_000 },
    retry: { attempts: 2, backoff: { strategy: 'fixed', min: 200 } },
    breaker: redpandaBreaker,
  });
```

## 10. Errors

| Error | Raised by | Carries |
|---|---|---|
| `TimeoutError` | `timeout`, `resilient` | `ms` |
| `CircuitOpenError` | `CircuitBreaker.run`, `resilient` | `remaining` (ms — convert for `Retry-After`) |
| `signal.reason` | any, on caller abort | whatever the caller aborted with |
| the caller's own error | `retry`, `resilient`, `lazy` | unchanged |

## 11. Module layout

```
lib/utils/generic.ts   — sleep (replaced in place, not in resilience/)
lib/type/resilience.type.ts — Outcome, Attempt, Backoff, RetryContext, RetryOptions,
                              BreakerState, BreakerTrial, BreakerOptions, ResilientOptions
lib/type/generic.type.ts    — SleepOptions, Lazy
lib/utils/resilience/
  timeout.ts
  retry.ts
  circuit-breaker.ts
  resilient.ts
  errors.ts        — TimeoutError, CircuitOpenError
  index.ts
test/resilience/
  timeout.test.ts  retry.test.ts  circuit-breaker.test.ts  resilient.test.ts
test/sleep.test.ts
```

```
lib/utils/lazy.ts   — outside resilience/ (§8)
test/lazy.test.ts
```

`resilience/` is published as `@rniverse/utils/resilience`, `lazy` as
`@rniverse/utils/lazy`; both re-exported from the root barrel. Tests use real, short (ms-level) delays — no fake timers.

## 12. Test checklist

Implementation isn't done until each of these has a test.

`sleep`
- [x] aborts immediately and clears its timer
- [x] negative `ms` throws `RangeError`

`timeout`
- [x] rejects with `TimeoutError` carrying `ms`, and aborts the work's signal
- [x] propagates caller cancellation (rejects with the caller's reason)
- [x] clears its timer once the work settles
- [x] `0` / `Infinity` runs untimed
- [x] negative `ms` throws `RangeError`

`retry`
- [x] never retries caller cancellation; aborts mid-wait
- [x] does not call `retryable` after the final attempt
- [x] retries a returned value when `retryable` says so
- [x] returns / rethrows the last outcome unchanged
- [x] computes one delay and uses it for predicate, hook, and wait
- [x] `fixed` waits `min`; `exponential` doubles from `min`; `jitter` stays between `min` and the exponential value
- [x] every strategy's waits stay within `[min, max]`
- [x] `min > max` fails early with `RangeError`
- [x] negative `min`/`max` fails early with `RangeError`
- [x] default `attempts: 1` calls `work` once, never retries
- [x] `attempts < 1` becomes one attempt
- [x] `retryable` throwing stops retry and propagates that error
- [x] each attempt gets a fresh signal; an abandoned attempt's signal is aborted

`CircuitBreaker`
- [x] counts consecutive failures; a non-counted outcome resets the count
- [x] opening prevents dependency calls
- [x] half-open allows exactly one trial; concurrent callers fail immediately
- [x] failed trial reopens with a fresh cooldown; successful trial closes
- [x] a trial outliving `cooldown` expires, reopens, and its late outcome is ignored
- [x] an async `trips` keeps the trial slot held until it resolves
- [x] a never-settling `trips` in half-open is freed by the stuck-trial expiry
- [x] caller abort never trips it (and never calls `trips`)
- [x] `TimeoutError` trips it
- [x] a returned `{ ok: false }` trips it via `trips`
- [x] no timers remain alive while idle
- [x] negative `cooldown` throws `RangeError`

`lazy`
- [x] concurrent `get()`s share one `load()` call
- [x] a successful load is cached; later `get()`s don't call `load()`
- [x] a failed load isn't cached; the next `get()` loads again
- [x] a synchronous throw in `load()` behaves like a rejected load
- [x] `reset()` forces a fresh load
- [x] reset during load A, then load B: A settling **after** B doesn't overwrite B
- [x] reset during load A, then load B: A settling **before** B doesn't overwrite B
- [x] reset during load A, then load B: A **failing** doesn't clear B (no third load)
- [x] callers of A still get A's outcome after `reset()`

`resilient`
- [x] `CircuitOpenError` is never retried
- [x] total timeout includes retry delays
- [x] total timeout bounds a never-settling `retryable` / `trips`
- [x] attempt timeout sits inside the breaker (its `TimeoutError` is counted)
- [x] original application errors come out unchanged

## 13. What changes for current callers (integration, later)

Listed only to check the design fits; built in a separate step.

- **`utils` `retry`:** the current `lib/utils/retry.ts` is deleted; the new
  one replaces it. Every caller (`http()`, the four connector health checks)
  moves to the new API.
- **`utils` `http()`:** drops its own `__backoff`/`__abort` for `resilient`.
  Keeps retrying only idempotent methods by default (so aham's POST to
  `send/sync` gets a timeout but no retry until notify has idempotency keys).
- **`connectors` — sql/redis/mongodb/redpanda `health()`:** today they retry a
  *returned* `{ ok: false }` via the old `retryIf(outcome)`. New shape is
  nearly identical: `retryable: (result) => !result.ok || !result.data.ok`.
  Default wait goes from `1000 ms × attempt` to exponential from 100 ms.
- **`connectors` — `SQLConnector.connect()`, `RedpandaConnector.getAdmin()`:**
  hand-written `init_promise` / `admin_promise` become `lazy`, with `reset()`
  in `close()`.
- **`connectors` — Redpanda:** set kafkajs's own `requestTimeout` /
  `connectionTimeout` (§5), since its calls ignore `AbortSignal`.
- **`connectors` `CircuitBreaker` tool (`lib/tools/circuit-breaker.tool.ts`):**
  removed. The connectors run their pings through the new `CircuitBreaker`
  instead; the `CIRCUIT_THRESHOLD` / `CIRCUIT_COOLDOWN_MS` env vars go away
  (settings come from each app's `config`).
- **`shared` registry:** a `timeout` (or `resilient`) around each connector's
  health check; `subscribeConsumer` catches like producers do.
- **Rollout order:** publish `utils` → bump + publish `connectors` → update +
  publish `shared` → bump `aham` and `notify`.

## 14. Open questions

Resolved:

- Composer name is **`resilient`**; strategy stays **`jitter`**;
  `trips`/`retryable` **may be async** on both.
- **The new `retry` replaces utils' current one** — old implementation
  deleted, every caller migrates.
- **`connectors`' `CircuitBreaker` is removed**; this class takes the name
  `CircuitBreaker` (`circuit-breaker.ts`) and is used everywhere.
- **Retry defaults:** `attempts: 1` (retry is opt-in), backoff `exponential`,
  `min: 10`, `max: 3_000`.
- **No separate `base`:** `min` is the starting wait and the floor.

- **Import path:** everything under `@rniverse/utils/resilience`; the old
  `@rniverse/utils/retry` subpath is removed.
- **`sleep`** stays in `generic.ts` (replaced in place), not in `resilience/`.
- **Breaker defaults** `threshold: 5`, `cooldown: 30_000` — kept as proposed
  (not revisited).

Nothing open for this module.
