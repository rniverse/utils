/**
 * Run `work`, rejecting with `TimeoutError` after `ms` and aborting the signal
 * `work` received. Bounds the caller's wait, not the work's lifetime: work that
 * ignores the signal keeps running in the background.
 *
 * `0` or `Infinity` means no limit. A caller `signal` aborting first aborts the
 * work too and rejects with the caller's reason.
 */
export declare function timeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number, options?: {
    signal?: AbortSignal;
}): Promise<T>;
//# sourceMappingURL=timeout.d.ts.map