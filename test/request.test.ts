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

describe('http — backoff', () => {
	const failing = () => stub(() => json({}, 503));

	test('the default waits 200ms then 400ms between the 3 attempts of a GET', async () => {
		const { fetch, calls } = failing();
		const svc = http({ baseURL: 'http://b', fetch });
		const started = Date.now();
		await svc.get('/x').catch(() => {});
		expect(calls).toHaveLength(3);
		expect(Date.now() - started).toBeGreaterThanOrEqual(550);
	});

	test('a client backoff replaces the default', async () => {
		const { fetch, calls } = failing();
		const svc = http({
			baseURL: 'http://b',
			fetch,
			backoff: { strategy: 'fixed', min: 0, max: 0 },
		});
		const started = Date.now();
		await svc.get('/x').catch(() => {});
		expect(calls).toHaveLength(3);
		expect(Date.now() - started).toBeLessThan(150);
	});

	test('a per-call backoff overrides the client one', async () => {
		const { fetch } = failing();
		const svc = http({
			baseURL: 'http://b',
			fetch,
			backoff: { strategy: 'fixed', min: 0, max: 0 },
		});
		const started = Date.now();
		await svc.get('/x', { backoff: { min: 60, max: 60 } }).catch(() => {});
		expect(Date.now() - started).toBeGreaterThanOrEqual(110);
		expect(Date.now() - started).toBeLessThan(400); // not the 200+400 default
	});

	test('a partial backoff keeps the other default fields', async () => {
		const { fetch, calls } = failing();
		// only min changes: still exponential, still capped at 2s → waits 5, 10
		const svc = http({ baseURL: 'http://b', fetch, backoff: { min: 5 } });
		const started = Date.now();
		await svc.get('/x').catch(() => {});
		expect(calls).toHaveLength(3);
		expect(Date.now() - started).toBeLessThan(150);
	});

	test('an invalid backoff rejects with RangeError', async () => {
		const { fetch } = failing();
		const svc = http({ baseURL: 'http://b', fetch, backoff: { max: 50 } });
		// default min 200 > max 50
		await expect(svc.get('/x')).rejects.toBeInstanceOf(RangeError);
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

describe('trace$.seed — SAFE_REQUEST_ID_REGEX', () => {
	const withEnv = (value: string | undefined, fn: () => void) => {
		const previous = process.env.SAFE_REQUEST_ID_REGEX;
		if (value === undefined) delete process.env.SAFE_REQUEST_ID_REGEX;
		else process.env.SAFE_REQUEST_ID_REGEX = value;
		try {
			fn();
		} finally {
			if (previous === undefined) delete process.env.SAFE_REQUEST_ID_REGEX;
			else process.env.SAFE_REQUEST_ID_REGEX = previous;
		}
	};
	const inbound = (id: string) =>
		new Request('http://x/', { headers: { 'x-request-id': id } });

	test('default pattern: adopts a safe id, ignores an unsafe one', () => {
		withEnv(undefined, () => {
			expect(trace$.seed(inbound('abc-123'))).toEqual({ requestId: 'abc-123' });
			expect(trace$.seed(inbound('bad id!'))).toBeUndefined();
		});
	});

	test('the env var replaces the pattern', () => {
		withEnv('^req_[0-9]+$', () => {
			expect(trace$.seed(inbound('req_42'))).toEqual({ requestId: 'req_42' });
			expect(trace$.seed(inbound('abc-123'))).toBeUndefined();
		});
	});

	test('an invalid pattern throws, naming the env var', () => {
		withEnv('([unclosed', () => {
			expect(() => trace$.seed(inbound('x'))).toThrow('SAFE_REQUEST_ID_REGEX');
		});
	});
});

describe('http — bodies sent as-is (files, binary)', () => {
	const cases: Array<[string, () => unknown]> = [
		[
			'FormData with a File',
			() => {
				const form = new FormData();
				form.append(
					'upload',
					new File(['hello'], 'a.txt', { type: 'text/plain' }),
				);
				return form;
			},
		],
		['File', () => new File(['hello'], 'a.txt')],
		['Blob', () => new Blob(['hello'])],
		['Uint8Array', () => new Uint8Array([1, 2, 3])],
		['Buffer', () => Buffer.from('hello')],
		['ArrayBuffer', () => new Uint8Array([1, 2, 3]).buffer],
		['URLSearchParams', () => new URLSearchParams({ a: '1' })],
	];

	for (const [name, make] of cases) {
		test(`${name}: passed through unchanged, no JSON content-type`, async () => {
			const body = make();
			const { fetch, calls } = stub(() => json({ ok: true }));
			await http({ baseURL: 'http://b', fetch }).post('/upload', { body });
			expect(calls[0]?.body).toBe(body);
			expect(calls[0]?.headers['content-type']).not.toBe('application/json');
		});
	}

	test('a plain object is still JSON-encoded', async () => {
		const { fetch, calls } = stub(() => json({ ok: true }));
		await http({ baseURL: 'http://b', fetch }).post('/x', { body: { a: 1 } });
		expect(calls[0]?.body).toBe('{"a":1}');
		expect(calls[0]?.headers['content-type']).toBe('application/json');
	});
});

describe('http — retryable', () => {
	const tooMany = () => {
		let n = 0;
		return stub(() => (++n < 2 ? json({}, 429) : json({ ok: true })));
	};
	const fast = { strategy: 'fixed', min: 0, max: 0 } as const;

	test('a 429 is not retried by default', async () => {
		const { fetch, calls } = tooMany();
		await http({ baseURL: 'http://b', fetch, backoff: fast })
			.get('/x')
			.catch(() => {});
		expect(calls).toHaveLength(1);
	});

	test('a client retryable can add 429', async () => {
		const { fetch, calls } = tooMany();
		const svc = http({
			baseURL: 'http://b',
			fetch,
			backoff: fast,
			retryable: (result) =>
				!result.ok || result.data.status >= 500 || result.data.status === 429,
		});
		expect(await svc.get<{ ok: boolean }>('/x')).toEqual({ ok: true });
		expect(calls).toHaveLength(2);
	});

	test('a per-call retryable overrides the client one', async () => {
		const { fetch, calls } = stub(() => json({}, 503));
		const svc = http({ baseURL: 'http://b', fetch, backoff: fast });
		await svc.get('/x', { retryable: () => false }).catch(() => {});
		expect(calls).toHaveLength(1);
	});

	test('retryable does not make a POST retry — retries still decides that', async () => {
		const { fetch, calls } = stub(() => json({}, 503));
		const svc = http({
			baseURL: 'http://b',
			fetch,
			backoff: fast,
			retryable: () => true,
		});
		await svc.post('/x', { body: {} }).catch(() => {});
		expect(calls).toHaveLength(1);
	});
});
