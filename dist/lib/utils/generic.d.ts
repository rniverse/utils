export declare const safeParseInt: (value: unknown, fallback?: number, radix?: number) => number;
export declare const boundedParseInt: (value: unknown, { min, max, fallback, }: {
    min?: number;
    max?: number;
    fallback?: number;
}) => number;
export declare const sleep: (ms: number) => Promise<void>;
export declare const isBun: () => string | false;
//# sourceMappingURL=generic.d.ts.map