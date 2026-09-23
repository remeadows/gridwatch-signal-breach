import { isExpansionPreviewHost } from "./previewHostPolicy";

declare const __EXPANSION_LAN_PREVIEW__: boolean;

/** Query flags stay local; private-LAN testing requires a dedicated dev mode. */
export function isExpansionNavigationEnabled(): boolean {
  return isLocalExpansionHost() && new URLSearchParams(window.location.search).get("expansion-nav") !== "0";
}

export function isExpansionPlayEnabled(): boolean {
  return isLocalExpansionHost() && new URLSearchParams(window.location.search).get("expansion-play") === "1";
}

function isLocalExpansionHost(): boolean {
  return isExpansionPreviewHost(window.location.hostname, __EXPANSION_LAN_PREVIEW__);
}
