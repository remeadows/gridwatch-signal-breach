/** Match navigation unlocks while retaining existing checkpoint/guest access.
 * This is progression UX, not score authorization (the server validates replays). */
export function canOpenExpansionLevel(level: number, cleared: readonly number[], checkpointLevel: number | undefined, retainedGuestHighest = 1): boolean {
  const highest = Math.min(25, Math.max(1, retainedGuestHighest, ...cleared.map(id => id + 1)));
  return Number.isInteger(level) && level >= 1 && level <= 25 && (level <= highest || level === checkpointLevel);
}
