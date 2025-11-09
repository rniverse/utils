import lodash from 'lodash';
const isNil = lodash.isNil;
export const cleanup = (obj, clear = isNil) => {
    // Perform cleanup operations on the object nestedly in place
    if (isNil(obj))
        return obj;
    if (Array.isArray(obj)) {
        return obj.map((item) => cleanup(item, clear));
    }
    if (typeof obj === 'object') {
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
export const pickOne = (obj, keys, df) => {
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    for (const key of keys) {
        const value = lodash.get(obj, key);
        if (isNil(value)) {
            continue;
        }
        return value;
    }
    return df;
};
export const templated = (template, input) => {
    const result = {};
    for (const [key, config] of Object.entries(template)) {
        let value;
        if (isNil(config)) {
            value = undefined;
        }
        else {
            if (config.hardcode !== undefined) {
                value = config.hardcode;
            }
            else if (config.getters?.length) {
                value = _.pickOne(input, config.getters, undefined);
            }
            else if (config.now) {
                value = new Date().toISOString();
            }
            if (_.isNil(value))
                value = config.default ?? value;
        }
        _.set(result, key, value);
    }
    // return _.cleanup(result);
    return result;
};
export const titleCase = (str) => {
    return _.startCase(_.camelCase(str));
};
// Create a new object with lodash methods plus cleanup
export const _ = Object.assign({}, lodash, {
    cleanup,
    pickOne,
    templated,
    titleCase
});
//# sourceMappingURL=lodash.js.map