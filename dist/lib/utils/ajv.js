import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import addKeywords from 'ajv-keywords';
import { log } from './logger';
const _ajv = addFormats(addKeywords(new Ajv({
    allErrors: true,
    logger: log,
})));
export const ajv = _ajv;
//# sourceMappingURL=ajv.js.map