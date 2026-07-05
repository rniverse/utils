import { decodeTime, ulid as generateULID, monotonicFactory as ulidFactory } from 'ulid';
import { v7 } from 'uuid';
export declare const uuid: {
    generate: typeof v7;
    extractTime: (uuid: string) => number;
};
export declare const ulid: {
    generate: typeof generateULID;
    extractTime: typeof decodeTime;
    ulidFactory: typeof ulidFactory;
};
//# sourceMappingURL=id.d.ts.map