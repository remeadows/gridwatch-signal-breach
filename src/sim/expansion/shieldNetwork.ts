import type { GridPosition } from "../types";

export const ARC_ICE_RULES = {
  cost: 20, sellRefund: 10, hp: 10,
  firstTargetRange: 3, chainJumpRange: 2,
  chainDamage: [3, 2, 1] as readonly number[],
} as const;

export const SHIELD_DRONE_RULES = {
  maxHp: 12, moveEveryTicks: 3, corruptionTicks: 8,
  spawnBatchSize: 1, chewDamage: 1, coreContactDamage: 1,
  targeting: "route", onDeathSpawn: null,
  shieldRange: 2, shieldReduction: 2,
} as const;

export type ShieldNetworkEnemy = Readonly<{
  id: number; kind: string; hp: number; position: GridPosition;
}>;
export type ShieldLink = Readonly<{ sourceId: number; targetId: number }>;

const distance = (a: GridPosition, b: GridPosition): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Read from the start-of-combat enemy snapshot, never partially applied HP. */
export function getShieldLinks(enemies: readonly ShieldNetworkEnemy[]): readonly ShieldLink[] {
  const alive = enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => a.id - b.id);
  return alive.filter((enemy) => enemy.kind === "shieldDrone").flatMap((source) =>
    alive.filter((target) => target.kind !== "shieldDrone" && distance(source.position, target.position) <= SHIELD_DRONE_RULES.shieldRange)
      .map((target) => ({ sourceId: source.id, targetId: target.id })),
  );
}

export function normalIceDamage(damage: number, targetId: number, links: readonly ShieldLink[]): number {
  return links.some((link) => link.targetId === targetId) ? Math.max(1, damage - SHIELD_DRONE_RULES.shieldReduction) : damage;
}

/** Target priority is independent of input-array order and never uses RNG. */
export function selectArcChain(origin: GridPosition, enemies: readonly ShieldNetworkEnemy[]): readonly number[] {
  const alive = enemies.filter((enemy) => enemy.hp > 0);
  const priority = (enemy: ShieldNetworkEnemy): number => enemy.kind === "shieldDrone" ? 0 : 1;
  const first = alive.filter((enemy) => distance(origin, enemy.position) <= ARC_ICE_RULES.firstTargetRange)
    .sort((a, b) => priority(a) - priority(b) || distance(origin, a.position) - distance(origin, b.position) || a.id - b.id)[0];
  if (!first) return [];
  const chain = [first.id];
  let previous = first;
  while (chain.length < ARC_ICE_RULES.chainDamage.length) {
    const next = alive.filter((enemy) => !chain.includes(enemy.id) && distance(previous.position, enemy.position) <= ARC_ICE_RULES.chainJumpRange)
      .sort((a, b) => distance(previous.position, a.position) - distance(previous.position, b.position) || a.id - b.id)[0];
    if (!next) break;
    chain.push(next.id);
    previous = next;
  }
  return chain;
}
