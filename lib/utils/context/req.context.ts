import { AsyncLocalStorage } from 'node:async_hooks';
import { uuid } from '../id';

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
export class RequestContext<S extends TRequestContext = TRequestContext> {
	private als = new AsyncLocalStorage<S>();

	/** The core primitive: run `fn` inside a fresh store. */
	run<T>(store: S, fn: () => T): T {
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
	bindFetch<A extends unknown[], R>(
		handler: (...args: A) => R,
		seed?: (...args: A) => Partial<S> | undefined,
	): (...args: A) => R {
		return (...args: A): R => {
			const store = {
				requestId: uuid.generate(),
				...(seed?.(...args) ?? {}),
			} as S;
			return this.als.run(store, () => handler(...args));
		};
	}

	/** The current store, or `undefined` outside any context. */
	store(): S | undefined {
		return this.als.getStore();
	}

	get<K extends keyof S>(key: K): S[K] | undefined {
		return this.als.getStore()?.[key];
	}

	/** Set one field on the current store, in place. No-op outside a context. */
	set<K extends keyof S>(key: K, value: S[K]): void {
		const store = this.als.getStore();
		if (store) store[key] = value;
	}

	/** Merge fields into the current store, in place. No-op outside a context. */
	patch(values: Partial<S>): void {
		const store = this.als.getStore();
		if (store) Object.assign(store, values);
	}

	requestId(): string | undefined {
		return this.als.getStore()?.requestId;
	}

	userId(): string | undefined {
		return this.als.getStore()?.userId;
	}
}

export const cxt$req = new RequestContext();

/** Run `fn` inside a fresh context — for scripts, workers, jobs. */
export const runWithContext = <T>(
	fn: () => T,
	custom?: Partial<TRequestContext>,
): T =>
	cxt$req.run(
		{
			requestId: custom?.requestId ?? uuid.generate(),
			...custom,
		} as TRequestContext,
		fn,
	);
