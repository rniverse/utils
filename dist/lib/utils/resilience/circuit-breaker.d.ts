import type { BreakerOpenOptions, BreakerOptions, BreakerRunOptions, BreakerState } from '../../type/resilience.type.js';
/**
 * Fails fast once a dependency keeps failing. Closed: calls go through,
 * consecutive counted failures are tallied. Open: calls are refused with
 * `CircuitOpenError` without touching the dependency. After `cooldown`,
 * half-open: exactly one trial call decides — success closes, failure reopens.
 *
 * No timers: state is derived from timestamps on access. One instance per
 * dependency, per process.
 */
export declare class CircuitBreaker {
    /** Consecutive counted failures (closed only). */
    private count;
    /** null while closed; otherwise when a trial becomes allowed. */
    private openUntil;
    /** When the current open period started — for `on.trial`'s `since`. */
    private openedAt;
    /** When the circuit left closed — for `on.close`'s `since`. */
    private leftClosedAt;
    /** The trial call in flight, if any. */
    private probe;
    private readonly threshold;
    private readonly cooldown;
    private readonly trips;
    private readonly on;
    constructor(options?: BreakerOptions);
    get state(): BreakerState;
    /** Consecutive counted failures so far. */
    get failures(): number;
    /**
     * ms until another call is permitted: `0` when closed or when a trial may
     * start now; while open, time left in the cooldown; while a trial runs, time
     * until that trial would be treated as stuck. Read-only — for admin screens
     * and metrics.
     */
    get remaining(): number;
    /** Force the circuit closed — normal traffic resumes, counts cleared. */
    reset(): void;
    /**
     * Trip the circuit by hand — planned maintenance, a known outage, a kill
     * switch. Refuses calls for `ms` (default: `cooldown`), then allows a trial
     * as usual. Fires `on.open`. Any trial in flight is abandoned (its late
     * outcome is ignored).
     */
    open(options?: BreakerOpenOptions): void;
    run<T>(work: () => Promise<T>, options?: BreakerRunOptions): Promise<T>;
    /**
     * Run `work` as the trial call now, without waiting out the rest of the
     * cooldown — e.g. an admin "check now", or right after the dependency was
     * redeployed. Same rules as the automatic trial: success closes the circuit,
     * failure reopens it with a fresh cooldown, and only one trial runs at a
     * time (a second concurrent one gets `CircuitOpenError`). While closed it's
     * just a normal call.
     */
    trial<T>(work: () => Promise<T>, options?: BreakerRunOptions): Promise<T>;
    private __call;
    /**
     * Let a call through or throw `CircuitOpenError`. Returns the trial token
     * when this call is the half-open trial, `null` for a normal closed call.
     * `early` (from `trial()`) skips the cooldown wait — nothing else.
     */
    private __admit;
    private __record;
    private __open;
    private __remaining;
    /** Free a trial slot this call held, without changing state. */
    private __release;
}
//# sourceMappingURL=circuit-breaker.d.ts.map