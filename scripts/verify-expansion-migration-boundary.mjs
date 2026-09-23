import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

// Historical standalone RPCs must never ship alongside Nexus-owned saves.
const forbidden = /\b(?:get|put)_signal_breach_expansion_save\b/i;
function verifySql(sql, filename) {
  assert(!forbidden.test(sql), `${filename}: obsolete expansion-save RPC belongs in test fixtures, not release migrations.`);
}
for (const name of ["get_signal_breach_expansion_save", "put_signal_breach_expansion_save"]) {
  assert.throws(() => verifySql(`create function public.${name}()`, "regression.sql"), /obsolete expansion-save RPC/);
  assert.throws(() => verifySql(`CREATE OR REPLACE FUNCTION public.${name.toUpperCase()}()`, "regression.sql"), /obsolete expansion-save RPC/);
}
verifySql("create function public.record_score()", "allowed.sql");

const directory = new URL("../supabase/migrations/", import.meta.url);
for (const file of await readdir(directory)) {
  if (file.endsWith(".sql")) verifySql(await readFile(new URL(file, directory), "utf8"), file);
}
console.log("Release migrations exclude the obsolete standalone expansion-save RPCs.");
