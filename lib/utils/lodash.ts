import type { TemplateConfig, TObject } from '@type';
// import lodash from 'lodash';
import * as lodash from 'es-toolkit/compat';
import * as eskit from 'es-toolkit';

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
	if (typeof obj === 'object') {
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

export const pickOne = <T>(
	obj: T,
	keys: string[] | string,
	df?: T[keyof T],
): any => {
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

export const templated = (
	template: { [key: string]: TemplateConfig },
	input: TObject,
) => {
	const result: TObject = {};

	for (const [key, config] of Object.entries(template)) {
		let value: any;
		if (isNil(config)) {
			value = undefined;
		} else {
			if (config.hardcode !== undefined) {
				value = config.hardcode;
			} else if (config.getters?.length) {
				value = _.pickOne(input, config.getters, undefined);
			} else if (config.now) {
				value = new Date().toISOString();
			}
			if (_.isNil(value)) value = config.default ?? value;
		}
		lodash.set(result, key, value);
	}
	// return _.cleanup(result);
	return result;
};

export const titleCase = (str: string): string => {
	return _.startCase(_.camelCase(str));
};

// Create a new object with lodash methods plus cleanup
export const _ = Object.assign({}, {
	get: lodash.get,
	set: lodash.set,
	has: lodash.has,
}, eskit, {
	cleanup,
	pickOne,
	templated,
	titleCase
});
