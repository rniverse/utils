export type RetryOutcome<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: unknown;
};
export type RetryOptions<T> = {
    /** Total attempts, including the first. Default 3. */
    attempts?: number;
    /**
     * Milliseconds to wait before retry N (1-based: the wait before attempt 2 is
     * `delay(1)`). A number is used as-is for every retry. Default: linear
     * backoff `n => 1000 * n`.
     */
    delay?: number | ((attempt: number) => number);
    /**
     * Whether to retry given the last outcome. Default: retry only when `fn`
     * threw (`o => !o.ok`). Return `true` for a returned-but-unacceptable value
     * to keep going (e.g. a `{ ok: false }` health result).
     */
    retryIf?: (outcome: RetryOutcome<T>, attempt: number) => boolean;
    /** Called after each failed attempt that will be retried. */
    onRetry?: (outcome: RetryOutcome<T>, attempt: number, delayMs: number) => void;
};
/**
 * Run `fn`, retrying on a thrown error (or a caller-defined bad result) with
 * backoff.
 *
 * On exhaustion the last returned value is passed through as-is; a final thrown
 * error is re-thrown. So a `fn` that returns `{ ok: false, error }` rather than
 * throwing will have that object returned after the last attempt.
 */
export declare function retry<T>(fn: () => T | Promise<T>, options?: RetryOptions<T>): Promise<T>;
//# sourceMappingURL=retry.d.ts.map