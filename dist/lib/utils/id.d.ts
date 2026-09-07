import { decodeTime, ulid as generateULID, monotonicFactory as ulidFactory } from 'ulid';
import { v7 } from 'uuid';
declare const extractTimeFromUUIDv7: (uuid: string) => number;
export declare const uuid: {
    generate: typeof v7;
    extractTime: typeof extractTimeFromUUIDv7;
};
export declare const ulid: {
    generate: typeof generateULID;
    extractTime: typeof decodeTime;
    ulidFactory: typeof ulidFactory;
};
export {};
//# sourceMappingURL=id.d.ts.map