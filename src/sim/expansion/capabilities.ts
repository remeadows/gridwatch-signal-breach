import type { ExpansionHardwareKind } from "./types";

export type ExpansionHardwareCapabilities = Readonly<{
  carriesSignal: boolean;
  blocksMovement: boolean;
  targetable: boolean;
  chewable: boolean;
  corruptible: boolean;
  traversable: boolean;
}>;

const CAPABILITIES: Readonly<Record<ExpansionHardwareKind, ExpansionHardwareCapabilities>> = {
  relay: {
    carriesSignal: true,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false,
  },
  firewall: {
    carriesSignal: true,
    blocksMovement: true,
    targetable: false,
    chewable: true,
    corruptible: false,
    traversable: false,
  },
  turret: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false,
  },
  scrubber: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false,
  },
  overclock: {
    carriesSignal: false,
    blocksMovement: true,
    targetable: true,
    chewable: true,
    corruptible: true,
    traversable: false,
  },
  latencyTrap: {
    carriesSignal: false,
    blocksMovement: false,
    targetable: false,
    chewable: false,
    corruptible: false,
    traversable: true,
  },
};

export function getExpansionHardwareCapabilities(
  kind: ExpansionHardwareKind,
): ExpansionHardwareCapabilities {
  return CAPABILITIES[kind];
}

export function isExpansionHardwareKind(value: string): value is ExpansionHardwareKind {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, value);
}

export function isBlockingExpansionHardwareKind(kind: ExpansionHardwareKind): boolean {
  return CAPABILITIES[kind].blocksMovement;
}

export function isTargetableExpansionHardwareKind(kind: ExpansionHardwareKind): boolean {
  return CAPABILITIES[kind].targetable;
}

export function isCorruptibleExpansionHardwareKind(kind: ExpansionHardwareKind): boolean {
  return CAPABILITIES[kind].corruptible;
}

export function isTraversableExpansionHardwareKind(kind: ExpansionHardwareKind): boolean {
  return CAPABILITIES[kind].traversable;
}
