export type TRequestContext = {
    requestId: string;
    userId?: string;
    [key: string]: unknown;
};
/**
 * Per-request (or per-job) ambient state, built on `AsyncLocalStorage.run()`.
 *
 * A store only exists inside `run()` / `bindFetch()`. `enterWith` is deliberately
 * not used — it has no scope exit and leaks across the async subtree. All
 * mutation (`set` / `patch`) edits the existing store in place, so it stays
 * consistent for any code holding a reference to it.
 */
export declare class RequestContext<S extends TRequestContext = TRequestContext> {
    private als;
    /** The core primitive: run `fn` inside a fresh store. */
    run<T>(store: S, fn: () => T): T;
    /**
     * Wrap a fetch-style handler so every invocation runs inside its own store.
     * `seed` may derive extra fields from the handler's arguments (e.g. an
     * inbound `x-request-id`). This is the correct integration point for
     * frameworks whose middleware can't wrap the whole request.
     *
     *   Bun.serve({ fetch: cxt$req.bindFetch(app.fetch) })
     */
    bindFetch<A extends unknown[], R>(handler: (...args: A) => R, seed?: (...args: A) => Partial<S> | undefined): (...args: A) => R;
    /** The current store, or `undefined` outside any context. */
    store(): S | undefined;
    get<K extends keyof S>(key: K): S[K] | undefined;
    /** Set one field on the current store, in place. No-op outside a context. */
    set<K extends keyof S>(key: K, value: S[K]): void;
    /** Merge fields into the current store, in place. No-op outside a context. */
    patch(values: Partial<S>): void;
    requestId(): string | undefined;
    userId(): string | undefined;
}
export declare const cxt$req: RequestContext<TRequestContext>;
/** Run `fn` inside a fresh context — for scripts, workers, jobs. */
export declare const runWithContext: <T>(fn: () => T, custom?: Partial<TRequestContext>) => T;
//# sourceMappingURL=req.context.d.ts.map