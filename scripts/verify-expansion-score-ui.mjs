import { build } from "esbuild";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Minimal DOM port for lifecycle/identity regressions; layout is checked in a
// real local browser. No auth token, network or production persistence involved.
class Element {
  dataset = {};
  children = []; parent = null; listeners = new Map(); disabled = false; text = "";
  constructor(tag) { this.tagName = tag.toUpperCase(); }
  set textContent(value) { this.text = value; this.replaceChildren(); }
  get textContent() { return this.text + this.children.map((c) => c.textContent).join(""); }
  set innerHTML(value) { this.text = value; this.replaceChildren(); }
  setAttribute() {}
  append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } }
  replaceChildren(...items) {
    if (this.children.some((c) => c === document.activeElement || c.contains(document.activeElement))) document.activeElement = document.body;
    for (const c of this.children) c.parent = null;
    this.children = []; this.append(...items);
  }
  contains(node) { return this.children.some((c) => c === node || c.contains(node)); }
  get isConnected() { return this === document.body || document.body.contains(this); }
  querySelectorAll(selector) {
    const all = this.children.flatMap((c) => [c, ...c.querySelectorAll("*")]);
    if (selector === "*") return all;
    return all.filter((c) => (c.tagName === "BUTTON" || (selector.includes("a[") && c.tagName === "A")) && (!selector.includes(":disabled") || !c.disabled));
  }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  focus() { if (!this.disabled) document.activeElement = this; }
  click() { this.focus(); if (!this.disabled) this.listeners.get("click")?.(); }
}
const body = new Element("body");
globalThis.HTMLElement = Element;
globalThis.document = { body, activeElement: body, createElement: (tag) => new Element(tag) };
globalThis.window = { location: { origin: "https://nexus.test" } };
globalThis.MutationObserver = class { observe() {} disconnect() {} };
const accountListeners = new Set(); const ownerListeners = new Set();
let owner = "alice"; let state = "ready"; let stageWorks = false; let stages = 0; let sends = 0;
const stored = new Map();
globalThis.__scoreUi = {
  account: { accountKit: { config: { nexusOrigin: "https://nexus.test" } }, accountState: () => state, currentHandle: () => "Alice", saveOwner: () => owner,
    signInHref: () => "https://nexus.test/sign-in", onAccountChange: (fn) => { accountListeners.add(fn); return () => accountListeners.delete(fn); },
    onSaveOwnerChange: (fn) => { ownerListeners.add(fn); return () => ownerListeners.delete(fn); } },
  pending: { read: (id) => stored.get(id) ?? null, stage: (proof, id) => { stages++; if (stageWorks) stored.set(id, { owner: id, proof }); return stageWorks; },
    submit: async () => { sends++; stored.delete(owner); return { ok: true, runScore: 100, bestScore: 100, levelRank: 1 }; } },
  api: { enabled: true, read: async () => ({ ok: true, entries: [{ rank: 1, handle: "<script>text only</script>", score: 100 }] }) },
};
const built = await build({ entryPoints: ["src/ui/expansionLeaderboardUi.ts"], bundle: true, write: false, platform: "node", format: "esm", plugins: [{ name: "isolated-ui-ports", setup(b) {
  b.onResolve({ filter: /(?:leaderboard\/account|expansionScoreClient|expansionScoreApi|\.\/account)$/ }, ({ path }) => ({ path, namespace: "test" }));
  b.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({ loader: "js", contents: path.endsWith("leaderboard/account")
    ? "export const {accountKit,accountState,currentHandle,saveOwner,signInHref,onAccountChange,onSaveOwnerChange}=globalThis.__scoreUi.account;"
    : path.endsWith("expansionScoreClient") ? "export const expansionPendingScores=globalThis.__scoreUi.pending;"
    : path.endsWith("expansionScoreApi") ? "export const expansionScoreApi=globalThis.__scoreUi.api;"
    : "export const createAccountPanel=()=>document.createElement('section');" }));
} }] });
const { createExpansionLeaderboardPanel, mountExpansionPendingScoreNotice } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const report = JSON.parse(await readFile(new URL("../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json", import.meta.url), "utf8"));
const proof = report.runs[0].replay;
const offer = { proof, owner: "alice", staged: false };
const mount = (item = offer) => { const panel = createExpansionLeaderboardPanel(proof.level, item); body.append(panel.element); return panel; };
const click = async (panel, label) => { const button = panel.element.querySelectorAll("button").find((b) => b.textContent === label); assert.ok(button, label); button.click(); for (let i = 0; i < 8; i++) await Promise.resolve(); };
let panel = mount();
assert.equal(offer.staged, false);
assert.match(panel.element.textContent, /Could not retain/);
panel.dispose(); body.replaceChildren();
stageWorks = true; panel = mount();
assert.equal(offer.staged, true, "Storage failure does not lose the proof on overlay rebuild.");
await click(panel, "VIEW LEVEL RANKINGS");
assert.equal(document.activeElement.textContent, "VIEW LEVEL RANKINGS");
assert.match(panel.element.textContent, /<script>text only<\/script>/);
await click(panel, "SUBMIT AS Alice");
assert.equal(sends, 1);
assert.match(panel.element.textContent, /Verified 100/);
const stagedCount = stages;
panel.dispose(); body.replaceChildren(); panel = mount();
assert.equal(stages, stagedCount, "Successful submission is never re-staged by overlay rebuild.");
assert.equal(panel.element.textContent.includes("SUBMIT AS Alice"), false);
panel.dispose(); body.replaceChildren();
stored.set("alice", { owner: "alice", proof: { ...proof, seed: "older" } });
const replacement = { proof, owner: "alice", staged: false };
panel = mount(replacement);
assert.equal(stored.get("alice").proof.seed, "older");
assert.equal(replacement.staged, false);
await click(panel, "KEEP THIS CLEAR FOR SUBMISSION");
assert.equal(replacement.staged, true);
assert.deepEqual(stored.get("alice").proof, proof);
panel.dispose(); body.replaceChildren(); owner = "bob";
panel = mount({ proof, owner: "alice", staged: false });
assert.equal(stored.has("bob"), false, "Retained proof does not silently change owner.");
panel.dispose(); assert.equal(accountListeners.size, 0); assert.equal(ownerListeners.size, 0);
globalThis.__scoreUi.api.enabled = false;
body.replaceChildren();
mountExpansionPendingScoreNotice();
assert.equal(body.children.length, 0, "Release latch suppresses pending notices in the original game.");
assert.equal(accountListeners.size, 0); assert.equal(ownerListeners.size, 0);
// Cross-package regression: save status must not enable leaderboard controls
// disabled by the release latch or a pending request.
globalThis.ResizeObserver = class { observe() {} };
const saveUiBuild = await build({ entryPoints: ["src/ui/expansionSaveUi.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const { ExpansionSaveUi } = await import(`data:text/javascript;base64,${Buffer.from(saveUiBuild.outputFiles[0].text).toString("base64")}`);
const saveOverlay = new Element("div");
const disabledScore = new Element("button"); disabledScore.disabled = true;
saveOverlay.append(disabledScore);
let saveBusy = false;
const saveUi = new ExpansionSaveUi({ saves: { save: { checkpoint: null }, status: "saved" }, isBusy: () => saveBusy,
  levelId: 1, hud: new Element("div"), overlay: saveOverlay, canvas: new Element("canvas"), background: [],
  onResume() {}, onStartNew() {}, onLevelSelect() {} });
saveUi.updateStatus(false);
assert.equal(disabledScore.disabled, true, "Save UI must preserve leaderboard-owned disabled state.");
saveBusy = true; saveUi.updateStatus(false);
assert.equal(saveOverlay.inert, true, "Cloud sync blocks interaction without rewriting child disabled state.");
saveBusy = false; saveUi.updateStatus(false);
assert.equal(saveOverlay.inert, false);
assert.equal(disabledScore.disabled, true);
delete globalThis.ResizeObserver;
delete globalThis.__scoreUi; delete globalThis.HTMLElement; delete globalThis.document; delete globalThis.window; delete globalThis.MutationObserver;
console.log("Expansion score UI: failed staging survives rebuild, successful proof never restaged, explicit replacement, owner isolation, focus restoration, text-only handles and disposal passed.");
