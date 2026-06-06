/**
 * Sequential code / ID generator utility.
 *
 * Provides both sync and async variants for generating
 * sequential codes, counters, and prefixed IDs.
 *
 * @example Sync — startup-time generation (error codes, enum codes)
 * ```ts
 * const next_code = sync$seq.get({ type: 'code', length: 10 });
 * next_code(); // '0000000001'
 * next_code(); // '0000000002'
 * ```
 *
 * @example Sync — with prefix
 * ```ts
 * const next_err = sync$seq.get({ prefix: 'ERR', type: 'code', length: 10 });
 * next_err(); // 'ERR-0000000001'
 * ```
 *
 * @example Async — runtime ID generation with concurrency safety
 * ```ts
 * const next_id = async$seq.get({ prefix: 'TXN', type: 'code' });
 * await next_id(); // 'TXN-0000000001'
 * ```
 */

export interface SeqOptions {
	/** Optional prefix prepended with '-' separator */
	prefix?: string;
	/** 'code' for base-36 padded string output; omit for raw bigint-as-string */
	type?: string;
	/** Pad length for 'code' type (default: 10) */
	length?: number;
	/** Radix for 'code' type (default: 36) */
	radix?: number;
}

/** Pad a string to the given length with leading zeros */
export const getCode = (str: string, length = 10): string =>
	str.padStart(length, '0');

/** Format a raw bigint sequence value according to options */
const formatSeq = (
	seq: bigint,
	{ prefix, type, length = 10, radix = 36 }: SeqOptions = {},
): string => {
	let code: string | bigint = seq;
	if (type === 'code') code = getCode(seq.toString(radix), length);
	if (prefix) code = `${prefix}-${code}`;
	return code.toString();
};

// ── Sync ────────────────────────────────────────────────

const createSeqGeneratorSync = () => {
	let code = 0n;
	return () => ++code;
};

const getSeqSync = (options?: SeqOptions) => {
	const nextSeq = createSeqGeneratorSync();
	return () => formatSeq(nextSeq(), options);
};

// ── Async (concurrency-safe) ────────────────────────────

const createSeqGenerator = () => {
	let code = 0n;
	let lock = Promise.resolve();

	return async () => {
		await lock;
		let resolve: () => void = () => {};
		lock = new Promise<void>((r) => {
			resolve = r;
			return r;
		});
		try {
			return ++code;
		} finally {
			resolve();
		}
	};
};

const getSeq = (options?: SeqOptions) => {
	const nextSeq = createSeqGenerator();
	return async () => formatSeq(await nextSeq(), options);
};

// ── Public API ──────────────────────────────────────────

/** Synchronous sequence generators — for startup-time code generation */
export const sync$seq = {
	next: {
		seq: createSeqGeneratorSync,
		code: (prefix?: string) => getSeqSync({ prefix, type: 'code' }),
	},
	get: getSeqSync,
};

/** Async sequence generators — for runtime ID generation with concurrency safety */
export const async$seq = {
	next: {
		seq: createSeqGenerator,
		code: (prefix?: string) => getSeq({ prefix, type: 'code' }),
	},
	get: getSeq,
};
