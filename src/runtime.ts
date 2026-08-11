// Runtime-only ESSTR entry: the five methods only. capabilities/install/
// benchmark are pruned by the bundler's tree-shaking. Used for per-eval
// injection: a smaller vendor instead of the full one.
export { trim, trimLeft, trimRight, trimStart, trimEnd, clearMemo } from './string-core';
