import { decodeTime, ulid as generateULID, monotonicFactory as ulidFactory, } from 'ulid';
import { v7 } from 'uuid';
const extractTimeFromUUIDv7 = (uuid) => {
    // split the UUID into its components
    const parts = uuid.split('-');
    // the second part of the UUID contains the high bits of the timestamp (48 bits in total)
    const highBitsHex = (parts[0] ?? '') + (parts[1]?.slice(0, 4) ?? '');
    // convert the high bits from hex to decimal
    // the UUID v7 timestamp is the number of milliseconds since Unix epoch (January 1, 1970)
    const timestampInMilliseconds = parseInt(highBitsHex, 16);
    // convert the timestamp to a Date object
    return timestampInMilliseconds;
};
export const uuid = {
    generate: v7,
    extractTime: extractTimeFromUUIDv7,
};
export const ulid = {
    generate: generateULID,
    extractTime: decodeTime,
    ulidFactory,
};
//# sourceMappingURL=id.js.map