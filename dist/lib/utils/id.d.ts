import { randomUUIDv7 } from "bun";
import { decodeTime, ulid as generateULID, monotonicFactory as ulidFactory } from "ulid";
export declare const uuid: {
    generate: typeof randomUUIDv7;
    extractTime: (uuid: string) => number;
};
export declare const ulid: {
    generate: typeof generateULID;
    extractTime: typeof decodeTime;
    ulidFactory: typeof ulidFactory;
};
//# sourceMappingURL=id.d.ts.map