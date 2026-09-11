import { R4_CHAPTER_01_LEVELS } from "./chapter01";
import { R4_CHAPTER_02_LEVELS } from "./chapter02";
import { R4_CHAPTER_03_LEVELS } from "./chapter03";
import type { ExpansionLevelDefinition } from "../../../../sim/expansion/types";

export const EXPANSION_R4_LEVELS: readonly ExpansionLevelDefinition[] = Object.freeze([
  ...R4_CHAPTER_01_LEVELS, ...R4_CHAPTER_02_LEVELS, ...R4_CHAPTER_03_LEVELS,
]);
export const EXPANSION_R4_CHAPTERS = [
  { id: 1, codename: "LATENCY FRONT", visualThemeId: "latency-front", levelIds: R4_CHAPTER_01_LEVELS.map((level) => level.id) },
  { id: 2, codename: "DEMOLITION FRONT", visualThemeId: "demolition-front", levelIds: R4_CHAPTER_02_LEVELS.map((level) => level.id) },
  { id: 3, codename: "SHIELD FRONT", visualThemeId: "shield-front", levelIds: R4_CHAPTER_03_LEVELS.map((level) => level.id) },
] as const;
