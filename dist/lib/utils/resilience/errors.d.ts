import type { Outcome } from '../../type/resilience.type.js';
/** Thrown by `timeout` when `work` outlives its limit. */
export declare class TimeoutError extends Error {
    readonly ms: number;
    constructor(ms: number);
}
/** Thrown by `CircuitBreaker.run` while the circuit refuses calls. */
export declare class CircuitOpenError extends Error {
    /** ms until another call is permitted — not a `Retry-After` value (seconds). */
    readonly remaining: number;
    constructor(remaining: number);
}
/** Rejects a negative or `NaN` duration; `Infinity` passes. Internal. */
export declare function nonNegative(value: number, label: string): number;
/** Resolve a settled outcome back into a value or a throw, unchanged. Internal. */
export declare function settle<T>(result: Outcome<T>): T;
//# sourceMappingURL=errors.d.ts.map