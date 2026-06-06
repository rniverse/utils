import { AsyncLocalStorage } from 'node:async_hooks';
export type TRequestContext = {
    requestId?: string;
    userId?: string;
    [key: string]: any;
};
export declare class RequestContext {
    private cxt;
    constructor();
    withRequestId(custom?: Record<string, any>): (_context?: any) => {
        requestId: any;
    };
    run<T>(store: TRequestContext, fn: () => T): T;
    setUserId(userId: string): void;
    setRequestContext(key: string, value: any): void;
    getRequestId(): string | null;
    getUserId(): string | null;
    getContextValue(key: string): any;
    getContext(): AsyncLocalStorage<TRequestContext>;
}
export declare const cxt$req: RequestContext;
export declare const runWithContext: <T>(fn: () => T, custom?: Record<string, any>) => T;
//# sourceMappingURL=req.context.d.ts.map