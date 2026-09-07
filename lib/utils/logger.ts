import { pino } from 'pino';
import pretty from 'pino-pretty';
import { cxt$req } from './context';
import { environment } from './env';

// Pretty + synchronous output is for local dev and tests only — in production it
// blocks the event loop per line and pino-pretty is not built for it. Elsewhere
// we emit newline-delimited JSON (pino's default) and let the platform render it.
const usePretty =
	environment.get('NODE_ENV') === 'test' ||
	environment.get('LOG_PRETTY') === 'true' ||
	Boolean(process.stdout?.isTTY);

// A `log` level between debug (20) and info (30) — call it via `log.log(...)`.
const customLevels = { log: 25 };

const lf = (key: string, label?: string) =>
	`{if ${key}}${label ?? key}:{${key}} - {end}`;
const mlf = (keys: string[]) =>
	keys
		.map((k) => {
			const [key, label] = k.split(',');
			return lf(key ?? k, label ?? k);
		})
		.join('');

// Keep secrets out of the logs even when a whole request / user / config object
// is passed. `*.x` matches one level deep; add explicit paths for anything deeper.
const redactPaths = [
	'password',
	'*.password',
	'hash',
	'*.hash',
	'token',
	'*.token',
	'accessToken',
	'*.accessToken',
	'refreshToken',
	'*.refreshToken',
	'secret',
	'*.secret',
	'authorization',
	'*.authorization',
	'headers.cookie',
	'*.headers.cookie',
];

const baseOptions = {
	level: environment.get('LOG_LEVEL', 'info'),
	customLevels,
	redact: { paths: redactPaths, censor: '***' },
	mixin() {
		return {
			reqId: cxt$req.get('requestId'),
			userId: cxt$req.get('userId'),
		};
	},
};

const prettyStream = () =>
	pretty({
		colorize: true,
		translateTime: 'yyyy-mm-dd HH:MM:ss l',
		sync: true,
		customLevels: 'log:25',
		messageFormat: `${mlf(['reqId', 'userId'])}{msg}`,
		ignore: 'reqId,userId,pid,hostname',
	});

export const createLogger = () =>
	usePretty ? pino(baseOptions, prettyStream()) : pino(baseOptions);

export const log = createLogger();
