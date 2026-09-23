export class ExpansionScoreError extends Error {}
export function validateExpansionScore(payload: unknown): {
  proof: { schema: 2; ruleset: "expansion-v1"; campaign: "expansion-1"; contentRevision: "expansion-1-r4"; contentHash: string; level: number; seed: string; commands: readonly unknown[] };
  category: string; score: number; rating: string; metadata: Record<string, unknown>;
};
