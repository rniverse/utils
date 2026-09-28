import { pino } from 'pino';
import pretty from 'pino-pretty';
import { MASK_CENSOR } from '../enum/mask.enum.js';
import { cxt$req } from './context/index.js';
import { environment } from './env.js';
import { secrets } from './sanitize.js';
// Pretty + synchronous output is for local dev and tests only — in production it
// blocks the event loop per line and pino-pretty is not built for it. Elsewhere
// we emit newline-delimited JSON (pino's default) and let the platform render it.
const __pretty = () => environment.get('NODE_ENV') === 'test' ||
    environment.get('LOG_PRETTY') === 'true' ||
    Boolean(process.stdout?.isTTY);
// A `log` level between debug (20) and info (30) — call it via `log.log(...)`.
const customLevels = { log: 25 };
const lf = (key, label) => `{if ${key}}${label ?? key}:{${key}} - {end}`;
const mlf = (keys) => keys
    .map((k) => {
    const [key, label] = k.split(',');
    return lf(key ?? k, label ?? k);
})
    .join('');
// Keep secrets out of the logs even when a whole request / user / config object
// is passed: each prop is masked at the top level and up to two levels deep
// (`headers.cookie` inside `req` included).
const __paths = (props) => props.flatMap((prop) => [prop, `*.${prop}`, `*.*.${prop}`]);
const __stream = (destination) => pretty({
    colorize: !destination,
    translateTime: 'yyyy-mm-dd HH:MM:ss l',
    sync: true,
    customLevels: 'log:25',
    messageFormat: `${mlf(['reqId', 'userId'])}{msg}`,
    ignore: 'reqId,userId,pid,hostname',
    ...(destination ? { destination } : {}),
});
/**
 * A pino logger. Every option falls back to its env var, then a built-in
 * default — env is read when this is called, so `log` (created at import)
 * sees the env as it was then.
 */
export const createLogger = (options = {}) => {
    const settings = {
        level: options.level ?? environment.get('LOG_LEVEL', 'info'),
        customLevels,
        redact: {
            paths: __paths(options.redact ?? secrets()),
            censor: MASK_CENSOR,
        },
        mixin() {
            return {
                reqId: cxt$req.get('requestId'),
                userId: cxt$req.get('userId'),
            };
        },
    };
    const readable = options.pretty ?? __pretty();
    if (readable)
        return pino(settings, __stream(options.destination));
    return options.destination
        ? pino(settings, options.destination)
        : pino(settings);
};
export const log = createLogger();
//# sourceMappingURL=logger.js.map