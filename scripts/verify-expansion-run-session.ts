import chapter1 from "../docs/fixtures/expansion-1-r4-chapter-1-human-evidence.json";
import chapter2 from "../docs/fixtures/expansion-1-r4-chapter-2-human-evidence.json";
import chapter3 from "../docs/fixtures/expansion-1-r4-chapter-3-human-evidence.json";
import { replayExpansionRun, type ExpansionReplayInput } from "../src/sim/expansion";
import { ExpansionRunSession } from "../src/ui/expansionRunSession";
import { ExpansionLocalSave } from "../src/ui/expansionLocalSave";
import { expansionSaveKey } from "../src/ui/expansionSave";
import { loadPlayableExpansionR4Progress, EXPANSION_R4_PROGRESS_KEY } from "../src/ui/expansionProgressR4";
import { nextDialogFocusIndex } from "../src/ui/dialogFocus";
import assert from "./assert";

const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
};
let boundaries = 0;
assert.equal(nextDialogFocusIndex(-1, 3, true), 2);
assert.equal(nextDialogFocusIndex(-1, 3, false), 0);
assert.equal(nextDialogFocusIndex(0, 3, true), 2);
assert.equal(nextDialogFocusIndex(2, 3, false), 0);
assert.equal(nextDialogFocusIndex(1, 3, true), 0);
assert.equal(nextDialogFocusIndex(1, 3, false), 2);
assert.equal(nextDialogFocusIndex(-1, 0, true), -1);
for (const report of [chapter1, chapter2, chapter3]) {
  for (const fixture of report.runs.filter((r) => r.actionIntervalTicks === 3 && r.seed.endsWith("alpha"))) {
    const input = fixture.replay as ExpansionReplayInput;
    const disk = storage();
    let saves = new ExpansionLocalSave(disk, "guest", [1]);
    let run = new ExpansionRunSession(input.level, input.seed);
    let cursor = 0;
    run.step();
    assert.equal(run.state.tickCount, 0, "Build phase must not advance");
    while (run.state.phase !== "won" && run.state.phase !== "lost") {
      while (cursor < input.commands.length && input.commands[cursor]!.t === run.state.tickCount) {
        run.dispatch(input.commands[cursor++]!.c);
      }
      assert.equal(run.state.phase, "active", "Fixture must launch each build phase");
      run.step();
      if (run.state.phase === "prep") {
        const checkpoint = run.checkpoint();
        assert.equal(saves.update({ ...saves.save, checkpoint }), true);
        const expected = run.state;
        const recorded = run.replay().commands;
        // A new page/controller reads the same durable envelope and restores the run.
        saves = new ExpansionLocalSave(disk, "guest");
        run = new ExpansionRunSession(input.level, "ignored-on-resume", saves.save.checkpoint!);
        assert.deepEqual(run.state, expected);
        assert.equal(run.replay().seed, input.seed);
        assert.deepEqual(run.replay().commands, recorded, "Resume must retain every effective command");
        assert.equal(saves.update({ ...saves.save, settings: { lowEffects: true } }), true);
        run.step();
        assert.deepEqual(run.state, expected, "Restored build phase stays frozen");
        boundaries++;
      }
    }
    assert.equal(run.state.phase, "won");
    const replayed = replayExpansionRun(run.replay());
    assert.equal(replayed.state.tickCount, run.state.tickCount);
    assert.deepEqual(replayed.state, run.state, "Resumed winning replay must remain exact");
    assert.equal(saves.clearLevel(input.level), true);
    const afterWin = new ExpansionLocalSave(disk, "guest");
    assert.equal(afterWin.save.checkpoint, null);
    assert.equal(afterWin.save.clearedLevels.includes(input.level), true);
    assert.equal(loadPlayableExpansionR4Progress(disk).clearedLevels.includes(input.level), true, "Navigation reads canonical saved clears");
    assert.equal(afterWin.save.settings.lowEffects, true);
    assert.equal(new ExpansionRunSession(input.level, "restart").replay().commands.length, 0);
  }
}
assert.equal(boundaries, 100);
const completedDisk = storage();
const completed = new ExpansionLocalSave(completedDisk, "guest", Array.from({ length: 25 }, (_, i) => i + 1));
assert.equal(completed.clearLevel(1), true, "Replaying after all 25 clears must not exceed the save array bound");
assert.equal(new ExpansionLocalSave(completedDisk, "guest").save.clearedLevels.length, 25);
const recoveredDisk = storage();
let rejectWrite = true;
const transientDisk = { getItem: recoveredDisk.getItem, setItem: (key: string, raw: string) => {
  if (rejectWrite) throw new Error("Temporary storage failure");
  recoveredDisk.setItem(key, raw);
} };
const retry = new ExpansionLocalSave(transientDisk, "guest");
assert.equal(retry.clearLevel(1), false);
assert.equal(retry.status, "unavailable");
rejectWrite = false;
assert.equal(retry.clearLevel(1), true, "Explicit retry must persist a previously failed victory clear");
assert.equal(retry.status, "saved");
assert.deepEqual(new ExpansionLocalSave(recoveredDisk, "guest").save.clearedLevels, [1]);
const disk = storage();
const first = new ExpansionLocalSave(disk, "guest");
const second = new ExpansionLocalSave(disk, "guest");
assert.equal(first.update({ ...first.save, clearedLevels: [1] }), true);
assert.equal(second.update({ ...second.save, clearedLevels: [2] }), false);
assert.equal(second.status, "conflict", "Another tab's save must not be overwritten");
assert.deepEqual(new ExpansionLocalSave(disk, "guest").save.clearedLevels, [1]);
assert.deepEqual(loadPlayableExpansionR4Progress(disk).clearedLevels, [1], "Rejected stale-tab clear must not appear in navigation");
assert.deepEqual(JSON.parse(disk.getItem(EXPANSION_R4_PROGRESS_KEY)!).clearedLevels, [], "Canonical clears never dual-write the legacy progress key");
const raced = storage();
let interleave = true;
const racingDisk = {
  getItem: raced.getItem,
  setItem: (key: string, raw: string) => {
    raced.setItem(key, raw);
    if (interleave) {
      interleave = false;
      const anotherTab = JSON.parse(raw);
      anotherTab.save.clearedLevels = [2];
      raced.setItem(key, JSON.stringify(anotherTab));
    }
  },
};
const writer = new ExpansionLocalSave(racingDisk, "guest");
writer.update({ ...writer.save, clearedLevels: [1] });
assert.equal(writer.update({ ...writer.save, clearedLevels: [1, 3] }), false, "Do not adopt another tab's post-write bytes as our own baseline");
assert.equal(writer.status, "conflict");
assert.deepEqual(new ExpansionLocalSave(raced, "guest").save.clearedLevels, [2]);
const account = new ExpansionLocalSave(disk, "11111111-1111-4111-8111-111111111111");
assert.deepEqual(account.save.clearedLevels, [], "Guest progress must never transfer to an account");
assert.equal(account.update({ ...account.save, clearedLevels: [2] }), true);
assert.deepEqual(new ExpansionLocalSave(disk, "guest").save.clearedLevels, [1]);
for (const inaccessible of [null, { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } }]) {
  const saves = new ExpansionLocalSave(inaccessible, "guest");
  assert.equal(saves.update({ ...saves.save, clearedLevels: [3] }), false);
  assert.equal(saves.status, "unavailable");
  assert.deepEqual(saves.save.clearedLevels, [3], "Play continues with in-memory progress");
}
const corrupt = storage();
corrupt.setItem(expansionSaveKey("guest"), "not-json");
const unreadable = new ExpansionLocalSave(corrupt, "guest");
assert.equal(unreadable.status, "invalid");
assert.equal(unreadable.update(unreadable.save), false);
assert.equal(corrupt.getItem(expansionSaveKey("guest")), "not-json", "Invalid saves need explicit discard");
assert.equal(unreadable.discardUnreadable(), true);
assert.equal(unreadable.status, "saved");
const emptyBytes = storage();
emptyBytes.setItem(expansionSaveKey("guest"), "");
assert.equal(new ExpansionLocalSave(emptyBytes, "guest").status, "invalid");
const bounded = new ExpansionRunSession(1, "bounded");
bounded.dispatch({ type: "sellUnit", position: { x: 1, y: 1 } });
assert.equal(bounded.replay().commands.length, 0, "Rejected input does not consume replay budget");
const command = { type: "placeUnit" as const, unit: "turret" as const, position: { x: 1, y: 3 } };
bounded.dispatch(command);
command.position.x = 6;
assert.deepEqual(bounded.replay().commands[0]!.c, { type: "placeUnit", unit: "turret", position: { x: 1, y: 3 } }, "Recorded input must not alias caller data");
bounded.dispatch({ type: "sellUnit", position: { x: 1, y: 3 } });
for (let i = 0; i < 2500; i++) {
  bounded.dispatch({ type: "placeUnit", unit: "turret", position: { x: 1, y: 3 } });
  bounded.dispatch({ type: "sellUnit", position: { x: 1, y: 3 } });
}
assert.throws(() => bounded.replay(), /command limit/);
assert.throws(() => bounded.checkpoint(), /command limit/);
assert.equal(bounded.state.phase, "prep", "Exhausted replay budget does not end gameplay");
console.log("25 gameplay sessions restore all 100 wave boundaries, retain exact winning replays, save settings/clears and isolate owners; storage/conflict/invalid failures are explicit.");
