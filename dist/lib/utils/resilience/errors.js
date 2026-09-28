/** Thrown by `timeout` when `work` outlives its limit. */
export class TimeoutError extends Error {
    ms;
    constructor(ms) {
        super(`Timed out after ${ms}ms`);
        this.name = 'TimeoutError';
        this.ms = ms;
    }
}
/** Thrown by `CircuitBreaker.run` while the circuit refuses calls. */
export class CircuitOpenError extends Error {
    /** ms until another call is permitted — not a `Retry-After` value (seconds). */
    remaining;
    constructor(remaining) {
        super(`Circuit open — next call permitted in ${remaining}ms`);
        this.name = 'CircuitOpenError';
        this.remaining = remaining;
    }
}
/** Rejects a negative or `NaN` duration; `Infinity` passes. Internal. */
export function nonNegative(value, label) {
    if (Number.isNaN(value) || value < 0) {
        throw new RangeError(`${label} must be >= 0, got ${value}`);
    }
    return value;
}
/** Resolve a settled outcome back into a value or a throw, unchanged. Internal. */
export function settle(result) {
    if (result.ok)
        return result.data;
    throw result.error;
}
//# sourceMappingURL=errors.js.map