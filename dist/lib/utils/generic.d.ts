import type { SleepOptions } from '../type/generic.type.js';
export type { SleepOptions } from '../type/generic.type.js';
export declare const safeParseInt: (value: unknown, fallback?: number, radix?: number) => number;
export declare const boundedParseInt: (value: unknown, { min, max, fallback, }: {
    min?: number;
    max?: number;
    fallback?: number;
}) => number;
export declare const MAX_TIMER_MS = 2147483647;
/**
 * Wait `ms`, or until `signal` aborts (rejects with `signal.reason`). The
 * timer is always cleared. `0` resolves on the next tick; `Infinity` waits
 * until aborted. Negative, `NaN`, or over-`MAX_TIMER_MS` rejects with
 * `RangeError` — a negative wait is always a bug, never "no wait".
 */
export declare const sleep: (ms: number, options?: SleepOptions) => Promise<void>;
export declare const isBun: () => boolean;
//# sourceMappingURL=generic.d.ts.map