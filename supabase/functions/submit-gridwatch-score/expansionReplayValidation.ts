import {
  EXPANSION_RULESET_ID,
  ReplayValidationError,
  canonicalizeCommands,
  type CanonicalCommand,
} from "./replayValidation.ts";

export const EXPANSION_CAMPAIGN_ID = "expansion-1";
export const EXPANSION_REPLAY_SCHEMA_VERSION = 2;
export const EXPANSION_LEVEL_COUNT = 30;

export type CanonicalExpansionReplay = Readonly<{
  schema: typeof EXPANSION_REPLAY_SCHEMA_VERSION;
  ruleset: typeof EXPANSION_RULESET_ID;
  campaign: typeof EXPANSION_CAMPAIGN_ID;
  level: number;
  contentRevision: string;
  contentHash: string;
  seed: string;
  commands: readonly CanonicalCommand[];
}>;

/**
 * Canonicalizes the future expansion schema without sharing the V2 `sector`
 * identity. It deliberately does not establish that the requested content is
 * published; that requires a future immutable server-side content registry.
 */
export function canonicalizeExpansionReplay(
  payload: unknown,
  maxCommands: number,
): CanonicalExpansionReplay {
  if (!isRecord(payload)) {
    throw new ReplayValidationError("Invalid expansion replay payload.");
  }
  if (Object.prototype.hasOwnProperty.call(payload, "sector")) {
    throw new ReplayValidationError("Mixed replay schema.");
  }
  if (payload.schema !== EXPANSION_REPLAY_SCHEMA_VERSION) {
    throw new ReplayValidationError("Invalid expansion replay schema.");
  }
  if (payload.ruleset !== EXPANSION_RULESET_ID) {
    throw new ReplayValidationError("Invalid expansion ruleset.");
  }
  if (payload.campaign !== EXPANSION_CAMPAIGN_ID) {
    throw new ReplayValidationError("Invalid expansion campaign.");
  }
  if (
    typeof payload.level !== "number" ||
    !Number.isInteger(payload.level) ||
    payload.level < 1 ||
    payload.level > EXPANSION_LEVEL_COUNT
  ) {
    throw new ReplayValidationError("Invalid expansion level.");
  }
  if (
    typeof payload.contentRevision !== "string" ||
    !/^expansion-1-r[1-9][0-9]*$/.test(payload.contentRevision)
  ) {
    throw new ReplayValidationError("Invalid expansion content revision.");
  }
  if (
    typeof payload.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(payload.contentHash)
  ) {
    throw new ReplayValidationError("Invalid expansion content hash.");
  }
  if (
    typeof payload.seed !== "string" ||
    payload.seed.length === 0 ||
    payload.seed.length > 200
  ) {
    throw new ReplayValidationError("Invalid seed.");
  }

  return {
    schema: EXPANSION_REPLAY_SCHEMA_VERSION,
    ruleset: EXPANSION_RULESET_ID,
    campaign: EXPANSION_CAMPAIGN_ID,
    level: payload.level,
    contentRevision: payload.contentRevision,
    contentHash: payload.contentHash,
    seed: payload.seed,
    commands: canonicalizeCommands(payload.commands, maxCommands),
  };
}

/**
 * Phase 7C registers the protocol but intentionally has no authored expansion
 * level registry or simulator bundle. Reject structurally valid submissions
 * before any database access until a reviewed chapter publishes both.
 */
export function assertExpansionContentPublished(
  _replay: CanonicalExpansionReplay,
): never {
  throw new ReplayValidationError("Expansion content is not published.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
