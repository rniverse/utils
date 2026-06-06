import { AsyncLocalStorage } from 'node:async_hooks';
import { uuid } from '../id';

export type TRequestContext = {
	requestId?: string;
	userId?: string;
	[key: string]: any;
};

export class RequestContext {
	private cxt: AsyncLocalStorage<TRequestContext>;

	constructor() {
		this.cxt = new AsyncLocalStorage<TRequestContext>();
	}

	// For Elysia .derive() — enterWith is correct here because
	// Elysia has already established the async context for the request
	withRequestId(custom?: Record<string, any>) {
		return (_context?: any) => {
			const requestId = custom?.requestId ?? uuid.generate();
			const store = { requestId, ...(custom ?? {}) };
			this.cxt.enterWith(store);
			return { requestId };
		};
	}

	// For scripts/workers — run() gives proper isolation
	run<T>(store: TRequestContext, fn: () => T): T {
		return this.cxt.run(store, fn);
	}

	// setUserId/setRequestContext are fine with enterWith
	// as long as they're called inside an established context
	setUserId(userId: string) {
		const store = this.cxt.getStore();
		if (store) {
			this.cxt.enterWith({ ...store, userId });
		}
	}

	setRequestContext(key: string, value: any) {
		const store = this.cxt.getStore();
		if (store) {
			this.cxt.enterWith({ ...store, [key]: value });
		}
	}

	getRequestId(): string | null {
		return this.cxt.getStore()?.requestId ?? null;
	}

	getUserId(): string | null {
		return this.cxt.getStore()?.userId ?? null;
	}

	getContextValue(key: string): any {
		return this.cxt.getStore()?.[key] ?? null;
	}

	getContext(): AsyncLocalStorage<TRequestContext> {
		return this.cxt;
	}
}

export const cxt$req = new RequestContext();

export const runWithContext = <T>(
	fn: () => T,
	custom?: Record<string, any>,
): T => {
	const requestId = custom?.requestId ?? uuid.generate();
	return cxt$req.run({ requestId, ...(custom ?? {}) }, fn as any);
};
