import { sleep } from '../generic.js';
import { nonNegative, settle } from './errors.js';
const DEFAULT_BACKOFF = {
    strategy: 'exponential',
    min: 10,
    max: 3_000,
};
/**
 * Call `work`; on an outcome `retryable` accepts, wait and call again, up to
 * `attempts` in total. Returns or rethrows the last outcome unchanged. A caller
 * abort stops immediately (mid-wait included) and never reaches `retryable`.
 */
export async function retry(work, options = {}) {
    const requested = options.attempts ?? 1;
    if (Number.isNaN(requested)) {
        throw new RangeError('retry: attempts must be a number, got NaN');
    }
    // Below 1 means one attempt; `Infinity` means retry until success or abort.
    const attempts = Math.max(1, Math.floor(requested));
    const backoff = { ...DEFAULT_BACKOFF, ...options.backoff };
    nonNegative(backoff.min, 'retry: backoff.min');
    nonNegative(backoff.max, 'retry: backoff.max');
    if (backoff.min > backoff.max) {
        throw new RangeError(`retry: backoff.min (${backoff.min}) must be <= backoff.max (${backoff.max})`);
    }
    const retryable = options.retryable ?? ((result) => !result.ok);
    const { signal } = options;
    const startedAt = Date.now();
    for (let attempt = 1;; attempt++) {
        signal?.throwIfAborted();
        const result = await __attempt(work, attempt, signal);
        if (signal?.aborted)
            throw signal.reason;
        if (attempt >= attempts)
            return settle(result);
        const context = {
            attempt,
            attempts,
            delay: __delay(backoff, attempt),
            elapsed: Date.now() - startedAt,
        };
        if (!(await retryable(result, context)))
            return settle(result);
        options.on?.retry?.({ ...context, result });
        await sleep(context.delay, { signal });
    }
}
/** One call to `work` with its own signal, linked to the caller's. */
async function __attempt(work, attempt, signal) {
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
        return {
            ok: true,
            data: await work({ attempt, signal: controller.signal }),
        };
    }
    catch (error) {
        return { ok: false, error };
    }
    finally {
        signal?.removeEventListener('abort', onAbort);
    }
}
/** Wait after attempt `n` fails, clamped to `[min, max]`. */
function __delay({ strategy, min, max }, attempt) {
    if (strategy === 'fixed')
        return min;
    // Exponent capped so a huge attempt number can't overflow to Infinity/NaN.
    const exponential = Math.min(max, min * 2 ** Math.min(attempt - 1, 52));
    if (strategy === 'exponential')
        return exponential;
    return Math.round(min + Math.random() * (exponential - min));
}
//# sourceMappingURL=retry.js.map