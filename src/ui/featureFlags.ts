import { isExpansionPreviewHost } from "./previewHostPolicy";

declare const __EXPANSION_LAN_PREVIEW__: boolean;

// Server-first activation: compatible score function v10 deployed 2026-09-23.
export const EXPANSION_PUBLIC_RELEASED = true;

/** Public navigation is normal gameplay; query overrides stay private. */
export function isExpansionNavigationEnabled(): boolean {
  if (isLocalExpansionHost()) return new URLSearchParams(window.location.search).get("expansion-nav") !== "0";
  return EXPANSION_PUBLIC_RELEASED;
}

export function isExpansionPlayEnabled(): boolean {
  const query = new URLSearchParams(window.location.search);
  return (EXPANSION_PUBLIC_RELEASED && query.get("campaign") === "expansion-1" && query.get("view") !== "levels") || isExpansionPlayPreviewEnabled();
}

export function isExpansionPlayPreviewEnabled(): boolean {
  return isLocalExpansionHost() && new URLSearchParams(window.location.search).get("expansion-play") === "1";
}

export function isExpansionLevelSelectRequested(): boolean {
  const query = new URLSearchParams(window.location.search);
  return (EXPANSION_PUBLIC_RELEASED && query.get("campaign") === "expansion-1" && query.get("view") === "levels")
    || (isLocalExpansionHost() && query.get("expansion-nav") === "1");
}

export function isPrototypePreviewEnabled(flag: "latency-trap-preview" | "rusher-preview" | "sapper-preview"): boolean {
  return isLocalExpansionHost() && new URLSearchParams(window.location.search).get(flag) === "1";
}

function isLocalExpansionHost(): boolean {
  return isExpansionPreviewHost(window.location.hostname, __EXPANSION_LAN_PREVIEW__);
}
