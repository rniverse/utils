export declare const fmt: (template: string, ...args: any[]) => string;
declare global {
    interface String {
        fmt(...args: any[]): string;
    }
}
//# sourceMappingURL=string.patch.d.ts.map