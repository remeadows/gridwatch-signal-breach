import { UNIT_TUNING } from "./units";
import type { EnemyKind, UnitKind } from "../sim/types";

export type BriefingRowIcon = UnitKind | EnemyKind | "source" | "core" | "sell";

export type BriefingRow = Readonly<{
  icon: BriefingRowIcon;
  name: string;
  summary: string;
}>;

export type BriefingPage = Readonly<{
  title: string;
  kind: "signal" | "rows";
  body?: string;
  rows?: readonly BriefingRow[];
}>;

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
      "Route the signal from the SOURCE to the CORE. While the line is live the Core self-repairs (+1/tick). Severed, it bleeds (-2/tick). Zero means flatline.",
  },
  arsenalTitle: "YOUR ARSENAL",
  protocolsTitle: "PROTOCOLS",
  threatsTitle: "THE THREATS",
  arsenalIntro: "Click a tool, click a tile. SELL refunds part of the cost.",
  threatsIntro:
    "Intrusions corrupt your hardware by standing on it, chew through walls when boxed in, and drain the Core by touch. Clear every wave of the sector.",
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
    summary: `a wall. Intrusions can't cross it - they must path around, or chew through its ${UNIT_TUNING.firewall.hp} HP.`,
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
    summary: "jumps a single wall. Double up.",
  },
] as const;

export const BRIEFING_PROTOCOLS: readonly BriefingRow[] = [
  {
    icon: "sell",
    name: "Bandwidth",
    summary:
      "your build currency. Granted each wave, trickled during combat, spent to place, partly refunded on SELL.",
  },
  {
    icon: "relay",
    name: "Linking",
    summary:
      `the signal hops between Source, relays, firewalls, and Core when they're within ${UNIT_TUNING.relay.signalRange} tiles of each other - it hops gaps.`,
  },
  {
    icon: "firewall",
    name: "Corruption",
    summary:
      "a corrupted tile is dead ground - it carries nothing and never recovers on its own. Route around it.",
  },
  {
    icon: "source",
    name: "Prep",
    summary:
      "between waves the clock pauses for you. Build, sell, then SKIP PREP to start early.",
  },
] as const;

export const BRIEFING_PAGES: readonly BriefingPage[] = [
  {
    title: BRIEFING_COPY.signal.title,
    kind: "signal",
    body: BRIEFING_COPY.signal.body,
  },
  {
    title: BRIEFING_COPY.arsenalTitle,
    kind: "rows",
    body: BRIEFING_COPY.arsenalIntro,
    rows: BRIEFING_UNITS.map((unit) => ({
      icon: unit.kind,
      name: unit.name,
      summary: `(${unit.cost}) ${unit.summary}`,
    })),
  },
  {
    title: BRIEFING_COPY.protocolsTitle,
    kind: "rows",
    rows: BRIEFING_PROTOCOLS,
  },
  {
    title: BRIEFING_COPY.threatsTitle,
    kind: "rows",
    body: BRIEFING_COPY.threatsIntro,
    rows: BRIEFING_THREATS.map((threat) => ({
      icon: threat.kind,
      name: threat.name,
      summary: threat.summary,
    })),
  },
] as const;
