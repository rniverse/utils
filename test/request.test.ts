import { describe, expect, test } from 'bun:test';
import { cxt$req } from '@utils/context';
import { HttpError, http, trace$ } from '@utils/request';

type Call = {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: unknown;
};

/** A fetch stand-in that records every call and replies from `reply`. */
function stub(reply: (call: Call) => Response | Promise<Response>) {
	const calls: Call[] = [];
	const impl = (async (input: string | URL, init: RequestInit = {}) => {
		const headers: Record<string, string> = {};
		new Headers(init.headers).forEach((value, key) => {
			headers[key] = value;
		});
		const call: Call = {
			url: String(input),
			method: init.method ?? 'GET',
			headers,
			body: init.body,
		};
		calls.push(call);
		return reply(call);
	}) as unknown as typeof fetch;
	return { fetch: impl, calls };
}

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

describe('trace$', () => {
	test('headers() mirrors the current store', () => {
		expect(trace$.headers()).toEqual({});
		cxt$req.run({ requestId: 'r-1', userId: 'u-1' }, () => {
			expect(trace$.headers()).toEqual({
				'x-request-id': 'r-1',
				'x-user-id': 'u-1',
			});
		});
	});

	test('seed() takes a safe x-request-id and ignores x-user-id', () => {
		const req = new Request('http://svc/x', {
			headers: { 'x-request-id': 'abc-123', 'x-user-id': 'attacker' },
		});
		expect(trace$.seed(req)).toEqual({ requestId: 'abc-123' });
	});

	test('seed() rejects an unsafe or missing id', () => {
		const spaced = new Request('http://svc/x', {
			headers: { 'x-request-id': 'has spaces' },
		});
		const tooLong = new Request('http://svc/x', {
			headers: { 'x-request-id': 'a'.repeat(129) },
		});
		expect(trace$.seed(spaced)).toBeUndefined();
		expect(trace$.seed(tooLong)).toBeUndefined();
		expect(trace$.seed(new Request('http://svc/x'))).toBeUndefined();
	});
});

describe('http — propagation', () => {
	test('adds the trace headers to an outbound call', async () => {
		const { fetch, calls } = stub(() => json({ ok: true }));
		const svc = http({ baseURL: 'http://b', fetch });

		await cxt$req.run({ requestId: 'r-9', userId: 'u-9' }, () =>
			svc.get('/thing'),
		);

		const call = calls[0];
		expect(call?.url).toBe('http://b/thing');
		expect(call?.headers['x-request-id']).toBe('r-9');
		expect(call?.headers['x-user-id']).toBe('u-9');
	});

	test('an explicit header wins over the context', async () => {
		const { fetch, calls } = stub(() => json({}));
		const svc = http({ baseURL: 'http://b', fetch });
		await cxt$req.run({ requestId: 'r-ctx' }, () =>
			svc.get('/x', { headers: { 'x-request-id': 'r-manual' } }),
		);
		expect(calls[0]?.headers['x-request-id']).toBe('r-manual');
	});

	test('propagate:false keeps the trace headers off external calls', async () => {
		const { fetch, calls } = stub(() => json({}));
		const google = http({ baseURL: 'http://google', fetch, propagate: false });
		await cxt$req.run({ requestId: 'r', userId: 'u' }, () => google.get('/x'));
		expect(calls[0]?.headers['x-request-id']).toBeUndefined();
		expect(calls[0]?.headers['x-user-id']).toBeUndefined();
	});
});

describe('http — JSON in / out', () => {
	test('serialises a plain object body and parses the reply', async () => {
		const { fetch, calls } = stub((call) =>
			json({ echo: JSON.parse(String(call.body)) }),
		);
		const svc = http({ baseURL: 'http://b', fetch });
		const out = await svc.post('/x', { body: { a: 1 } });
		expect(calls[0]?.headers['content-type']).toBe('application/json');
		expect(out).toEqual({ echo: { a: 1 } });
	});

	test('a string body is sent as-is with no content-type added', async () => {
		const { fetch, calls } = stub(() => json({}));
		const svc = http({ baseURL: 'http://b', fetch });
		await svc.post('/x', { body: 'raw' });
		expect(calls[0]?.body).toBe('raw');
		expect(calls[0]?.headers['content-type']).toBeUndefined();
	});

	test('204 resolves to undefined', async () => {
		const { fetch } = stub(() => new Response(null, { status: 204 }));
		const svc = http({ baseURL: 'http://b', fetch });
		expect(await svc.delete('/x')).toBeUndefined();
	});

	test('query params are appended', async () => {
		const { fetch, calls } = stub(() => json({}));
		const svc = http({ baseURL: 'http://b', fetch });
		await svc.get('/search', { query: { q: 'hi', page: 2, skip: undefined } });
		expect(calls[0]?.url).toBe('http://b/search?q=hi&page=2');
	});

	test('non-2xx throws HttpError carrying the parsed body', async () => {
		const { fetch } = stub(() => json({ error: 'nope' }, 422));
		const svc = http({ baseURL: 'http://b', fetch });
		const error = (await svc.get('/x').catch((e) => e)) as HttpError;
		expect(error).toBeInstanceOf(HttpError);
		expect(error.status).toBe(422);
		expect(error.body).toEqual({ error: 'nope' });
	});

	test('send() returns the raw Response, even on a 4xx', async () => {
		const { fetch } = stub(() => json({}, 404));
		const svc = http({ baseURL: 'http://b', fetch });
		const response = await svc.send('GET', '/missing');
		expect(response.status).toBe(404);
	});
});

describe('http — retry', () => {
	test('a GET retries on 5xx, then succeeds', async () => {
		let n = 0;
		const { fetch, calls } = stub(() =>
			++n < 3 ? json({}, 503) : json({ ok: true }),
		);
		const svc = http({ baseURL: 'http://b', fetch });
		const out = await svc.get<{ ok: boolean }>('/x');
		expect(out).toEqual({ ok: true });
		expect(calls).toHaveLength(3);
	});

	test('a POST is not retried by default', async () => {
		const { fetch, calls } = stub(() => json({}, 503));
		const svc = http({ baseURL: 'http://b', fetch });
		await svc.post('/x', { body: {} }).catch(() => {});
		expect(calls).toHaveLength(1);
	});

	test('retries:0 disables retry for a GET', async () => {
		const { fetch, calls } = stub(() => json({}, 500));
		const svc = http({ baseURL: 'http://b', fetch, retries: 0 });
		await svc.get('/x').catch(() => {});
		expect(calls).toHaveLength(1);
	});

	test('a per-call retries opts a POST in', async () => {
		let n = 0;
		const { fetch, calls } = stub(() =>
			++n < 2 ? json({}, 502) : json({ ok: true }),
		);
		const svc = http({ baseURL: 'http://b', fetch });
		const out = await svc.post<{ ok: boolean }>('/x', { body: {}, retries: 3 });
		expect(out).toEqual({ ok: true });
		expect(calls).toHaveLength(2);
	});
});

describe('http — timeout', () => {
	test('aborts a slow request', async () => {
		const { fetch } = stub(
			() =>
				new Promise<Response>((_resolve, reject) => {
					setTimeout(
						() => reject(new DOMException('aborted', 'AbortError')),
						20,
					);
				}),
		);
		const svc = http({ baseURL: 'http://b', fetch, retries: 0 });
		await expect(svc.get('/slow', { timeout: 10 })).rejects.toThrow();
	});
});
