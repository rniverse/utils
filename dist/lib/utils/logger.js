import { getRequestId, getUserId } from "@utils/context";
import { pino } from "pino";
import pretty from "pino-pretty";
// Create a pretty print stream that works synchronously
const lf = (key) => `{if ${key}}${key}:{${key}} - {end}`;
const mlf = (keys) => keys.map(lf).join("");
const stream = pretty({
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM:ss.l o",
    sync: true, // Synchronous mode for tests
    // messageFormat: (log: any, messageKey, label) => {
    //   // console.log("Log message format:", log, messageKey, x);
    //   console.log("Log message format:", log.level, log);
    // 	return `[${label}] ${log.rid ? `[rid:${log.rid}] ` : ""}${log[messageKey]}`;
    // },
    messageFormat: `${mlf(["rid"])}{msg}`,
    ignore: "rid,uid,pid,hostname",
});
export const log = pino({
    level: process.env.LOG_LEVEL || "info",
    mixin() {
        const rid = getRequestId();
        const uid = getUserId();
        return { rid, uid };
    },
}, stream);
//# sourceMappingURL=logger.js.map