import type { Schema } from "@gridwatch/account-kit/saves-schema";
/** Frozen v1 wire shape for breach / expansion-1-r4. Structural validation only:
 * the game must unpack commands and deterministically validate the checkpoint.
 * Scores, credentials and trusted simulation snapshots are deliberately absent. */
export const BREACH_EXPANSION_V1: Schema = {
  type: "object",
  optional: ["checkpoint"],
  properties: {
    contentRevision: { type: "string", maxLength: 14, pattern: /^expansion-1-r4$/ },
    clearedLevels: { type: "array", maxLength: 25, items: { type: "integer", min: 1, max: 25 } },
    settings: { type: "object", properties: { lowEffects: { type: "boolean" } } },
    checkpoint: {
      type: "object",
      properties: {
        completedWaves: { type: "integer", min: 1, max: 4 },
        tick: { type: "integer", min: 1, max: 12000 },
        level: { type: "integer", min: 1, max: 25 },
        contentHash: { type: "string", maxLength: 64, pattern: /^[0-9a-f]{64}$/ },
        seed: { type: "string", maxLength: 200, pattern: /[\s\S]/ },
        // t * 1024 + opcode * 64 + y * 8 + x; reserved opcodes rejected by game.
        commands: { type: "array", maxLength: 5000, items: { type: "integer", min: 0, max: 12287551 } },
      },
    },
  },
};
