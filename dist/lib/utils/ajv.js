import { Ajv } from 'ajv';
import { log } from './logger';
export const ajv = new Ajv({
	allErrors: true,
	discriminator: true,
	logger: log,
	keywords: require('ajv-keywords/dist/definitions')(),
	formats: require('ajv-formats/dist/formats'),
});
if (require && require.main === module) {
	const schema = {
		type: 'object',
		properties: {
			foo: { type: 'string', regexp: '/foo/i' },
			bar: { type: 'string', regexp: { pattern: 'bar', flags: 'i' } },
		},
		required: ['foo', 'bar'],
		additionalProperties: false,
	};
	const validate = ajv.compile(schema);
	const data = {
		foo: 'afoo',
		bar: 1,
	};
	const valid = validate(data);
	// if (!valid) console.log(validate.errors)
	const e1 = validate.errors;
	log.info({ valid, e1 });
	data.bar = 'aar';
	const valid2 = validate(data);
	const e2 = validate.errors;
	log.info({ valid: valid2, e2 });
	data.bar = 'bard';
	const valid3 = validate(data);
	const e3 = validate.errors;
	log.info({ valid: valid3, e3 });
	log.info({ e1, e2, e3 });
}
//# sourceMappingURL=ajv.js.map
