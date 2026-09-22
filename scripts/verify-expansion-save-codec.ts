import chapter1 from "../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json";
import chapter2 from "../docs/fixtures/expansion-1-r4-chapter-2-human-evidence.json";
import chapter3 from "../docs/fixtures/expansion-1-r4-chapter-3-human-evidence.json";
import { applyExpansionCommand, createExpansionGameState, tickExpansion, type ExpansionRecordedCommand, type ExpansionReplayInput } from "../src/sim/expansion";
import { createExpansionCheckpoint, restoreExpansionCheckpoint } from "../src/sim/expansion/checkpoint";
import { emptyExpansionSave, parseExpansionSave, type ExpansionSave } from "../src/ui/expansionSave";
import { decodeExpansionSave, encodeExpansionSave, packExpansionCommands, unpackExpansionCommands, expansionSaveRequestBytes } from "../src/leaderboard/expansionSaveCodec";
import assert from "./assert";
export { BREACH_EXPANSION_V1 } from "../src/leaderboard/expansionSaveSchema";

// Also consumed by the cross-repository verifier against a built candidate kit.
export const encodedSaveFixtures = [encodeExpansionSave(emptyExpansionSave())];

assert.deepEqual(decodeExpansionSave(encodeExpansionSave(emptyExpansionSave())), emptyExpansionSave());
assert.equal("checkpoint" in encodeExpansionSave(emptyExpansionSave()), false);
let count = 0;
let maximumBytes = 0;
let example: ExpansionSave | undefined;
for (const report of [chapter1, chapter2, chapter3]) {
  for (const run of report.runs.filter((run) => run.actionIntervalTicks === 3 && run.seed.endsWith("alpha"))) {
    const replay = run.replay as ExpansionReplayInput;
    let state = createExpansionGameState({ levelId: replay.level, contentHash: replay.contentHash, contentRevision: replay.contentRevision, seed: replay.seed });
    let cursor = 0;
    const commands: ExpansionRecordedCommand[] = [];
    while (state.phase !== "won" && state.phase !== "lost") {
      while (cursor < replay.commands.length && replay.commands[cursor]!.t === state.tickCount) {
        const command = replay.commands[cursor++]!;
        state = applyExpansionCommand(state, command.c);
        commands.push(command);
      }
      const before = state;
      state = tickExpansion(state);
      if (before.phase === "active" && state.phase === "prep") {
        const save = parseExpansionSave({ ...emptyExpansionSave(), clearedLevels: [1, 25], settings: { lowEffects: true }, checkpoint: createExpansionCheckpoint(state, replay.seed, commands) });
        example ??= save;
        const payload = encodeExpansionSave(save);
        encodedSaveFixtures.push(payload);
        maximumBytes = Math.max(maximumBytes, expansionSaveRequestBytes(payload));
        const restored = decodeExpansionSave(JSON.parse(JSON.stringify(payload)));
        assert.deepEqual(restored, save, "Cloud codec must preserve the complete canonical save");
        const restoredState = restoreExpansionCheckpoint(restored.checkpoint).state;
        assert.deepEqual(restoredState, state);
        state = restoredState;
        count += 1;
      }
    }
    assert.equal(state.phase, "won");
    assert.equal(state.tickCount, run.ticks);
    assert.equal(state.bandwidth, run.bandwidth);
  }
}
assert.equal(count, 100);

// Fixed opcode ordering is part of the immutable wire contract, not tile enum order.
const units = ["relay", "firewall", "turret", "scrubber", "overclock", "latencyTrap", "arcIce"] as const;
for (const t of [0, 1, 11999]) {
  const commands: ExpansionRecordedCommand[] = [{ t, c: { type: "skipPrep" } }];
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
    commands.push({ t, c: { type: "sellUnit", position: { x, y } } });
    for (const unit of units) commands.push({ t, c: { type: "placeUnit", position: { x, y }, unit } });
  }
  assert.deepEqual(unpackExpansionCommands(packExpansionCommands(commands)), commands);
}
assert.deepEqual(packExpansionCommands([{ t: 1, c: { type: "placeUnit", position: { x: 7, y: 7 }, unit: "arcIce" } }]), [1599]);
for (const commands of [[1], [576], [-1], [1.5], [12287552], [NaN], [Infinity], [1024, 0], Array(5001).fill(0), Array(1)]) {
  assert.throws(() => unpackExpansionCommands(commands), /command/i);
}
for (const c of [
  { t: 12000, c: { type: "skipPrep" } },
  { t: 0, c: { type: "sellUnit", position: { x: 8, y: 0 } } },
  { t: 0, c: { type: "sellUnit", position: { x: -1, y: 0 } } },
]) assert.throws(() => packExpansionCommands([c as ExpansionRecordedCommand]), /command/i);
assert.throws(() => packExpansionCommands(Array(1)), /command/i);

if (!example) throw new Error("Missing checkpoint fixture");
const wire = encodeExpansionSave(example);
if (!wire.checkpoint) throw new Error("Missing wire checkpoint");
for (const payload of [
  null, {}, { ...wire, checkpoint: null }, { ...wire, contentRevision: "expansion-1-r3" },
  { ...wire, score: 9 }, { ...wire, settings: { lowEffects: false, token: "x" } },
  { ...wire, checkpoint: { ...wire.checkpoint, contentHash: "a".repeat(64) } },
  { ...wire, checkpoint: { ...wire.checkpoint, commands: [0] } },
  { ...wire, checkpoint: { ...wire.checkpoint, tick: wire.checkpoint.tick + 1 } },
  { ...wire, checkpoint: { ...wire.checkpoint, seed: "x".repeat(65537) } },
]) assert.throws(() => decodeExpansionSave(payload), /save|checkpoint|hash|boundary/i);
for (const seed of ["\ud800", "\udc00"]) {
  assert.throws(() => decodeExpansionSave({ ...wire, checkpoint: { ...wire.checkpoint, seed } }), /Unicode/);
}

// Out-of-grid no-ops accepted by the historical replay validator must never be silently dropped.
const noop = { t: 0, c: { type: "sellUnit" as const, position: { x: -1, y: 0 } } };
const localWithNoop = parseExpansionSave({ ...example, checkpoint: { ...example.checkpoint!, replay: { ...example.checkpoint!.replay, commands: [noop, ...example.checkpoint!.replay.commands] } } });
assert.throws(() => encodeExpansionSave(localWithNoop), /command/i);
assert.equal(localWithNoop.checkpoint!.replay.commands[0]!.c.type, "sellUnit");

const maximum = { ...wire, clearedLevels: Array.from({ length: 25 }, (_, i) => i + 1), checkpoint: { ...wire.checkpoint, seed: "\u0000".repeat(200), commands: Array(5000).fill(12287551) } };
encodedSaveFixtures.push(maximum);
assert.equal(expansionSaveRequestBytes(maximum) < 65536, true);
assert.throws(() => decodeExpansionSave(maximum), /command|size|checkpoint/i);
console.log(`Save codec: ${count} exact wave-boundary round trips and continued wins; largest fixture request ${maximumBytes} bytes; structural maximum ${expansionSaveRequestBytes(maximum)} bytes.`);
