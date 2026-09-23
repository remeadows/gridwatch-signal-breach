import { ARC_ICE_RULES, getShieldLinks, normalIceDamage, selectArcChain, type ShieldNetworkEnemy } from "../src/sim/expansion/shieldNetwork";

const enemies: readonly ShieldNetworkEnemy[] = [
  { id: 4, kind: "crawler", hp: 10, position: { x: 5, y: 1 } },
  { id: 2, kind: "shieldDrone", hp: 12, position: { x: 2, y: 1 } },
  { id: 3, kind: "rusher", hp: 6, position: { x: 3, y: 1 } },
  { id: 1, kind: "probe", hp: 4, position: { x: 1, y: 1 } },
  { id: 5, kind: "shieldDrone", hp: 12, position: { x: 2, y: 2 } },
];
const links = getShieldLinks(enemies);
check(links.every((link) => link.targetId !== 2 && link.targetId !== 5), "Drones protected each other.");
check(links.filter((link) => link.targetId === 3).length === 2, "Overlapping shield fixture missing.");
check(normalIceDamage(4, 3, links) === 2, "Overlapping shields stacked or ignored.");
check(normalIceDamage(4, 2, links) === 4, "Drone received its own protection.");
check(normalIceDamage(1, 3, links) === 1, "Shield reduced a hit below one.");
check(normalIceDamage(4, 4, links) === 4, "Out-of-range target was shielded.");
const chain = selectArcChain({ x: 0, y: 1 }, enemies);
same(chain, [2, 1, 3], "Arc priority/jump tie ordering drifted.");
same(selectArcChain({ x: 0, y: 1 }, [...enemies].reverse()), chain, "Array order changed Arc selection.");
check(new Set(chain).size === 3, "Arc revisited a target.");
check(ARC_ICE_RULES.chainDamage[0] < 4, "Arc replaced normal ICE single-target power.");
same(ARC_ICE_RULES.chainDamage, [3, 2, 1], "Chain damage profile changed.");
const longChain = [1, 2, 3, 4].map((id) => ({ id, kind: "probe", hp: 4, position: { x: id * 2, y: 0 } }));
same(selectArcChain({ x: 0, y: 0 }, longChain), [1, 2, 3], "Arc chain did not extend beyond first-target range or exceeded three targets.");
same(selectArcChain({ x: 7, y: 7 }, enemies), [], "Arc attacked outside first-target range.");
const withoutDrones = enemies.map((enemy) => enemy.kind === "shieldDrone" ? { ...enemy, hp: 0 } : enemy);
check(getShieldLinks(withoutDrones).length === 0, "Dead drone still provided shield links.");
console.log("Shield-network prototype passed: shield exclusions/nonstacking, deterministic Arc priority, distinct reach and bounded 3/2/1 chain.");

function check(value: boolean, message: string): asserts value { if (!value) throw new Error(message); }
function same(actual: unknown, expected: unknown, message: string): void { check(JSON.stringify(actual) === JSON.stringify(expected), message); }
