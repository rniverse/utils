export * from './type';
export * from './utils';

// NOTE: `./patch` (String.prototype.fmt) is intentionally NOT re-exported here —
// it mutates a global. Import `@rniverse/utils/patch` explicitly to enable it.
// The side-effect-free `fmt()` is available from the root.
