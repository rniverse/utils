// lib/utils/request.ts
//
// A small JSON HTTP client for service-to-service calls. Every outbound request
// carries the current request context (requestId / userId) as headers, so a
// chain A -> B -> C shares one requestId. An explicit header always wins.
import { cxt$req } from './context/index.js';
import { retry } from './retry.js';
// ── Trace propagation ─────────────────────────────────────────────────
const REQUEST_ID = 'x-request-id';
const USER_ID = 'x-user-id';
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;
export const trace$ = {
    REQUEST_ID,
    USER_ID,
    /** The trace headers for the current context — usable with any client. */
    headers() {
        const out = {};
        const reqId = cxt$req.requestId();
        const userId = cxt$req.userId();
        if (reqId)
            out[REQUEST_ID] = reqId;
        if (userId)
            out[USER_ID] = userId;
        return out;
    },
    /**
     * The context to adopt from an inbound request — pass to
     * `cxt$req.bindFetch(handler, trace$.seed)`.
     *
     * Only the correlation id is read off the wire. `x-user-id` is ignored on
     * purpose: identity is set by auth once the token is verified, never from a
     * header the caller controls.
     */
    seed(req) {
        const inbound = req.headers.get(REQUEST_ID)?.trim();
        if (inbound && SAFE_ID.test(inbound))
            return { requestId: inbound };
        return undefined;
    },
};
// ── Client ────────────────────────────────────────────────────────────
export class HttpError extends Error {
    status;
    body;
    constructor(response, body) {
        super(`${response.status} ${response.statusText} — ${response.url}`);
        this.name = 'HttpError';
        this.status = response.status;
        this.body = body;
    }
}
const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
function __url(path, base, query) {
    const url = base ? new URL(path, base) : new URL(path);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}
/** Fold header layers into one map; later layers win, every name lower-cased. */
function __merge(...layers) {
    const map = {};
    for (const layer of layers) {
        for (const [key, value] of Object.entries(layer ?? {})) {
            map[key.toLowerCase()] = value;
        }
    }
    return map;
}
function __isRaw(value) {
    return (typeof value === 'string' ||
        value instanceof URLSearchParams ||
        value instanceof FormData ||
        value instanceof Blob ||
        value instanceof ReadableStream);
}
/** Serialise the body and report the content-type it implies, if any. */
function __encode(value) {
    if (value === undefined || value === null)
        return {};
    if (__isRaw(value))
        return { body: value };
    return { body: JSON.stringify(value), type: 'application/json' };
}
/** The caller's abort signal (if any) combined with a timeout deadline. */
function __abort(timeout, caller) {
    if (!timeout || timeout <= 0)
        return caller;
    const deadline = AbortSignal.timeout(timeout);
    return caller ? AbortSignal.any([caller, deadline]) : deadline;
}
/** JSON when the response looks like JSON, otherwise text; empty -> undefined. */
async function __parse(response) {
    if (response.status === 204 || response.status === 205)
        return undefined;
    const type = response.headers.get('content-type') ?? '';
    const text = await response.text();
    if (!text)
        return undefined;
    return type.includes('json') ? JSON.parse(text) : text;
}
function __transient(outcome) {
    if (!outcome.ok)
        return true; // network error or abort
    return outcome.value.status >= 500;
}
/** Exponential backoff before retry N: 200ms, 400ms, 800ms, … capped at 2s. */
function __backoff(attempt) {
    return Math.min(200 * 2 ** (attempt - 1), 2000);
}
export function http(config = {}) {
    const propagate = config.propagate ?? true;
    /** One request, with retry. Returns the raw Response, even for a 4xx/5xx. */
    async function send(method, path, options = {}) {
        const url = __url(path, config.baseURL, options.query);
        const headers = __merge(config.headers, options.headers);
        if (propagate) {
            for (const [key, value] of Object.entries(trace$.headers())) {
                if (key in headers)
                    continue; // an explicit header wins
                headers[key] = value;
            }
        }
        const carriesBody = method !== 'GET' && method !== 'HEAD';
        const encoded = __encode(carriesBody ? options.body : undefined);
        if (encoded.type && !headers['content-type']) {
            headers['content-type'] = encoded.type;
        }
        const attempt = () => (config.fetch ?? fetch)(url, {
            method,
            headers,
            body: encoded.body,
            signal: __abort(options.timeout ?? config.timeout, options.signal),
        });
        const retries = options.retries ?? (IDEMPOTENT.has(method) ? (config.retries ?? 2) : 0);
        if (retries <= 0)
            return attempt();
        return retry(attempt, {
            attempts: retries + 1,
            delay: __backoff,
            retryIf: __transient,
        });
    }
    /** A request whose body is parsed; throws `HttpError` on a non-2xx. */
    async function request(method, path, options) {
        const response = await send(method, path, options);
        const body = await __parse(response);
        if (!response.ok)
            throw new HttpError(response, body);
        return body;
    }
    return {
        send,
        get: (path, options) => request('GET', path, options),
        post: (path, options) => request('POST', path, options),
        put: (path, options) => request('PUT', path, options),
        patch: (path, options) => request('PATCH', path, options),
        delete: (path, options) => request('DELETE', path, options),
    };
}
//# sourceMappingURL=request.js.map