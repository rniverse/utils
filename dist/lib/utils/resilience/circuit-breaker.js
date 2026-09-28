import { CircuitOpenError, nonNegative, settle } from './errors.js';
/**
 * Fails fast once a dependency keeps failing. Closed: calls go through,
 * consecutive counted failures are tallied. Open: calls are refused with
 * `CircuitOpenError` without touching the dependency. After `cooldown`,
 * half-open: exactly one trial call decides — success closes, failure reopens.
 *
 * No timers: state is derived from timestamps on access. One instance per
 * dependency, per process.
 */
export class CircuitBreaker {
    /** Consecutive counted failures (closed only). */
    count = 0;
    /** null while closed; otherwise when a trial becomes allowed. */
    openUntil = null;
    /** When the current open period started — for `on.trial`'s `since`. */
    openedAt = null;
    /** When the circuit left closed — for `on.close`'s `since`. */
    leftClosedAt = null;
    /** The trial call in flight, if any. */
    probe = null;
    threshold;
    cooldown;
    trips;
    on;
    constructor(options = {}) {
        const threshold = options.threshold ?? 5;
        if (!Number.isInteger(threshold) || threshold < 1) {
            throw new RangeError(`CircuitBreaker: threshold must be an integer >= 1, got ${threshold}`);
        }
        this.threshold = threshold;
        this.cooldown = nonNegative(options.cooldown ?? 30_000, 'CircuitBreaker: cooldown');
        this.trips = options.trips ?? ((result) => !result.ok);
        this.on = options.on ?? {};
    }
    get state() {
        if (this.openUntil === null)
            return 'closed';
        return Date.now() < this.openUntil ? 'open' : 'half-open';
    }
    /** Consecutive counted failures so far. */
    get failures() {
        return this.count;
    }
    /**
     * ms until another call is permitted: `0` when closed or when a trial may
     * start now; while open, time left in the cooldown; while a trial runs, time
     * until that trial would be treated as stuck. Read-only — for admin screens
     * and metrics.
     */
    get remaining() {
        return this.__remaining({ now: Date.now() });
    }
    /** Force the circuit closed — normal traffic resumes, counts cleared. */
    reset() {
        this.count = 0;
        this.openUntil = null;
        this.openedAt = null;
        this.leftClosedAt = null;
        this.probe = null;
    }
    /**
     * Trip the circuit by hand — planned maintenance, a known outage, a kill
     * switch. Refuses calls for `ms` (default: `cooldown`), then allows a trial
     * as usual. Fires `on.open`. Any trial in flight is abandoned (its late
     * outcome is ignored).
     */
    open(options = {}) {
        const ms = nonNegative(options.ms ?? this.cooldown, 'CircuitBreaker.open: ms');
        this.__open({ now: Date.now(), ms });
    }
    run(work, options = {}) {
        return this.__call(work, { ...options, early: false });
    }
    /**
     * Run `work` as the trial call now, without waiting out the rest of the
     * cooldown — e.g. an admin "check now", or right after the dependency was
     * redeployed. Same rules as the automatic trial: success closes the circuit,
     * failure reopens it with a fresh cooldown, and only one trial runs at a
     * time (a second concurrent one gets `CircuitOpenError`). While closed it's
     * just a normal call.
     */
    trial(work, options = {}) {
        return this.__call(work, { ...options, early: true });
    }
    async __call(work, options) {
        const { signal, early } = options;
        signal?.throwIfAborted();
        // Everything up to the first `await` runs without interleaving — this is
        // what makes claiming the single trial slot race-free.
        const token = this.__admit({ early });
        let result;
        try {
            result = { ok: true, data: await work() };
        }
        catch (error) {
            result = { ok: false, error };
        }
        // A caller abort is not the dependency's fault: release a trial slot
        // without deciding anything, and don't count it.
        if (signal?.aborted && !result.ok) {
            this.__release({ token });
            throw result.error;
        }
        let failed;
        try {
            failed = await this.trips(result);
        }
        catch (error) {
            this.__release({ token });
            throw error;
        }
        this.__record({ failed, token });
        return settle(result);
    }
    /**
     * Let a call through or throw `CircuitOpenError`. Returns the trial token
     * when this call is the half-open trial, `null` for a normal closed call.
     * `early` (from `trial()`) skips the cooldown wait — nothing else.
     */
    __admit(options) {
        if (this.openUntil === null)
            return null;
        const now = Date.now();
        // A trial still running a full cooldown after it started is stuck (hung,
        // non-abortable work): count it as failed and reopen, so it can't hold
        // the slot forever. Its late outcome is ignored — the token won't match.
        if (this.probe && now - this.probe.startedAt >= this.cooldown) {
            this.count++;
            this.__open({ now, ms: this.cooldown });
        }
        const waiting = !options.early && now < (this.openUntil ?? now);
        if (waiting || this.probe) {
            throw new CircuitOpenError(this.__remaining({ now }));
        }
        const token = Symbol('trial');
        this.probe = { startedAt: now, token };
        this.on.trial?.({ since: now - (this.openedAt ?? now) });
        return token;
    }
    __record(options) {
        const { failed, token } = options;
        const now = Date.now();
        if (token) {
            if (this.probe?.token !== token)
                return; // expired trial — ignore
            this.probe = null;
            if (failed) {
                this.count++;
                this.__open({ now, ms: this.cooldown });
                return;
            }
            const since = now - (this.leftClosedAt ?? now);
            this.reset();
            this.on.close?.({ since });
            return;
        }
        // A normal call that finished after the circuit opened under it changes
        // nothing: only a trial decides once the circuit has left closed.
        if (this.openUntil !== null)
            return;
        if (!failed) {
            this.count = 0;
            return;
        }
        this.count++;
        if (this.count >= this.threshold) {
            this.__open({ now, ms: this.cooldown });
        }
    }
    __open(options) {
        const { now, ms } = options;
        this.probe = null;
        this.openedAt = now;
        this.openUntil = now + ms;
        this.leftClosedAt ??= now;
        this.on.open?.({ failures: this.count, cooldown: ms });
    }
    __remaining(options) {
        const { now } = options;
        if (this.openUntil === null)
            return 0;
        if (this.probe) {
            return Math.max(0, this.probe.startedAt + this.cooldown - now);
        }
        return Math.max(0, this.openUntil - now);
    }
    /** Free a trial slot this call held, without changing state. */
    __release(options) {
        const { token } = options;
        if (token && this.probe?.token === token)
            this.probe = null;
    }
}
//# sourceMappingURL=circuit-breaker.js.map