// lib/utils/request.ts
//
// A small JSON HTTP client for service-to-service calls. Every outbound request
// carries the current request context (requestId / userId) as headers, so a
// chain A -> B -> C shares one requestId. An explicit header always wins.

import { cxt$req, type TRequestContext } from './context';
import { type Outcome, retry, timeout } from './resilience';

// ── Trace propagation ─────────────────────────────────────────────────

const REQUEST_ID = 'x-request-id';
const USER_ID = 'x-user-id';
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

export const trace$ = {
	REQUEST_ID,
	USER_ID,

	/** The trace headers for the current context — usable with any client. */
	headers(): Record<string, string> {
		const out: Record<string, string> = {};
		const reqId = cxt$req.requestId();
		const userId = cxt$req.userId();
		if (reqId) out[REQUEST_ID] = reqId;
		if (userId) out[USER_ID] = userId;
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
	seed(req: Request): Partial<TRequestContext> | undefined {
		const inbound = req.headers.get(REQUEST_ID)?.trim();
		if (inbound && SAFE_ID.test(inbound)) return { requestId: inbound };
		return undefined;
	},
};

// ── Client ────────────────────────────────────────────────────────────

export class HttpError extends Error {
	readonly status: number;
	readonly body: unknown;

	constructor(response: Response, body: unknown) {
		super(`${response.status} ${response.statusText} — ${response.url}`);
		this.name = 'HttpError';
		this.status = response.status;
		this.body = body;
	}
}

type HeaderMap = Record<string, string>;
type Query = Record<string, string | number | boolean | null | undefined>;
type RawBody = string | Blob | FormData | URLSearchParams | ReadableStream;

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

const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);

function __url(
	path: string,
	base: string | undefined,
	query: Query | undefined,
): string {
	const url = base ? new URL(path, base) : new URL(path);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== null && value !== undefined) {
			url.searchParams.set(key, String(value));
		}
	}
	return url.toString();
}

/** Fold header layers into one map; later layers win, every name lower-cased. */
function __merge(...layers: (HeaderMap | undefined)[]): HeaderMap {
	const map: HeaderMap = {};
	for (const layer of layers) {
		for (const [key, value] of Object.entries(layer ?? {})) {
			map[key.toLowerCase()] = value;
		}
	}
	return map;
}

function __isRaw(value: unknown): value is RawBody {
	return (
		typeof value === 'string' ||
		value instanceof URLSearchParams ||
		value instanceof FormData ||
		value instanceof Blob ||
		value instanceof ReadableStream
	);
}

/** Serialise the body and report the content-type it implies, if any. */
function __encode(value: unknown): { body?: RawBody; type?: string } {
	if (value === undefined || value === null) return {};
	if (__isRaw(value)) return { body: value };
	return { body: JSON.stringify(value), type: 'application/json' };
}

/** JSON when the response looks like JSON, otherwise text; empty -> undefined. */
async function __parse(response: Response): Promise<unknown> {
	if (response.status === 204 || response.status === 205) return undefined;
	const type = response.headers.get('content-type') ?? '';
	const text = await response.text();
	if (!text) return undefined;
	return type.includes('json') ? JSON.parse(text) : text;
}

/** Retry on a network error / timeout, or a 5xx response. */
function __transient(result: Outcome<Response>): boolean {
	if (!result.ok) return true;
	return result.data.status >= 500;
}

/** Waits between retries: 200ms, 400ms, 800ms, … capped at 2s. */
const BACKOFF = { strategy: 'exponential', min: 200, max: 2_000 } as const;

export type HttpClient = ReturnType<typeof http>;

export function http(config: ClientConfig = {}) {
	const propagate = config.propagate ?? true;

	/** One request, with retry. Returns the raw Response, even for a 4xx/5xx. */
	async function send(
		method: string,
		path: string,
		options: RequestConfig = {},
	): Promise<Response> {
		const url = __url(path, config.baseURL, options.query);
		const headers = __merge(config.headers, options.headers);

		if (propagate) {
			for (const [key, value] of Object.entries(trace$.headers())) {
				if (key in headers) continue; // an explicit header wins
				headers[key] = value;
			}
		}

		const carriesBody = method !== 'GET' && method !== 'HEAD';
		const encoded = __encode(carriesBody ? options.body : undefined);
		if (encoded.type && !headers['content-type']) {
			headers['content-type'] = encoded.type;
		}

		const call = (signal: AbortSignal): Promise<Response> =>
			(config.fetch ?? fetch)(url, {
				method,
				headers,
				body: encoded.body,
				signal,
			});
		const limit = options.timeout ?? config.timeout ?? 0;

		const retries =
			options.retries ?? (IDEMPOTENT.has(method) ? (config.retries ?? 2) : 0);

		// Each attempt gets its own timeout; a caller abort stops everything and
		// is never retried.
		return retry(({ signal }) => timeout(call, limit, { signal }), {
			attempts: Math.max(0, retries) + 1,
			backoff: BACKOFF,
			retryable: __transient,
			signal: options.signal,
		});
	}

	/** A request whose body is parsed; throws `HttpError` on a non-2xx. */
	async function request<T>(
		method: string,
		path: string,
		options?: RequestConfig,
	): Promise<T> {
		const response = await send(method, path, options);
		const body = await __parse(response);
		if (!response.ok) throw new HttpError(response, body);
		return body as T;
	}

	return {
		send,
		get: <T = unknown>(path: string, options?: RequestConfig) =>
			request<T>('GET', path, options),
		post: <T = unknown>(path: string, options?: RequestConfig) =>
			request<T>('POST', path, options),
		put: <T = unknown>(path: string, options?: RequestConfig) =>
			request<T>('PUT', path, options),
		patch: <T = unknown>(path: string, options?: RequestConfig) =>
			request<T>('PATCH', path, options),
		delete: <T = unknown>(path: string, options?: RequestConfig) =>
			request<T>('DELETE', path, options),
	};
}
