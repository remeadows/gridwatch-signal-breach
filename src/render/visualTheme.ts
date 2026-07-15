export type EffectsQuality = "high" | "low";

export type SectorVisualTheme = Readonly<{
  id: number;
  label: string;
  backgroundStart: string;
  backgroundMid: string;
  backgroundEnd: string;
  grid: string;
  accent: string;
  threat: string;
  floor: "lanes" | "canyon" | "vault";
}>;

const THEMES: Readonly<Record<number, SectorVisualTheme>> = {
  1: {
    id: 1,
    label: "Perimeter",
    backgroundStart: "#071923",
    backgroundMid: "#07141d",
    backgroundEnd: "#10101a",
    grid: "rgba(117, 255, 235, 0.2)",
    accent: "rgba(34, 224, 196, 0.52)",
    threat: "rgba(255, 79, 145, 0.2)",
    floor: "lanes",
  },
  2: {
    id: 2,
    label: "Canyon",
    backgroundStart: "#11131c",
    backgroundMid: "#0b1720",
    backgroundEnd: "#16101a",
    grid: "rgba(112, 205, 224, 0.2)",
    accent: "rgba(98, 199, 225, 0.52)",
    threat: "rgba(255, 137, 76, 0.2)",
    floor: "canyon",
  },
  3: {
    id: 3,
    label: "Vault",
    backgroundStart: "#11101c",
    backgroundMid: "#08131b",
    backgroundEnd: "#170b18",
    grid: "rgba(184, 140, 255, 0.2)",
    accent: "rgba(182, 140, 255, 0.54)",
    threat: "rgba(255, 41, 87, 0.24)",
    floor: "vault",
  },
};

export function getSectorVisualTheme(sectorId: number): SectorVisualTheme {
  return THEMES[sectorId] ?? THEMES[1];
}

export function getEffectsQuality(): EffectsQuality {
  const requested = new URLSearchParams(window.location.search).get("quality");

  if (requested === "low" || requested === "high") {
    return requested;
  }

  return navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
    ? "low"
    : "high";
}
