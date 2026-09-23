/** Presentation corrections must not rewrite immutable r4 replay content. */
const R4_CORRECTIONS = new Map<string, string>([
  ["Hunters pull fire away from Rushers. Keep traps in the path.",
    "Hunters chase hardware while Rushers race along the route. Keep traps in the path."],
  ["The Goliath absorbs fire while Rushers race around it. Keep your relay chain alive through five holds before the outer lanes open.",
    "A tough Goliath presses toward the Core while Rushers attack the route. Keep your relay chain alive through five holds before the outer lanes open."],
  ["Isolate bait, overlap ICE, and preserve a rebuild lane. Heavy enemies screen Sappers at this checkpoint before the final demolition tests.",
    "Isolate bait, overlap ICE, and preserve a rebuild lane. Heavy enemies add Core pressure while Sappers threaten clustered hardware before the final demolition tests."],
]);

export function getExpansionBriefingCopy(contentRevision: string, original: string): string {
  return contentRevision === "expansion-1-r4" ? R4_CORRECTIONS.get(original) ?? original : original;
}
