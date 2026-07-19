/**
 * The expansion shell is off for normal players. The query flag exists solely
 * for local/preview navigation QA; it never enables a playable expansion run.
 */
export function isExpansionNavigationEnabled(): boolean {
  return isLocalExpansionHost() && new URLSearchParams(window.location.search).get("expansion-nav") === "1";
}

export function isExpansionPlayEnabled(): boolean {
  return isLocalExpansionHost() && new URLSearchParams(window.location.search).get("expansion-play") === "1";
}

function isLocalExpansionHost(): boolean {
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
}
