import { MAX_TIMER_MS } from '../generic.js';
import { nonNegative, TimeoutError } from './errors.js';
/**
 * Run `work`, rejecting with `TimeoutError` after `ms` and aborting the signal
 * `work` received. Bounds the caller's wait, not the work's lifetime: work that
 * ignores the signal keeps running in the background.
 *
 * `0` or `Infinity` means no limit. A caller `signal` aborting first aborts the
 * work too and rejects with the caller's reason.
 */
export async function timeout(work, ms, options = {}) {
    nonNegative(ms, 'timeout: ms');
    const limited = ms > 0 && ms !== Number.POSITIVE_INFINITY;
    if (limited && ms > MAX_TIMER_MS) {
        throw new RangeError(`timeout: ms must be <= ${MAX_TIMER_MS}, got ${ms}`);
    }
    const { signal: outer } = options;
    outer?.throwIfAborted();
    const controller = new AbortController();
    return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
            clearTimeout(timer);
            outer?.removeEventListener('abort', onAbort);
        };
        const onAbort = () => {
            cleanup();
            controller.abort(outer?.reason);
            reject(outer?.reason);
        };
        outer?.addEventListener('abort', onAbort, { once: true });
        if (limited) {
            timer = setTimeout(() => {
                cleanup();
                const error = new TimeoutError(ms);
                controller.abort(error);
                reject(error);
            }, ms);
        }
        // `.then(work)` so a synchronous throw inside `work` becomes a rejection.
        Promise.resolve()
            .then(() => work(controller.signal))
            .then((value) => {
            cleanup();
            resolve(value);
        }, (error) => {
            cleanup();
            reject(error);
        });
    });
}
//# sourceMappingURL=timeout.js.map