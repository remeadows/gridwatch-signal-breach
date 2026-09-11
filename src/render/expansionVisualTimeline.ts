import type { ExpansionGameState, ExpansionSimEvent } from "../sim/expansion/types";
import type { GridPosition } from "../sim/types";

export type ExpansionVisualEvent = Extract<ExpansionSimEvent, {
  type: "turretHit" | "intrusionNeutralized" | "sapperDeathPulse" | "unitDamaged" | "latencyTrapTriggered" | "tileCleansed" | "tileCorrupted";
}>;

export type ExpansionVisualEffect = Readonly<{
  event: ExpansionVisualEvent;
  progress: number;
}>;

export type ExpansionVisualSnapshot = Readonly<{
  timeMs: number;
  effects: readonly ExpansionVisualEffect[];
  intrusionPositions: ReadonlyMap<number, GridPosition>;
}>;

/** Resolve both ends from one visual snapshot so moving Arc chains stay joined. */
export function getExpansionShotEndpoints(
  event: Extract<ExpansionSimEvent, { type: "turretHit" }>,
  positions: ReadonlyMap<number, GridPosition>,
): Readonly<{ source: GridPosition; target: GridPosition }> {
  return {
    source: event.sourceIntrusionId === undefined
      ? event.turretPosition
      : positions.get(event.sourceIntrusionId) ?? event.turretPosition,
    target: positions.get(event.targetId) ?? event.targetPosition,
  };
}

type TimedEffect = Readonly<{ event: ExpansionVisualEvent; startedAt: number; durationMs: number }>;
type Movement = Readonly<{ from: GridPosition; to: GridPosition; startedAt: number; durationMs: number }>;

/** Presentation time and event consumption are independent of simulation ticks. */
export class ExpansionVisualTimeline {
  private timeMs = 0;
  private wallTimeMs: number | null = null;
  private wasPaused = false;
  private seenEvents = new WeakSet<ExpansionSimEvent>();
  private effects: TimedEffect[] = [];
  private movements = new Map<number, Movement>();

  reset(now?: number): void {
    this.timeMs = 0;
    this.wallTimeMs = now ?? null;
    this.wasPaused = false;
    this.seenEvents = new WeakSet();
    this.effects = [];
    this.movements.clear();
  }

  advance(now: number, paused: boolean): void {
    if (this.wallTimeMs !== null && !paused && !this.wasPaused) {
      this.timeMs += Math.max(0, now - this.wallTimeMs);
    }
    this.wallTimeMs = now;
    this.wasPaused = paused;
    this.effects = this.effects.filter((effect) => this.timeMs - effect.startedAt < effect.durationMs);
  }

  /** Call after every processed tick, including multiple ticks in one frame. */
  observe(state: ExpansionGameState): void {
    for (const event of state.events) {
      // Commands and build phases can retain the exact previous tick's events.
      // A WeakSet consumes each occurrence once without retaining old runs.
      if (this.seenEvents.has(event)) continue;
      this.seenEvents.add(event);
      if (event.type === "intrusionMoved") {
        const prior = this.movements.get(event.intrusionId);
        this.movements.set(event.intrusionId, {
          from: prior ? positionAt(prior, this.timeMs) : event.from,
          to: event.to,
          startedAt: this.timeMs,
          durationMs: event.jumped ? 0 : Math.min(240, state.config.simulationTickMs * .8),
        });
      } else if (event.type === "intrusionNeutralized") {
        this.movements.delete(event.intrusionId);
      }
      const durationMs = effectDuration(event);
      if (durationMs !== null && isVisualEvent(event)) {
        this.effects.push({ event, startedAt: this.timeMs, durationMs });
      }
    }
    const currentIds = new Set(state.intrusions.map((intrusion) => intrusion.id));
    for (const id of this.movements.keys()) {
      if (!currentIds.has(id)) this.movements.delete(id);
    }
  }

  snapshot(state: ExpansionGameState, reducedMotion = false): ExpansionVisualSnapshot {
    const intrusionPositions = new Map<number, GridPosition>();
    for (const intrusion of state.intrusions) {
      const motion = this.movements.get(intrusion.id);
      intrusionPositions.set(intrusion.id, !reducedMotion && motion
        ? positionAt(motion, this.timeMs)
        : intrusion.position);
    }
    return {
      timeMs: this.timeMs,
      effects: this.effects.map((effect) => ({
        event: effect.event,
        progress: Math.min(1, Math.max(0, (this.timeMs - effect.startedAt) / effect.durationMs)),
      })),
      intrusionPositions,
    };
  }
}

function positionAt(movement: Movement, now: number): GridPosition {
  const linear = movement.durationMs <= 0 ? 1 : Math.min(1, Math.max(0, (now - movement.startedAt) / movement.durationMs));
  const progress = linear * linear * (3 - 2 * linear);
  return {
    x: movement.from.x + (movement.to.x - movement.from.x) * progress,
    y: movement.from.y + (movement.to.y - movement.from.y) * progress,
  };
}

function isVisualEvent(event: ExpansionSimEvent): event is ExpansionVisualEvent {
  return event.type === "turretHit" || event.type === "intrusionNeutralized" || event.type === "sapperDeathPulse" ||
    event.type === "unitDamaged" || event.type === "latencyTrapTriggered" || event.type === "tileCleansed" || event.type === "tileCorrupted";
}

function effectDuration(event: ExpansionSimEvent): number | null {
  if (event.type === "turretHit") return 190;
  if (event.type === "intrusionNeutralized") return 280;
  if (event.type === "sapperDeathPulse") return 580;
  if (event.type === "unitDamaged") return 220;
  if (event.type === "latencyTrapTriggered") return 340;
  if (event.type === "tileCleansed" || event.type === "tileCorrupted") return 380;
  return null;
}
