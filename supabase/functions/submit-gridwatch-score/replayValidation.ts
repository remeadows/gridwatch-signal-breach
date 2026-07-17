export const LEGACY_RULESET_ID = "legacy-v1";
export const EXPANSION_RULESET_ID = "expansion-v1";

const ALLOWED_COMMAND_TYPES = new Set(["placeUnit", "sellUnit", "skipPrep"]);
const ALLOWED_UNITS = new Set([
  "relay",
  "firewall",
  "turret",
  "scrubber",
  "overclock",
]);

export type CanonicalCommand = Readonly<{
  t: number;
  c: Readonly<Record<string, unknown>>;
}>;

export type ResolvedRuleset = Readonly<{
  id: string;
  legacy: boolean;
}>;

export class ReplayValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayValidationError";
  }
}

export function resolveRuleset(
  raw: unknown,
  currentRulesetId: string,
  additionalRulesetIds: readonly string[] = [],
): ResolvedRuleset {
  if (raw === undefined || raw === LEGACY_RULESET_ID) {
    return {
      id: LEGACY_RULESET_ID,
      legacy: true,
    };
  }

  if (
    raw === currentRulesetId ||
    (typeof raw === "string" && additionalRulesetIds.includes(raw))
  ) {
    return {
      id: raw,
      legacy: false,
    };
  }

  throw new ReplayValidationError("Unsupported ruleset.");
}

/**
 * A sector replay may not carry any expansion identity fields. This prevents a
 * future client bug from silently treating an expansion submission as a V2
 * sector run (or vice versa).
 */
export function assertNoExpansionReplayIdentity(
  payload: Readonly<Record<string, unknown>>,
): void {
  const expansionIdentityFields = [
    "schema",
    "campaign",
    "level",
    "contentRevision",
    "contentHash",
  ];

  if (
    expansionIdentityFields.some((field) =>
      Object.prototype.hasOwnProperty.call(payload, field),
    )
  ) {
    throw new ReplayValidationError("Mixed replay schema.");
  }
}

export function categoryForRuleset(
  ruleset: ResolvedRuleset,
  legacyCategory: string,
): string {
  return ruleset.legacy ? legacyCategory : `${ruleset.id}:${legacyCategory}`;
}

export function canonicalizeCommands(
  commands: unknown,
  maxCommands: number,
): CanonicalCommand[] {
  if (!Array.isArray(commands) || commands.length > maxCommands) {
    throw new ReplayValidationError("Invalid or oversized command log.");
  }

  const canonical: CanonicalCommand[] = [];
  let previousTick = 0;

  for (const entry of commands) {
    if (typeof entry !== "object" || entry === null) {
      throw new ReplayValidationError("Malformed command log.");
    }

    const { t, c } = entry as { t: unknown; c: unknown };

    if (
      typeof t !== "number" ||
      !Number.isInteger(t) ||
      t < 0 ||
      t < previousTick ||
      typeof c !== "object" ||
      c === null
    ) {
      throw new ReplayValidationError(
        typeof t === "number" && t < previousTick
          ? "Command log is out of order."
          : "Malformed command log.",
      );
    }

    const type = (c as { type?: unknown }).type;

    if (typeof type !== "string" || !ALLOWED_COMMAND_TYPES.has(type)) {
      throw new ReplayValidationError("Malformed command log.");
    }

    switch (type) {
      case "skipPrep":
        canonical.push({ t, c: { type: "skipPrep" } });
        break;

      case "sellUnit": {
        const position = canonicalizePosition((c as { position?: unknown }).position);
        canonical.push({ t, c: { type: "sellUnit", position } });
        break;
      }

      case "placeUnit": {
        const command = c as { position?: unknown; unit?: unknown };
        const position = canonicalizePosition(command.position);

        if (typeof command.unit !== "string" || !ALLOWED_UNITS.has(command.unit)) {
          throw new ReplayValidationError("Malformed command log.");
        }

        canonical.push({
          t,
          c: {
            type: "placeUnit",
            position,
            unit: command.unit,
          },
        });
        break;
      }

      default:
        throw new ReplayValidationError("Malformed command log.");
    }

    previousTick = t;
  }

  return canonical;
}

function canonicalizePosition(raw: unknown): { x: number; y: number } {
  if (typeof raw !== "object" || raw === null) {
    throw new ReplayValidationError("Malformed command log.");
  }

  const { x, y } = raw as { x?: unknown; y?: unknown };

  if (
    typeof x !== "number" ||
    !Number.isInteger(x) ||
    typeof y !== "number" ||
    !Number.isInteger(y)
  ) {
    throw new ReplayValidationError("Malformed command log.");
  }

  return { x, y };
}
