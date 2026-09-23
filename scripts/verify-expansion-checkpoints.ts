import chapter1 from "../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json";
import chapter2 from "../docs/fixtures/expansion-1-r4-chapter-2-human-evidence.json";
import chapter3 from "../docs/fixtures/expansion-1-r4-chapter-3-human-evidence.json";
import { applyExpansionCommand, createExpansionGameState, tickExpansion, type ExpansionRecordedCommand, type ExpansionReplayInput } from "../src/sim/expansion";
import { createExpansionCheckpoint, restoreExpansionCheckpoint } from "../src/sim/expansion/checkpoint";
import assert from "./assert";
import { emptyExpansionSave, parseExpansionSave } from "../src/ui/expansionSave";

let checkpoints = 0;
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
        const checkpoint = createExpansionCheckpoint(state, replay.seed, commands);
        const restored = restoreExpansionCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
        assert.deepEqual(restored.state, state, `L${replay.level} W${state.waveIndex + 1}: checkpoint state differs`);
        assert.deepEqual(restored.checkpoint.replay.commands, commands);
        const save = parseExpansionSave({ ...emptyExpansionSave(), checkpoint });
        assert.equal(parseExpansionSave(save), save, "Validated saves must be reused without replaying again");
        const settingsChange = parseExpansionSave({ ...save, settings: { lowEffects: true } });
        assert.equal(settingsChange.checkpoint, save.checkpoint, "Validated checkpoint must survive settings updates without replay");
        assert.equal(Object.isFrozen(save), true);
        assert.equal(Object.isFrozen(save.checkpoint!.replay.commands), true);
        const first = save.checkpoint!.replay.commands[0]!;
        assert.equal(Object.isFrozen(first.c), true);
        assert.throws(() => { (first as { t: number }).t += 1; }, /read only|readonly|assign/i);
        const external = JSON.parse(JSON.stringify(save));
        parseExpansionSave(external);
        external.checkpoint.completedWaves = 0;
        assert.throws(() => parseExpansionSave(external), /checkpoint/i);
        assert.throws(() => restoreExpansionCheckpoint({ ...checkpoint, completedWaves: 0 }), /checkpoint/i);
        assert.throws(() => restoreExpansionCheckpoint({ ...checkpoint, tick: checkpoint.tick + 1 }), /checkpoint/i);
        assert.throws(() => restoreExpansionCheckpoint({ ...checkpoint, replay: { ...checkpoint.replay, contentHash: "a".repeat(64) } }), /hash/i);
        assert.throws(() => restoreExpansionCheckpoint({ ...checkpoint, replay: { ...checkpoint.replay, sector: 1 } }), /identity/i);
        assert.throws(() => restoreExpansionCheckpoint({ ...checkpoint, replay: { ...checkpoint.replay, commands: [...commands, { t: checkpoint.tick, c: { type: "skipPrep" } }] } }), /checkpoint/i);
        const changed = applyExpansionCommand(state, { type: "skipPrep" });
        assert.throws(() => createExpansionCheckpoint(changed, replay.seed, commands), /boundary/i);
        state = restored.state;
        checkpoints += 1;
      }
    }
    assert.equal(state.phase, "won");
    assert.equal(state.tickCount, run.ticks);
    assert.equal(state.bandwidth, run.bandwidth);
    assert.throws(() => createExpansionCheckpoint(state, replay.seed, commands), /boundary/i);
  }
}
for (const value of [null, [], {}, { schema: 1, tick: Infinity }, { schema: 1, tick: 12001 }]) {
  assert.throws(() => restoreExpansionCheckpoint(value), /checkpoint/i);
}
assert.equal(checkpoints, 100);
console.log("100 wave checkpoints across 25 levels restore exactly and continue to wins; malformed and non-boundary checkpoints rejected.");
