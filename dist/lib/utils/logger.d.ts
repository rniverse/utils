import type { AsyncLocalStorage } from 'node:async_hooks';
import { type TRequestContext } from './context';
export declare const createLogger: (
	context?: AsyncLocalStorage<TRequestContext>,
	_from?: string,
) => import('pino').Logger<'log', boolean>;
export declare const log: import('pino').Logger<'log', boolean>;
//# sourceMappingURL=logger.d.ts.map
