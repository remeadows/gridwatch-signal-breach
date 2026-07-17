/**
 * The expansion shell is off for normal players. The query flag exists solely
 * for local/preview navigation QA; it never enables a playable expansion run.
 */
export function isExpansionNavigationEnabled(): boolean {
  return new URLSearchParams(window.location.search).get("expansion-nav") === "1";
}
