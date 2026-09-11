import { ExpansionVisualTimeline } from "../src/render/expansionVisualTimeline";
import { createExpansionGameState } from "../src/sim/expansion/state";
import type { ExpansionGameState, ExpansionIntrusionState, ExpansionSimEvent } from "../src/sim/expansion/types";

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

console.log("Expansion visual timeline verified: event expiry, prep/terminal, pause/resume, restart, movement, reduced motion, and distinct ICE shots.");

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
