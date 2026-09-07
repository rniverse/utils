import { type TRequestContext } from './context/index.js';
export declare const trace$: {
    REQUEST_ID: string;
    USER_ID: string;
    /** The trace headers for the current context — usable with any client. */
    headers(): Record<string, string>;
    /**
     * The context to adopt from an inbound request — pass to
     * `cxt$req.bindFetch(handler, trace$.seed)`.
     *
     * Only the correlation id is read off the wire. `x-user-id` is ignored on
     * purpose: identity is set by auth once the token is verified, never from a
     * header the caller controls.
     */
    seed(req: Request): Partial<TRequestContext> | undefined;
};
export declare class HttpError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(response: Response, body: unknown);
}
type HeaderMap = Record<string, string>;
type Query = Record<string, string | number | boolean | null | undefined>;
export type ClientConfig = {
    baseURL?: string;
    /** Sent on every request; a per-call header of the same name overrides it. */
    headers?: HeaderMap;
    /** Abort an attempt after this many ms. */
    timeout?: number;
    /**
     * Extra attempts for an idempotent call (GET/HEAD/PUT/DELETE/OPTIONS) that
     * hits a network error or a 5xx. Default 2. Other methods never retry unless
     * a per-call `retries` opts in.
     */
    retries?: number;
    /** Attach the trace headers to outbound requests. Default true. */
    propagate?: boolean;
    /** Swap the fetch implementation (tests, instrumentation). */
    fetch?: typeof fetch;
};
export type RequestConfig = {
    query?: Query;
    headers?: HeaderMap;
    body?: unknown;
    timeout?: number;
    retries?: number;
    signal?: AbortSignal;
};
export type HttpClient = ReturnType<typeof http>;
export declare function http(config?: ClientConfig): {
    send: (method: string, path: string, options?: RequestConfig) => Promise<Response>;
    get: <T = unknown>(path: string, options?: RequestConfig) => Promise<T>;
    post: <T = unknown>(path: string, options?: RequestConfig) => Promise<T>;
    put: <T = unknown>(path: string, options?: RequestConfig) => Promise<T>;
    patch: <T = unknown>(path: string, options?: RequestConfig) => Promise<T>;
    delete: <T = unknown>(path: string, options?: RequestConfig) => Promise<T>;
};
export {};
//# sourceMappingURL=request.d.ts.map