import lodash from "lodash";
const isNil = lodash.isNil;
export const cleanup = (obj, clear = isNil) => {
    // Perform cleanup operations on the object nestedly in place
    if (isNil(obj))
        return obj;
    if (Array.isArray(obj)) {
        return obj.map((item) => cleanup(item, clear));
    }
    if (typeof obj === "object") {
        return Object.keys(obj).reduce((acc, key) => {
            if (clear(obj[key])) {
                return acc;
            }
            acc[key] = cleanup(obj[key], clear);
            return acc;
        }, {});
    }
    return obj;
};
// Create a new object with lodash methods plus cleanup
export const _ = Object.assign({}, lodash, { cleanup });
//# sourceMappingURL=lodash.js.map