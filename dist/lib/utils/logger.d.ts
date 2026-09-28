import type { LoggerOptions } from '../type/logger.type.js';
export type { LoggerOptions } from '../type/logger.type.js';
/**
 * A pino logger. Every option falls back to its env var, then a built-in
 * default — env is read when this is called, so `log` (created at import)
 * sees the env as it was then.
 */
export declare const createLogger: (options?: LoggerOptions) => import("pino").Logger<"log", boolean>;
export declare const log: import("pino").Logger<"log", boolean>;
//# sourceMappingURL=logger.d.ts.map