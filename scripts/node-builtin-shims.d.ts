// This repo has no @types/node (see scripts/search-balance.ts, which shims
// `process` locally rather than depending on it). scripts/verify-play-base.ts
// is the first script that needs node:fs/node:path, so declare just the
// surface it uses. This file has no top-level import/export, so these
// `declare module` blocks create ambient modules instead of augmenting ones
// TypeScript can't otherwise resolve.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function existsSync(path: string): boolean;
}

declare module "node:path" {
  export function resolve(...parts: string[]): string;
}
