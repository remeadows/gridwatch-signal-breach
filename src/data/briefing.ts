import { UNIT_TUNING } from "./units";
import type { EnemyKind, UnitKind } from "../sim/types";

export type BriefingUnit = Readonly<{
  kind: UnitKind;
  name: string;
  cost: number;
  summary: string;
}>;

export type BriefingThreat = Readonly<{
  kind: EnemyKind;
  name: string;
  summary: string;
}>;

export const BRIEFING_COPY = {
  signal: {
    title: "THE SIGNAL",
    body:
      "Route the signal from the SOURCE to the CORE. The cyan line is your lifeline - if it's cut, the Core bleeds integrity. Integrity hits zero, you're flatlined.",
  },
  arsenalTitle: "YOUR ARSENAL",
  threatsTitle: "THE THREATS",
  arsenalIntro: "Click a tool, click a tile. SELL refunds part of the cost.",
  threatsIntro:
    "Intrusions corrupt tiles to sever your route. Survive all 5 waves.",
} as const;

export const BRIEFING_UNITS: readonly BriefingUnit[] = [
  {
    kind: "relay",
    name: "Relay",
    cost: UNIT_TUNING.relay.cost,
    summary: "extends signal reach - the route flows through these.",
  },
  {
    kind: "firewall",
    name: "Firewall",
    cost: UNIT_TUNING.firewall.cost,
    summary: "hardened tile, slows corruption.",
  },
  {
    kind: "turret",
    name: "ICE Turret",
    cost: UNIT_TUNING.turret.cost,
    summary: "auto-fires at adjacent intrusions.",
  },
] as const;

export const BRIEFING_THREATS: readonly BriefingThreat[] = [
  {
    kind: "probe",
    name: "Probe",
    summary: "fast, weak, swarms.",
  },
  {
    kind: "crawler",
    name: "Crawler",
    summary: "slow, tough, corrupts tiles fast.",
  },
  {
    kind: "spoof",
    name: "Spoof",
    summary: "slips past firewall hardening.",
  },
] as const;
