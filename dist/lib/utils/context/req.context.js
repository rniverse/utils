import { AsyncLocalStorage } from 'node:async_hooks';
import { uuid } from '../id';
export class RequestContext {
	cxt;
	constructor() {
		this.cxt = new AsyncLocalStorage();
	}
	withRequestId(custom) {
		return (_context) => {
			const requestId = custom?.requestId ?? uuid.generate();
			const store = { requestId, ...(custom ?? {}) };
			this.cxt.enterWith(store);
			return { requestId };
		};
	}
	setUserId(userId) {
		const store = this.cxt.getStore();
		if (store) {
			this.cxt.enterWith({ ...store, userId });
		}
	}
	setRequestContext(key, value) {
		const store = this.cxt.getStore();
		if (store) {
			this.cxt.enterWith({ ...store, [key]: value });
		}
	}
	getRequestId() {
		const store = this.cxt.getStore();
		return store?.requestId ?? null;
	}
	getUserId() {
		const store = this.cxt.getStore();
		return store?.userId ?? null;
	}
	getContextValue(key, cxt) {
		const store = (cxt ?? this.cxt).getStore();
		return store ? store[key] : null;
	}
	getContext() {
		return this.cxt;
	}
}
export const cxt$req = new RequestContext();
//# sourceMappingURL=req.context.js.map
