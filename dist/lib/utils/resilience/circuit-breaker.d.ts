import type { BreakerOptions, BreakerState } from '../../type/resilience.type.js';
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
    private failures;
    /** null while closed; otherwise when a trial becomes allowed. */
    private openUntil;
    /** When the circuit left closed — for `on.close`'s `since`. */
    private leftClosedAt;
    private trial;
    private readonly threshold;
    private readonly cooldown;
    private readonly trips;
    private readonly on;
    constructor(options?: BreakerOptions);
    get state(): BreakerState;
    reset(): void;
    run<T>(work: () => Promise<T>, options?: {
        signal?: AbortSignal;
    }): Promise<T>;
    /**
     * Let a call through or throw `CircuitOpenError`. Returns the trial token
     * when this call is the half-open trial, `null` for a normal closed call.
     */
    private __admit;
    private __record;
    private __open;
    /** Free a trial slot this call held, without changing state. */
    private __release;
}
//# sourceMappingURL=circuit-breaker.d.ts.map