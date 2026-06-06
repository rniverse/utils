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
/** Pad a string to the given length with leading zeros */
export const getCode = (str, length = 10) => str.padStart(length, '0');
/** Format a raw bigint sequence value according to options */
const formatSeq = (seq, { prefix, type, length = 10, radix = 36 } = {}) => {
    let code = seq;
    if (type === 'code')
        code = getCode(seq.toString(radix), length);
    if (prefix)
        code = `${prefix}-${code}`;
    return code.toString();
};
// ── Sync ────────────────────────────────────────────────
const createSeqGeneratorSync = () => {
    let code = 0n;
    return () => ++code;
};
const getSeqSync = (options) => {
    const nextSeq = createSeqGeneratorSync();
    return () => formatSeq(nextSeq(), options);
};
// ── Async (concurrency-safe) ────────────────────────────
const createSeqGenerator = () => {
    let code = 0n;
    let lock = Promise.resolve();
    return async () => {
        await lock;
        let resolve = () => { };
        lock = new Promise((r) => {
            resolve = r;
            return r;
        });
        try {
            return ++code;
        }
        finally {
            resolve();
        }
    };
};
const getSeq = (options) => {
    const nextSeq = createSeqGenerator();
    return async () => formatSeq(await nextSeq(), options);
};
// ── Public API ──────────────────────────────────────────
/** Synchronous sequence generators — for startup-time code generation */
export const sync$seq = {
    next: {
        seq: createSeqGeneratorSync,
        code: (prefix) => getSeqSync({ prefix, type: 'code' }),
    },
    get: getSeqSync,
};
/** Async sequence generators — for runtime ID generation with concurrency safety */
export const async$seq = {
    next: {
        seq: createSeqGenerator,
        code: (prefix) => getSeq({ prefix, type: 'code' }),
    },
    get: getSeq,
};
//# sourceMappingURL=seq.js.map