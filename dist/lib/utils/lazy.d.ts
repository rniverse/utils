import type { Lazy } from '../type/generic.type.js';
export type { Lazy } from '../type/generic.type.js';
/**
 * Load a value once; every `get()` while the load is in flight shares it. A
 * successful load is cached until `reset()`; a failed one is not, so the next
 * `get()` loads again. No caller signal reaches `load` — one caller giving up
 * must not cancel the shared load (wrap your own wait in `timeout` instead).
 */
export declare function lazy<T>(load: () => Promise<T>): Lazy<T>;
//# sourceMappingURL=lazy.d.ts.map