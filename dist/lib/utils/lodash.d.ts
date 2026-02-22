import type { TemplateConfig, TObject } from '@type';
import * as eskit from 'es-toolkit';
import * as lodash from 'es-toolkit/compat';
export declare const cleanup: (obj: any, clear?: (value: any) => boolean) => any;
export declare const pickOne: <T>(obj: T, keys: string[] | string, df?: T[keyof T]) => any;
export declare const templated: (template: {
    [key: string]: TemplateConfig;
}, input: TObject) => TObject;
export declare const titleCase: (str: string) => string;
export declare const _: {
    get: typeof lodash.get;
    set: typeof lodash.set;
    has: typeof lodash.has;
} & typeof eskit & {
    cleanup: (obj: any, clear?: (value: any) => boolean) => any;
    pickOne: <T>(obj: T, keys: string[] | string, df?: T[keyof T]) => any;
    templated: (template: {
        [key: string]: TemplateConfig;
    }, input: TObject) => TObject;
    titleCase: (str: string) => string;
};
//# sourceMappingURL=lodash.d.ts.map