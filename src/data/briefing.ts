import { UNIT_TUNING } from "./units";
import type { EnemyKind, UnitKind } from "../sim/types";

export type BriefingRowIcon = UnitKind | EnemyKind | "source" | "core" | "sell";

export type BriefingRow = Readonly<{
  icon: BriefingRowIcon;
  name: string;
  summary: string;
  minSector?: number;
}>;

export type BriefingPage = Readonly<{
  minSector?: number;
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
  minSector?: number;
}>;

export type BriefingThreat = Readonly<{
  kind: EnemyKind;
  name: string;
  summary: string;
  minSector?: number;
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
  arsenalIntro:
    "Choose a tool, place it on the grid, then LAUNCH WAVE when your route and defenses are ready. SELL fully refunds Build changes; live sales return the listed partial refund.",
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
    summary: `auto-fires at intrusions within ${UNIT_TUNING.turret.range} tiles.`,
  },
  {
    kind: "scrubber",
    name: "Scrubber",
    cost: UNIT_TUNING.scrubber.cost,
    summary: `cleans corrupted ground in ${UNIT_TUNING.scrubber.cleanseTicks} active ticks - place ON corruption.`,
    minSector: 2,
  },
  {
    kind: "overclock",
    name: "Overclock",
    cost: UNIT_TUNING.overclock.cost,
    summary: `amplifies adjacent ICE turrets by +${UNIT_TUNING.overclock.bonusDamage} damage.`,
    minSector: 3,
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
  {
    kind: "hunter",
    name: "Hunter",
    summary: "ignores the route - anything you built is the target.",
    minSector: 2,
  },
  {
    kind: "splitter",
    name: "Splitter",
    summary: "bursts into probes on death - choose where it dies.",
    minSector: 2,
  },
  {
    kind: "goliath",
    name: "Goliath",
    summary: "a siege engine. Walls slow it; massed, overclocked ICE stops it.",
    minSector: 3,
  },
] as const;

export const BRIEFING_PROTOCOLS: readonly BriefingRow[] = [
  {
    icon: "sell",
    name: "Bandwidth",
    summary:
      "your build currency. Granted each wave, trickled during combat, and spent to place. Build-phase sales fully refund; live sales only partly refund.",
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
      "a corrupted tile is dead ground - it carries nothing and never recovers on its own. Scrub it or route around it.",
  },
  {
    icon: "source",
    name: "Build + Launch",
    summary:
      "between waves time is frozen. Read the entry intel, build without a timer, then press LAUNCH WAVE to begin combat.",
  },
] as const;

export const BRIEFING_PAGES: readonly BriefingPage[] = [
  {
    minSector: 1,
    title: BRIEFING_COPY.signal.title,
    kind: "signal",
    body: BRIEFING_COPY.signal.body,
  },
  {
    minSector: 1,
    title: BRIEFING_COPY.arsenalTitle,
    kind: "rows",
    body: BRIEFING_COPY.arsenalIntro,
    rows: BRIEFING_UNITS.map((unit) => ({
      icon: unit.kind,
      name: unit.name,
      summary: `(${unit.cost}) ${unit.summary}`,
      minSector: unit.minSector,
    })),
  },
  {
    minSector: 1,
    title: BRIEFING_COPY.protocolsTitle,
    kind: "rows",
    rows: BRIEFING_PROTOCOLS,
  },
  {
    minSector: 1,
    title: BRIEFING_COPY.threatsTitle,
    kind: "rows",
    body: BRIEFING_COPY.threatsIntro,
    rows: BRIEFING_THREATS.map((threat) => ({
      icon: threat.kind,
      name: threat.name,
      summary: threat.summary,
      minSector: threat.minSector,
    })),
  },
  {
    minSector: 2,
    title: "SECTOR 2 INTEL",
    kind: "rows",
    body: "Void chasms block movement - but not the signal.",
    rows: [
      {
        icon: "hunter",
        name: "Hunter",
        summary: "ignores the route - anything you built is the target.",
      },
      {
        icon: "splitter",
        name: "Splitter",
        summary: "bursts into probes on death - choose where it dies.",
      },
      {
        icon: "scrubber",
        name: "Scrubber",
        summary: `counter-corruption tool; cleans after ${UNIT_TUNING.scrubber.cleanseTicks} active ticks.`,
      },
    ],
  },
  {
    minSector: 3,
    title: "SECTOR 3 INTEL",
    kind: "rows",
    body: "The vault has two gates. Force long exposure and amplify your ICE.",
    rows: [
      {
        icon: "overclock",
        name: "Overclock",
        summary: `adjacent ICE gains +${UNIT_TUNING.overclock.bonusDamage} damage per node.`,
      },
      {
        icon: "goliath",
        name: "Goliath",
        summary: "a siege engine. Walls slow it. Only massed, overclocked ICE stops it.",
      },
      {
        icon: "core",
        name: "Vault Core",
        summary: "wave 12 includes a scripted boss handshake - do not let it touch the Core.",
      },
    ],
  },
] as const;
