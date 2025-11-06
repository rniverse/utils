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

	withRequestId(custom?: Record<string, any>) {
		return (_context?: any) => {
			const requestId = custom?.requestId ?? uuid.generate();
			const store = { requestId, ...(custom ?? {}) };
			this.cxt.enterWith(store);
			return { requestId };
		};
	}

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
		const store = this.cxt.getStore();
		return store?.requestId ?? null;
	}

	getUserId(): string | null {
		const store = this.cxt.getStore();
		return store?.userId ?? null;
	}

	getContextValue(key: string, cxt?: typeof this.cxt): any {
		const store = (cxt ?? this.cxt).getStore();
		return store ? store[key] : null;
	}

	getContext(): AsyncLocalStorage<TRequestContext> {
		return this.cxt;
	}
}

export const cxt$req = new RequestContext();
