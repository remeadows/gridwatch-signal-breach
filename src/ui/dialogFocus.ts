/** Wrap dialog controls; focus entering from outside starts at the matching end. */
export function nextDialogFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count < 1) return -1;
  if (current < 0 || current >= count) return backwards ? count - 1 : 0;
  return (current + (backwards ? count - 1 : 1)) % count;
}
