import lodash from "lodash";

const isNil = lodash.isNil;
export const cleanup = (
	obj: any,
	clear: (value: any) => boolean = isNil,
): any => {
	// Perform cleanup operations on the object nestedly in place
	if (isNil(obj)) return obj;
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
		}, {} as any);
	}
	return obj;
};

// Create a new object with lodash methods plus cleanup
export const _ = Object.assign({}, lodash, { cleanup });
