// lib/patch/string.patch.ts
//
// Opt-in ONLY. This module mutates String.prototype and is deliberately kept
// out of the package's root barrel — reach it via `@rniverse/utils/patch`.
// Prefer the standalone `fmt()` (exported from the package root) for new code.
import { fmt } from '../utils/fmt.js';
export { fmt };
String.prototype.fmt = function (...args) {
    return fmt(this.toString(), ...args);
};
//# sourceMappingURL=string.patch.js.map