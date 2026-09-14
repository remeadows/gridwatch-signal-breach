import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// No @types/node in this repo (see scripts/search-balance.ts for the same
// pattern); ./node-builtin-shims.d.ts declares the surface used here.
declare const process: Readonly<{
  cwd(): string;
}>;

// Guards the one-origin contract (Nexus spec §1): one build serves both at the
// old host root and behind the Nexus proxy at /play/breach/.
const dist = resolve(process.cwd(), "dist");
const indexPath = resolve(dist, "index.html");
const redirectsPath = resolve(dist, "_redirects");

if (!existsSync(indexPath)) throw new Error("dist/index.html missing — run `npm run build` first.");
const html = readFileSync(indexPath, "utf8");
const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
if (scriptSrcs.length === 0) throw new Error("dist/index.html has no <script src>.");
for (const src of scriptSrcs) {
  if (!src.startsWith("/play/breach/assets/")) throw new Error(`Script src is not base-aware: ${src}`);
}
const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
for (const href of cssHrefs) {
  if (!href.startsWith("/play/breach/assets/")) throw new Error(`Stylesheet href is not base-aware: ${href}`);
}
if (/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(html)) throw new Error("dist/index.html contains an inline script (games CSP forbids it).");
if (/<style[\s>]/.test(html)) throw new Error("dist/index.html contains an inline <style> (games CSP forbids it).");

if (!existsSync(redirectsPath)) throw new Error("dist/_redirects missing — public/_redirects must be copied by Vite.");
const redirects = readFileSync(redirectsPath, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
if (!redirects.includes("/play/breach/* /:splat 200")) {
  throw new Error(`dist/_redirects lacks the prefix rewrite. Found: ${JSON.stringify(redirects)}`);
}
const bareIndex = redirects.indexOf("/play/breach/ /index.html 200");
const splatIndex = redirects.indexOf("/play/breach/* /:splat 200");
if (bareIndex === -1) {
  throw new Error(`dist/_redirects lacks the explicit bare-prefix rule. Found: ${JSON.stringify(redirects)}`);
}
if (bareIndex >= splatIndex) {
  throw new Error("dist/_redirects must list the bare-prefix rule above the splat rule.");
}
console.log(`verify-play-base: ${scriptSrcs.length} script(s), ${cssHrefs.length} stylesheet(s) base-aware; _redirects rewrite present.`);
