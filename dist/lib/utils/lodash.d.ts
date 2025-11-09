import type { TemplateConfig, TObject } from '@type';
import lodash from 'lodash';
export declare const cleanup: (obj: any, clear?: (value: any) => boolean) => any;
export declare const pickOne: <T>(obj: T, keys: string[] | string, df?: T[keyof T]) => any;
export declare const templated: (template: {
    [key: string]: TemplateConfig;
}, input: TObject) => TObject;
export declare const titleCase: (str: string) => string;
export declare const _: lodash.LoDashStatic & {
    cleanup: (obj: any, clear?: (value: any) => boolean) => any;
    pickOne: <T>(obj: T, keys: string[] | string, df?: T[keyof T]) => any;
    templated: (template: {
        [key: string]: TemplateConfig;
    }, input: TObject) => TObject;
    titleCase: (str: string) => string;
};
//# sourceMappingURL=lodash.d.ts.map