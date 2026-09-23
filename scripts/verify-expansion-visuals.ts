import { canPreviewExpansionTool, ExpansionRangePreview } from "../src/input/expansionRangePreview";
import { installExpansionPointerInput } from "../src/input/expansionPointer";
import { ExpansionVisualTimeline, getExpansionShotEndpoints } from "../src/render/expansionVisualTimeline";
import { applyExpansionTurretCombat } from "../src/sim/expansion/combat";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { createExpansionGrid, setExpansionTile } from "../src/sim/expansion/grid";
import { createExpansionGameState } from "./retained-expansion";
import type { ExpansionGameState, ExpansionIntrusionState, ExpansionSimCommand, ExpansionSimEvent } from "../src/sim/expansion/types";

const base = createExpansionGameState({ levelId: 1, contentHash: "visual-test", seed: "visual-test" });
const pulse: ExpansionSimEvent = { type: "sapperDeathPulse", tick: 9, intrusionId: 1, position: { x: 3, y: 3 }, damage: 6, range: 1, affectedHardware: 2 };
const timeline = new ExpansionVisualTimeline();
timeline.advance(1000, false);
const prep: ExpansionGameState = { ...base, tickCount: 9, events: [pulse] };
timeline.observe(prep);
expect(timeline.snapshot(prep).effects.length === 1, "A new pulse must appear immediately.");
timeline.advance(1300, false);
timeline.observe({ ...prep, bandwidth: prep.bandwidth + 1 });
expect(timeline.snapshot(prep).effects.length === 1, "A build command must not duplicate a retained event.");
timeline.advance(2100, false);
timeline.observe(prep);
expect(timeline.snapshot(prep).effects.length === 0, "A retained pulse must expire in prep without a sim tick.");
timeline.advance(3000, false);
timeline.observe(prep);
expect(timeline.snapshot(prep).effects.length === 0, "Expired events must not restart when the sim state remains unchanged.");

const pausedTimeline = new ExpansionVisualTimeline();
pausedTimeline.advance(0, false);
pausedTimeline.observe(prep);
pausedTimeline.advance(120, false);
const beforePause = pausedTimeline.snapshot(prep);
pausedTimeline.advance(150, true);
pausedTimeline.advance(8000, true);
expect(pausedTimeline.snapshot(prep).timeMs === beforePause.timeMs, "Pause must freeze presentation time.");
expect(pausedTimeline.snapshot(prep).effects[0]?.progress === beforePause.effects[0]?.progress, "Pause must not repeat or expand an explosion.");
pausedTimeline.advance(8020, false);
expect(pausedTimeline.snapshot(prep).timeMs === beforePause.timeMs, "Resume must not catch up paused wall time.");
pausedTimeline.advance(9000, false);
expect(pausedTimeline.snapshot(prep).effects.length === 0, "A resumed explosion must expire normally.");

pausedTimeline.reset(9100);
expect(pausedTimeline.snapshot(base).effects.length === 0, "Restart must clear all previous effects.");
pausedTimeline.observe(prep);
expect(pausedTimeline.snapshot(prep).effects.length === 1, "Restart must allow the same occurrence identity in a new run.");

const enemy: ExpansionIntrusionState = { id: 7, kind: "rusher", hp: 6, maxHp: 6, position: { x: 2, y: 3 }, previousPosition: { x: 1, y: 3 }, spawnedTick: 1, lastMoveTick: 2, corruption: null };
const move: ExpansionSimEvent = { type: "intrusionMoved", tick: 2, intrusionId: 7, from: { x: 1, y: 3 }, to: { x: 2, y: 3 }, jumped: false };
const moving: ExpansionGameState = { ...base, phase: "active", tickCount: 2, intrusions: [enemy], events: [move] };
const movementTimeline = new ExpansionVisualTimeline();
movementTimeline.advance(0, false);
movementTimeline.observe(moving);
expect(movementTimeline.snapshot(moving).intrusionPositions.get(7)?.x === 1, "Movement begins at the previous rendered cell.");
movementTimeline.advance(100, false);
const halfway = movementTimeline.snapshot(moving).intrusionPositions.get(7)?.x ?? 0;
expect(halfway > 1 && halfway < 2, "Ordinary movement must interpolate between cells.");
expect(movementTimeline.snapshot(moving, true).intrusionPositions.get(7)?.x === 2, "Reduced motion must show the authoritative cell immediately.");
expect(enemy.position.x === 2 && enemy.previousPosition.x === 1, "Presentation must not mutate authoritative positions.");
movementTimeline.advance(800, false);
expect(movementTimeline.snapshot(moving).intrusionPositions.get(7)?.x === 2, "Movement must finish at the authoritative cell.");
movementTimeline.reset(900);
movementTimeline.observe({ ...moving, events: [{ ...move, jumped: true }] });
expect(movementTimeline.snapshot(moving).intrusionPositions.get(7)?.x === 2, "A wall jump must not slide through a blocked cell.");

const shotA: ExpansionSimEvent = { type: "turretHit", tick: 3, turretPosition: { x: 1, y: 1 }, targetId: 7, targetPosition: { x: 2, y: 3 }, damage: 4 };
const shotB: ExpansionSimEvent = { ...shotA, turretPosition: { x: 2, y: 1 } };
const combatTimeline = new ExpansionVisualTimeline();
combatTimeline.advance(0, false);
combatTimeline.observe({ ...base, events: [shotA, shotB] });
expect(combatTimeline.snapshot(base).effects.length === 2, "Separate ICE attacks on one target must both appear.");
combatTimeline.observe({ ...base, phase: "won", events: [pulse] });
combatTimeline.advance(1000, false);
expect(combatTimeline.snapshot(base).effects.length === 0, "Combat effects must expire after the final wave.");

// A continuation must start at the same rendered point at which the previous
// beam ends, including when both chain targets moved during the current tick.
const arcEnemies: readonly ExpansionIntrusionState[] = [
  { ...enemy, id: 21, kind: "shieldDrone", hp: 12, maxHp: 12, position: { x: 2, y: 2 }, previousPosition: { x: 1, y: 2 } },
  { ...enemy, id: 22, kind: "crawler", hp: 12, maxHp: 12, position: { x: 3, y: 2 }, previousPosition: { x: 3, y: 1 } },
  { ...enemy, id: 23, kind: "probe", hp: 12, maxHp: 12, position: { x: 4, y: 2 }, previousPosition: { x: 4, y: 2 } },
];
const arcState = applyExpansionTurretCombat({
  ...base, phase: "active", tickCount: 2, intrusions: arcEnemies,
  grid: setExpansionTile(createExpansionGrid(8), { x: 0, y: 2 }, { kind: "arcIce", hp: 10 }),
  events: arcEnemies.slice(0, 2).map((entry) => ({ type: "intrusionMoved", tick: 2, intrusionId: entry.id, from: entry.previousPosition, to: entry.position, jumped: false })),
});
const arcHits = arcState.events.filter((event) => event.type === "turretHit");
expect(arcHits.length === 3, "Arc interpolation fixture must produce three chained hits.");
expect(!("sourceIntrusionId" in arcHits[0]!), "An initial Arc beam must retain a stationary turret origin.");
expect(arcHits[1]!.sourceIntrusionId === 21 && arcHits[2]!.sourceIntrusionId === 22, "Arc continuations must identify their previous target.");
const arcTimeline = new ExpansionVisualTimeline();
arcTimeline.advance(0, false);
arcTimeline.observe(arcState);
for (const now of [0, 100, 180]) {
  arcTimeline.advance(now, false);
  for (const reduceMotion of [false, true]) {
    const positions = arcTimeline.snapshot(arcState, reduceMotion).intrusionPositions;
    const shots = arcHits.map((hit) => getExpansionShotEndpoints(hit, positions));
    expect(JSON.stringify(shots[0]!.target) === JSON.stringify(shots[1]!.source), "The first Arc continuation detached from its moving source.");
    expect(JSON.stringify(shots[1]!.target) === JSON.stringify(shots[2]!.source), "The second Arc continuation detached from its moving source.");
    expect(shots[0]!.source.x === 0 && shots[0]!.source.y === 2, "Arc interpolation moved the stationary turret origin.");
  }
}
const removedSource = new Map(arcTimeline.snapshot(arcState).intrusionPositions);
removedSource.delete(21);
expect(JSON.stringify(getExpansionShotEndpoints(arcHits[0]!, removedSource).target) === JSON.stringify(getExpansionShotEndpoints(arcHits[1]!, removedSource).source), "A destroyed chain source must fall back to the same recorded position on both beams.");
expect(getExpansionShotEndpoints(shotA, removedSource).source === shotA.turretPosition, "Normal ICE must retain its original stationary source.");
const ordinaryState = applyExpansionTurretCombat({ ...arcState, events: [], grid: setExpansionTile(createExpansionGrid(8), { x: 1, y: 2 }, { kind: "turret", hp: 10 }) });
expect(ordinaryState.events.filter((event) => event.type === "turretHit").every((event) => !("sourceIntrusionId" in event)), "Normal ICE events must not gain Arc-only metadata.");

const rangePreview = new ExpansionRangePreview();
const placement: ExpansionSimCommand = { type: "placeUnit", unit: "turret", position: { x: 2, y: 2 } };
expect(!rangePreview.enabled && rangePreview.position === null, "Range preview must be off for normal one-tap building.");
expect(rangePreview.filterCommand(placement) === placement, "Default input must pass the original placement command unchanged.");
expect(applyExpansionCommand(base, placement) !== base, "Range fixture must use a legal affordable build cell.");
expect(canPreviewExpansionTool("turret") && canPreviewExpansionTool("arcIce") && !canPreviewExpansionTool("relay"), "Only ICE and Arc ICE should expose range inspection.");
rangePreview.toggle("relay");
expect(!rangePreview.enabled, "Non-weapon tools cannot activate range preview.");
for (const unit of ["turret", "arcIce"] as const) {
  rangePreview.toggle(unit);
  expect(rangePreview.enabled, "Selecting Preview Range must enable no-spend inspection.");
  for (const phase of ["prep", "active"] as const) {
    const unchanged: ExpansionGameState = { ...base, phase, bandwidth: 0 };
    const before = JSON.stringify(unchanged);
    for (const command of [
      { ...placement, unit },
      { type: "sellUnit", position: { x: 2, y: 2 } } as const,
    ]) {
      const accepted = rangePreview.filterCommand(command);
      expect(accepted === null, "Touch and keyboard build/sale commands must never reach the sim in preview mode.");
      const after = accepted ? applyExpansionCommand(unchanged, accepted) : unchanged;
      expect(after === unchanged && JSON.stringify(after) === before, "Inspection must not spend bandwidth or change any simulation state.");
      expect(rangePreview.position?.x === 2 && rangePreview.position?.y === 2, "Inspection must retain the tapped cell for touch devices.");
    }
  }
  rangePreview.inspect({ x: 5, y: 4 });
  expect(rangePreview.position?.x === 5, "Mouse hover and keyboard focus must update the preview position.");
  const launch: ExpansionSimCommand = { type: "skipPrep" };
  expect(rangePreview.filterCommand(launch) === launch && rangePreview.enabled, "Launching a wave must not silently return preview taps to purchase mode.");
  rangePreview.toggle(unit);
  expect(!rangePreview.enabled && rangePreview.position === null, "Exit Preview must restore build mode and clear the inspected cell.");
  expect(rangePreview.filterCommand(placement) === placement, "Explicitly exiting preview must restore normal one-tap building.");
}
rangePreview.toggle("turret");
rangePreview.selectTool("arcIce");
expect(rangePreview.enabled, "Switching between ranged weapons must keep the no-spend mode explicit and active.");
rangePreview.selectTool("sell");
expect(!rangePreview.enabled && rangePreview.position === null, "Selecting a non-weapon tool must exit preview.");
rangePreview.toggle("turret");
rangePreview.exit();
expect(!rangePreview.enabled && rangePreview.position === null, "Restart/Escape must fully clear preview state.");

// Exercise the actual pointer adapter, including a mode change between press
// and release. A preview gesture cannot turn into an accidental purchase.
const pointerListeners = new Map<string, (event: PointerEvent) => void>();
const pointerCommands: ExpansionSimCommand[] = [];
let previewTaps = 0;
let pointerPreview = false;
let hoverCellX: number | null = null;
const pointerCanvas = {
  width: 888, height: 888,
  getBoundingClientRect: () => ({ width: 888, height: 888, left: 0, top: 0 }),
  setPointerCapture: () => {},
  addEventListener: (type: string, listener: (event: PointerEvent) => void) => { pointerListeners.set(type, listener); },
} as unknown as HTMLCanvasElement;
installExpansionPointerInput({
  canvas: pointerCanvas, getState: () => base, getSelectedTool: () => "turret", isEnabled: () => true,
  dispatch: (command) => { pointerCommands.push(command); },
  onHover: (position) => { hoverCellX = position?.x ?? null; },
  isRangePreviewEnabled: () => pointerPreview,
  onRangePreview: () => { previewTaps += 1; },
});
function pointerEvent(type: string, overrides: Partial<PointerEvent> = {}): void {
  pointerListeners.get(type)?.({ pointerId: 1, pointerType: "touch", clientX: 294, clientY: 294, isPrimary: true, button: 0, preventDefault: () => {}, ...overrides } as PointerEvent);
}
pointerEvent("pointerdown"); pointerEvent("pointerup");
expect(pointerCommands.length === 1 && pointerCommands[0]?.type === "placeUnit", "Default touch input must still build with one tap.");
pointerPreview = true;
pointerEvent("pointerdown"); pointerEvent("pointerup");
expect(pointerCommands.length === 1 && previewTaps === 1, "Touch preview must inspect without dispatching a purchase.");
pointerEvent("pointerdown"); pointerPreview = false; pointerEvent("pointerup");
expect(pointerCommands.length === 1 && previewTaps === 2, "Exiting preview during a touch gesture must not cause an accidental purchase.");
pointerEvent("pointerdown"); pointerPreview = true; pointerEvent("pointerup");
expect(pointerCommands.length === 1 && previewTaps === 3, "Entering preview during a touch gesture must suppress its purchase.");
pointerEvent("pointerdown"); pointerEvent("pointerup", { clientX: 324 });
expect(pointerCommands.length === 1 && previewTaps === 3, "Dragging must not be interpreted as a preview tap.");
pointerPreview = false;
pointerEvent("pointermove", { pointerType: "mouse" });
expect(hoverCellX === 2, "Existing mouse range hover must remain available.");
pointerEvent("pointerdown"); pointerEvent("pointercancel"); pointerEvent("pointerup");
expect(pointerCommands.length === 1, "A canceled gesture must not place a unit.");

console.log("Expansion visual timeline verified: event lifecycle, movement/reduced motion, connected Arc chains, normal ICE compatibility, and no-spend touch/keyboard range preview.");

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
