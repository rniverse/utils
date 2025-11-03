import { AsyncLocalStorage } from "node:async_hooks";
type RequestContext = {
    requestId: string;
    [key: string]: any;
};
export declare const requestContext: AsyncLocalStorage<RequestContext>;
export declare const getRequestId: () => string | null;
export declare const getUserId: () => string | null;
export declare const withRequestId: (custom?: Record<string, any>) => () => {};
export {};
//# sourceMappingURL=req.context.d.ts.map