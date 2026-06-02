import type { RngState } from "./types";

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const UINT32_RANGE = 4294967296;
const FALLBACK_NONZERO_SEED = 2779096485;

export function createRng(seed: string | number): RngState {
  return {
    seed: String(seed),
    state: hashSeed(String(seed)),
  };
}

export function nextUint32(rng: RngState): Readonly<{
  rng: RngState;
  value: number;
}> {
  let nextState = rng.state;

  nextState += 0x6d2b79f5;
  let mixed = nextState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

  const value = ((mixed ^ (mixed >>> 14)) >>> 0);

  return {
    rng: {
      seed: rng.seed,
      state: nextState >>> 0,
    },
    value,
  };
}

export function nextFloat(rng: RngState): Readonly<{
  rng: RngState;
  value: number;
}> {
  const next = nextUint32(rng);

  return {
    rng: next.rng,
    value: next.value / UINT32_RANGE,
  };
}

export function nextInt(
  rng: RngState,
  minInclusive: number,
  maxExclusive: number,
): Readonly<{
  rng: RngState;
  value: number;
}> {
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
    throw new Error("nextInt bounds must be integers.");
  }

  if (maxExclusive <= minInclusive) {
    throw new Error("nextInt maxExclusive must be greater than minInclusive.");
  }

  const next = nextFloat(rng);

  return {
    rng: next.rng,
    value: Math.floor(next.value * (maxExclusive - minInclusive)) + minInclusive,
  };
}

function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return (hash >>> 0) || FALLBACK_NONZERO_SEED;
}
