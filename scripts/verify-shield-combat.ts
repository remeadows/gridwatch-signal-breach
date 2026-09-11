import { applyExpansionTurretCombat } from "../src/sim/expansion/combat";
import { applyExpansionCommand } from "../src/sim/expansion/commands";
import { createExpansionGrid, setExpansionTile } from "../src/sim/expansion/grid";
import { createExpansionGameState } from "../src/sim/expansion/state";
import type { ExpansionEnemyKind, ExpansionGameState, ExpansionIntrusionState } from "../src/sim/expansion/types";

const base = createExpansionGameState({ levelId: 1, contentHash: "shield-combat-proof", seed: "shield-proof" });
const enemy = (id: number, kind: ExpansionEnemyKind, x: number, y: number, hp = 12): ExpansionIntrusionState => ({
  id, kind, hp, maxHp: hp, position: { x, y }, previousPosition: { x, y }, spawnedTick: 0, lastMoveTick: 0, corruption: null,
});
const start = (intrusions: readonly ExpansionIntrusionState[], arc = false): ExpansionGameState => ({
  ...base, tickCount: 1, phase: "active", events: [], intrusions,
  grid: setExpansionTile(createExpansionGrid(8), { x: 3, y: 3 }, { kind: arc ? "arcIce" : "turret", hp: 10 }),
});

const formation = [enemy(1, "crawler", 3, 4), enemy(2, "shieldDrone", 3, 5), enemy(3, "crawler", 4, 5)];
const ordinary = applyExpansionTurretCombat(start(formation));
assert(ordinary.intrusions.find((entry) => entry.id === 1)?.hp === 10, "Shield did not reduce ordinary ICE from four to two.");
assert(ordinary.intrusions.find((entry) => entry.id === 2)?.hp === 8, "A Shield Drone protected itself.");
const plain = applyExpansionTurretCombat(start([enemy(1, "crawler", 3, 4)]));
assert(plain.intrusions[0]?.hp === 8, "Ordinary ICE without a shield changed.");

const arc = applyExpansionTurretCombat(start(formation, true));
const hits = arc.events.filter((event) => event.type === "turretHit");
assert(JSON.stringify(hits.map((event) => [event.targetId, event.damage])) === JSON.stringify([[2, 3], [1, 2], [3, 1]]), "Arc ICE priority, chain, or shield piercing is wrong.");
assert(hits.every((event) => event.weapon === "arcIce"), "Arc ICE effects lost weapon identity.");
assert(JSON.stringify(hits.map((event) => event.turretPosition)) === JSON.stringify([{ x: 3, y: 3 }, { x: 3, y: 5 }, { x: 3, y: 4 }]), "Arc effects must connect each chain hop.");
const reversed = applyExpansionTurretCombat(start([...formation].reverse(), true));
assert(JSON.stringify(arc.events) === JSON.stringify(reversed.events), "Arc effects depend on input enemy order.");
assert(JSON.stringify(arc.intrusions) === JSON.stringify(reversed.intrusions), "Arc survivors depend on input enemy order.");

const doomedShield = start([enemy(1, "shieldDrone", 3, 4, 4), enemy(2, "crawler", 4, 4)]);
const simultaneous = applyExpansionTurretCombat({ ...doomedShield, grid: setExpansionTile(doomedShield.grid, { x: 4, y: 3 }, { kind: "turret", hp: 10 }) });
assert(!simultaneous.intrusions.some((entry) => entry.id === 1), "Lethal Shield Drone survived.");
assert(simultaneous.intrusions.find((entry) => entry.id === 2)?.hp === 8, "Mid-phase Shield Drone death changed another turret's protection snapshot.");
const before = JSON.stringify(formation);
applyExpansionTurretCombat(start(formation, true));
assert(JSON.stringify(formation) === before, "Combat mutated its input enemies.");
assert(applyExpansionCommand(base, { type: "placeUnit", unit: "arcIce", position: { x: 1, y: 1 } }) === base, "Chapter 1 accepted the Chapter 3 weapon.");
console.log("Shield production combat passed: existing ICE unchanged, snapshot shielding, deterministic piercing chain, and old chapter gate.");

function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(message); }
