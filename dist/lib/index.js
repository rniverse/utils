export * from './type/index.js';
export * from './utils/index.js';
// NOTE: `./patch` (String.prototype.fmt) is intentionally NOT re-exported here —
// it mutates a global. Import `@rniverse/utils/patch` explicitly to enable it.
// The side-effect-free `fmt()` is available from the root.
//# sourceMappingURL=index.js.map