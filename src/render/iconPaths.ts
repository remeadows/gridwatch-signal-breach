export type IconName =
  | "relay"
  | "firewall"
  | "turret"
  | "scrubber"
  | "overclock"
  | "sell"
  | "source"
  | "core"
  | "probe"
  | "crawler"
  | "spoof";

export type IconDef = Readonly<{
  fill: readonly string[];
  stroke: readonly string[];
  color: string;
  accent: string;
}>;

export const ICON_VIEWBOX = 24;

export const ICONS: Readonly<Record<IconName, IconDef>> = {
  relay: {
    fill: [
      "M12 5 L18 11 L12 17 L6 11 Z",
      "M10 17 H14 V22 H10 Z",
      "M9 2 H15 L13.6 5 H10.4 Z",
    ],
    stroke: [
      "M8 7 C5.5 5 5.5 3.2 8 1.8",
      "M16 7 C18.5 5 18.5 3.2 16 1.8",
      "M12 8.5 L14.5 11 L12 13.5 L9.5 11 Z",
    ],
    color: "#22e0c4",
    accent: "#a4fff3",
  },
  firewall: {
    fill: [
      "M12 2.5 L20 6.5 V12.2 C20 16.9 16.4 20.6 12 22 C7.6 20.6 4 16.9 4 12.2 V6.5 Z",
    ],
    stroke: [
      "M8 8 H16",
      "M7 11.5 H11.2 M12.8 11.5 H17",
      "M8 15 H16",
      "M12 3.8 V20",
    ],
    color: "#f2c94c",
    accent: "#fff1a8",
  },
  turret: {
    fill: [
      "M8 15 H16 L18 21 H6 Z",
      "M12 4 L17 9 L12 14 L7 9 Z",
      "M10.4 8 H13.6 V11.2 H10.4 Z",
    ],
    stroke: [
      "M12 1.8 V5.2",
      "M12 12.8 V17",
      "M4 9 H7.2",
      "M16.8 9 H20",
      "M5 5 L7.4 7.4 M19 5 L16.6 7.4 M5 13 L7.4 10.6 M19 13 L16.6 10.6",
    ],
    color: "#4da3ff",
    accent: "#d5ecff",
  },
  scrubber: {
    fill: [
      "M5 5 H19 V19 H5 Z",
      "M10 10 L12 6.5 L14 10 L17.5 12 L14 14 L12 17.5 L10 14 L6.5 12 Z",
      "M16.5 4.2 L17.5 6.5 L20 7.2 L17.5 7.9 L16.5 10.2 L15.5 7.9 L13 7.2 L15.5 6.5 Z",
    ],
    stroke: [
      "M8 12 H16",
      "M12 8 V16",
      "M7.5 17.5 L10 20 L16.5 13.5",
    ],
    color: "#5ee08a",
    accent: "#c7ffd6",
  },
  overclock: {
    fill: [
      "M5 5 H19 V19 H5 Z",
      "M13 2.8 L7.8 12.2 H11.4 L10.4 21.2 L16.4 10.6 H12.8 Z",
    ],
    stroke: [
      "M7 7 H10",
      "M14 7 H17",
      "M7 17 H10",
      "M14 17 H17",
      "M3.8 9.2 H6",
      "M18 14.8 H20.2",
    ],
    color: "#f2c94c",
    accent: "#fff1a8",
  },
  sell: {
    fill: [
      "M12 2.5 L19.5 6.8 V15.2 L12 21.5 L4.5 15.2 V6.8 Z",
      "M8 8 H16 V12 H8 Z",
    ],
    stroke: [
      "M8.2 14 L12 17.8 L15.8 14",
      "M12 10.8 V17.2",
      "M8.5 6 H15.5",
    ],
    color: "#ff4f91",
    accent: "#ffd1e0",
  },
  source: {
    fill: [
      "M10.2 8 H13.8 V17 H10.2 Z",
      "M7.5 17 H16.5 L18.5 21 H5.5 Z",
      "M9 4.5 H15 L13.5 8 H10.5 Z",
    ],
    stroke: [
      "M7.5 7.5 C5.5 5.8 5.5 3.6 7.8 2",
      "M16.5 7.5 C18.5 5.8 18.5 3.6 16.2 2",
      "M5 10 C2.4 7.2 2.4 3.8 5.4 1.2",
      "M19 10 C21.6 7.2 21.6 3.8 18.6 1.2",
    ],
    color: "#22e0c4",
    accent: "#a4fff3",
  },
  core: {
    fill: [
      "M12 2.5 L20 7 V16.8 L12 21.5 L4 16.8 V7 Z",
      "M8 8.2 L16 8.2 L12 15.5 Z",
      "M10.3 17.2 A1.7 1.7 0 1 0 13.7 17.2 A1.7 1.7 0 1 0 10.3 17.2",
    ],
    stroke: [
      "M12 4.5 V7.4",
      "M6.6 8.4 L9 9.8",
      "M17.4 8.4 L15 9.8",
      "M8.5 18.4 H15.5",
    ],
    color: "#ff4f91",
    accent: "#ffd1e0",
  },
  probe: {
    fill: [
      "M4 12 L19.5 4.5 L15.2 12 L19.5 19.5 Z",
      "M4 12 L9.2 9.6 V14.4 Z",
      "M15 10.2 L21 12 L15 13.8 Z",
    ],
    stroke: [
      "M8.2 12 H15",
      "M6 9.2 L10 12 L6 14.8",
    ],
    color: "#f2c94c",
    accent: "#fff1a8",
  },
  crawler: {
    fill: [
      "M6 5.2 H18 L20.5 8.7 L12 11.2 L3.5 8.7 Z",
      "M4.5 10.2 L12 8.2 L19.5 10.2 L17.8 14.5 H6.2 Z",
      "M6.5 16 H17.5 L15.5 20.5 H8.5 Z",
    ],
    stroke: [
      "M4 7.5 L1.8 5.5 M20 7.5 L22.2 5.5",
      "M4.8 12.6 L2 12 M19.2 12.6 L22 12",
      "M6.4 17.5 L3.7 20 M17.6 17.5 L20.3 20",
      "M8 12 H16",
    ],
    color: "#ff5f6e",
    accent: "#ffd0d6",
  },
  spoof: {
    fill: [
      "M5 12 L10.2 4.5 L11.2 9.5 L8.8 12 L11.2 14.5 L10.2 19.5 Z",
      "M19 12 L13.8 4.5 L12.8 9.5 L15.2 12 L12.8 14.5 L13.8 19.5 Z",
      "M10.8 10.2 H13.2 V13.8 H10.8 Z",
    ],
    stroke: [
      "M12 4 V8",
      "M12 16 V20",
      "M7.2 12 H9.2",
      "M14.8 12 H16.8",
    ],
    color: "#b68cff",
    accent: "#eadfff",
  },
} as const;
