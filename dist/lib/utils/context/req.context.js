import { AsyncLocalStorage } from "node:async_hooks";
import { uuid } from "../id";
export const requestContext = new AsyncLocalStorage();
export const getRequestId = () => {
    return requestContext.getStore()?.requestId ?? null;
};
export const getUserId = () => {
    return requestContext.getStore()?.userId ?? null;
};
export const withRequestId = (custom) => {
    return () => {
        const requestId = uuid.generate();
        requestContext.enterWith({ requestId, ...(custom ?? {}) });
        return {};
    };
};
//# sourceMappingURL=req.context.js.map