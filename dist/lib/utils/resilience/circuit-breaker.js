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
    failures = 0;
    /** null while closed; otherwise when a trial becomes allowed. */
    openUntil = null;
    /** When the circuit left closed — for `on.close`'s `since`. */
    leftClosedAt = null;
    trial = null;
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
    reset() {
        this.failures = 0;
        this.openUntil = null;
        this.leftClosedAt = null;
        this.trial = null;
    }
    async run(work, options = {}) {
        const { signal } = options;
        signal?.throwIfAborted();
        // Everything up to the first `await` runs without interleaving — this is
        // what makes claiming the single trial slot race-free.
        const token = this.__admit();
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
            this.__release(token);
            throw result.error;
        }
        let failed;
        try {
            failed = await this.trips(result);
        }
        catch (error) {
            this.__release(token);
            throw error;
        }
        this.__record(failed, token);
        return settle(result);
    }
    /**
     * Let a call through or throw `CircuitOpenError`. Returns the trial token
     * when this call is the half-open trial, `null` for a normal closed call.
     */
    __admit() {
        if (this.openUntil === null)
            return null;
        const now = Date.now();
        // A trial still running a full cooldown after it started is stuck (hung,
        // non-abortable work): count it as failed and reopen, so it can't hold
        // the slot forever. Its late outcome is ignored — the token won't match.
        if (this.trial && now - this.trial.startedAt >= this.cooldown) {
            this.failures++;
            this.__open(now);
        }
        if (now < this.openUntil)
            throw new CircuitOpenError(this.openUntil - now);
        if (this.trial) {
            const expiresIn = this.trial.startedAt + this.cooldown - now;
            throw new CircuitOpenError(Math.max(0, expiresIn));
        }
        const token = Symbol('trial');
        this.trial = { startedAt: now, token };
        const openedAt = this.openUntil - this.cooldown;
        this.on.trial?.({ since: now - openedAt });
        return token;
    }
    __record(failed, token) {
        const now = Date.now();
        if (token) {
            if (this.trial?.token !== token)
                return; // expired trial — ignore
            this.trial = null;
            if (failed) {
                this.failures++;
                this.__open(now);
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
            this.failures = 0;
            return;
        }
        this.failures++;
        if (this.failures >= this.threshold)
            this.__open(now);
    }
    __open(now) {
        this.trial = null;
        this.openUntil = now + this.cooldown;
        this.leftClosedAt ??= now;
        this.on.open?.({ failures: this.failures, cooldown: this.cooldown });
    }
    /** Free a trial slot this call held, without changing state. */
    __release(token) {
        if (token && this.trial?.token === token)
            this.trial = null;
    }
}
//# sourceMappingURL=circuit-breaker.js.map