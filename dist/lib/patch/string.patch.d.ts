import { fmt } from '../utils/fmt.js';
export { fmt };
declare global {
    interface String {
        fmt(...args: any[]): string;
    }
}
//# sourceMappingURL=string.patch.d.ts.map