import { pino } from 'pino';
import pretty from 'pino-pretty';
import { cxt$req } from './context';
// Create a pretty print stream that works synchronously
const lf = (key, label) => `{if ${key}}${label ?? key}:{${key}} - {end}`;
const mlf = (keys) => keys
    .map((k) => {
    const [key, label] = k.split(',');
    return lf(key ?? k, label ?? k);
})
    .join('');
const stream = pretty({
    colorize: true,
    translateTime: 'yyyy-mm-dd HH:MM:ss l',
    sync: true, // Synchronous mode for tests
    // messageFormat: (log: any, messageKey, label) => {
    //   // console.log("Log message format:", log, messageKey, x);
    //   console.log("Log message format:", log.level, log);
    // 	return `[${label}] ${log.rid ? `[rid:${log.rid}] ` : ""}${log[messageKey]}`;
    // },
    messageFormat: `${mlf(['reqId', 'userId'])}{msg}`,
    ignore: 'reqId,userId,pid,hostname',
});
export const createLogger = () => {
    // console.log(`is context same ?`, context === cxt$req.getContext());
    return pino({
        level: process.env.LOG_LEVEL || 'info',
        mixin() {
            const [reqId, userId] = ['requestId', 'userId'].map((key) => {
                return cxt$req.getContextValue(key);
            });
            return { reqId, userId };
        },
        customLevels: {
            log: 25,
        },
    }, stream);
};
export const log = createLogger();
//# sourceMappingURL=logger.js.map