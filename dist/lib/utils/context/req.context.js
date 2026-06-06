import { AsyncLocalStorage } from 'node:async_hooks';
import { uuid } from '../id';
export class RequestContext {
    cxt;
    constructor() {
        this.cxt = new AsyncLocalStorage();
    }
    // For Elysia .derive() — enterWith is correct here because
    // Elysia has already established the async context for the request
    withRequestId(custom) {
        return (_context) => {
            const requestId = custom?.requestId ?? uuid.generate();
            const store = { requestId, ...(custom ?? {}) };
            this.cxt.enterWith(store);
            return { requestId };
        };
    }
    // For scripts/workers — run() gives proper isolation
    run(store, fn) {
        return this.cxt.run(store, fn);
    }
    // setUserId/setRequestContext are fine with enterWith
    // as long as they're called inside an established context
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
        return this.cxt.getStore()?.requestId ?? null;
    }
    getUserId() {
        return this.cxt.getStore()?.userId ?? null;
    }
    getContextValue(key) {
        return this.cxt.getStore()?.[key] ?? null;
    }
    getContext() {
        return this.cxt;
    }
}
export const cxt$req = new RequestContext();
export const runWithContext = (fn, custom) => {
    const requestId = custom?.requestId ?? uuid.generate();
    return cxt$req.run({ requestId, ...(custom ?? {}) }, fn);
};
//# sourceMappingURL=req.context.js.map