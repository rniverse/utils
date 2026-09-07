import { AsyncLocalStorage } from 'node:async_hooks';
import { uuid } from '../id.js';
/**
 * Per-request (or per-job) ambient state, built on `AsyncLocalStorage.run()`.
 *
 * A store only exists inside `run()` / `bindFetch()`. `enterWith` is deliberately
 * not used — it has no scope exit and leaks across the async subtree. All
 * mutation (`set` / `patch`) edits the existing store in place, so it stays
 * consistent for any code holding a reference to it.
 */
export class RequestContext {
    als = new AsyncLocalStorage();
    /** The core primitive: run `fn` inside a fresh store. */
    run(store, fn) {
        return this.als.run(store, fn);
    }
    /**
     * Wrap a fetch-style handler so every invocation runs inside its own store.
     * `seed` may derive extra fields from the handler's arguments (e.g. an
     * inbound `x-request-id`). This is the correct integration point for
     * frameworks whose middleware can't wrap the whole request.
     *
     *   Bun.serve({ fetch: cxt$req.bindFetch(app.fetch) })
     */
    bindFetch(handler, seed) {
        return (...args) => {
            const store = {
                requestId: uuid.generate(),
                ...(seed?.(...args) ?? {}),
            };
            return this.als.run(store, () => handler(...args));
        };
    }
    /** The current store, or `undefined` outside any context. */
    store() {
        return this.als.getStore();
    }
    get(key) {
        return this.als.getStore()?.[key];
    }
    /** Set one field on the current store, in place. No-op outside a context. */
    set(key, value) {
        const store = this.als.getStore();
        if (store)
            store[key] = value;
    }
    /** Merge fields into the current store, in place. No-op outside a context. */
    patch(values) {
        const store = this.als.getStore();
        if (store)
            Object.assign(store, values);
    }
    requestId() {
        return this.als.getStore()?.requestId;
    }
    userId() {
        return this.als.getStore()?.userId;
    }
}
export const cxt$req = new RequestContext();
/** Run `fn` inside a fresh context — for scripts, workers, jobs. */
export const runWithContext = (fn, custom) => cxt$req.run({
    requestId: custom?.requestId ?? uuid.generate(),
    ...custom,
}, fn);
//# sourceMappingURL=req.context.js.map