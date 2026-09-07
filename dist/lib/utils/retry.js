// lib/utils/retry.ts
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Run `fn`, retrying on a thrown error (or a caller-defined bad result) with
 * backoff.
 *
 * On exhaustion the last returned value is passed through as-is; a final thrown
 * error is re-thrown. So a `fn` that returns `{ ok: false, error }` rather than
 * throwing will have that object returned after the last attempt.
 */
export async function retry(fn, options = {}) {
    const attempts = Math.max(1, options.attempts ?? 3);
    const delayFor = typeof options.delay === 'function'
        ? options.delay
        : (n) => options.delay ?? 1000 * n;
    const retryIf = options.retryIf ?? ((o) => !o.ok);
    let outcome = {
        ok: false,
        error: new Error('retry: fn never ran'),
    };
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            outcome = { ok: true, value: await fn() };
        }
        catch (error) {
            outcome = { ok: false, error };
        }
        const last = attempt === attempts;
        if (last || !retryIf(outcome, attempt))
            break;
        const delayMs = Math.max(0, delayFor(attempt));
        options.onRetry?.(outcome, attempt, delayMs);
        if (delayMs > 0)
            await wait(delayMs);
    }
    if (outcome.ok)
        return outcome.value;
    throw outcome.error;
}
//# sourceMappingURL=retry.js.map