import { getCurrentWave } from "../sim/waves";
import type { EnemyKind, GameState, PlayerTool, WaveDefinition } from "../sim";
import { getToolReadout } from "./toolInfo";

export type PlayNotice = Readonly<{
  message: string;
  tone: "good" | "bad" | "info";
  expiresAt: number;
}>;

export type PlayUiOptions = Readonly<{
  root: HTMLElement;
  state: GameState;
  selectedTool: PlayerTool;
  buildMode: boolean;
  paused: boolean;
  notice: PlayNotice | null;
  now: number;
  onLaunchWave: () => void;
}>;

export type BuildWavePresentation = Readonly<{
  isBossWave: boolean;
  title: string;
  detail: string;
  action: string;
}>;

const ENEMY_LABELS: Readonly<Record<EnemyKind, string>> = {
  probe: "Probe",
  crawler: "Crawler",
  spoof: "Spoof",
  hunter: "Hunter",
  splitter: "Splitter",
  goliath: "Goliath",
};

export function renderPlayUi(options: PlayUiOptions): void {
  const { root, state, selectedTool, buildMode, paused, notice, now, onLaunchWave } = options;

  if (paused || state.phase === "won" || state.phase === "lost") {
    root.hidden = true;
    return;
  }

  root.hidden = false;
  root.className = "play-ui";

  const wave = getCurrentWave(state);
  const key = `${wave.id}-${buildMode ? "build" : "live"}`;

  if (root.dataset.playUiKey !== key) {
    root.innerHTML = "";
    root.dataset.playUiKey = key;

    if (buildMode) {
      root.append(createBuildBar(state, onLaunchWave));
    }

    const readout = document.createElement("div");
    readout.className = "tool-readout";
    readout.dataset.toolReadout = "true";
    root.append(readout);
  }

  const readout = root.querySelector<HTMLElement>("[data-tool-readout]");
  if (!readout) {
    return;
  }

  const activeNotice = notice && notice.expiresAt > now ? notice : null;
  readout.dataset.tone = activeNotice?.tone ?? "info";
  readout.textContent = activeNotice?.message ?? getToolReadout(state, selectedTool);
  readout.setAttribute("aria-live", activeNotice ? "polite" : "off");
}

function createBuildBar(state: GameState, onLaunchWave: () => void): HTMLElement {
  const wave = getCurrentWave(state);
  const bar = document.createElement("section");
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  const launch = document.createElement("button");
  const presentation = getBuildWavePresentation(wave);

  bar.className = presentation.isBossWave
    ? "build-bar boss-build-bar"
    : "build-bar";
  bar.setAttribute("aria-label", "Build phase wave intelligence");
  copy.className = "build-intel";
  title.textContent = presentation.title;
  detail.textContent = presentation.detail;
  launch.type = "button";
  launch.className = "neon-button neon-button-primary build-launch";
  launch.textContent = presentation.action;
  launch.addEventListener("click", onLaunchWave);

  copy.append(title, detail);
  bar.append(copy, launch);
  return bar;
}

export function getBuildWavePresentation(
  wave: WaveDefinition,
): BuildWavePresentation {
  const enemies = getWaveEnemyLabels(wave.enemyWeights, wave.scriptedSpawns);
  const isBossWave =
    wave.enemyWeights.goliath > 0 ||
    (wave.scriptedSpawns ?? []).some((spawn) => spawn.kind === "goliath");

  if (isBossWave) {
    return {
      isBossWave,
      title: `⚠ BOSS BUILD · W${wave.id} · +${wave.bandwidthGrant} BW`,
      detail: `${wave.maxSpawnedIntrusions} ${enemies} · GOLIATH INBOUND · ALL EDGES`,
      action: `ENGAGE W${wave.id} ▸`,
    };
  }

  return {
    isBossWave,
    title: `BUILD · W${wave.id} · +${wave.bandwidthGrant} BW`,
    detail:
      wave.id === 1
        ? `${wave.maxSpawnedIntrusions} ${enemies} · W · ICE attacks · Firewall blocks`
        : `${wave.maxSpawnedIntrusions} ${enemies} · ${wave.spawnEdges
            .map((edge) => edge[0].toUpperCase())
            .join("/")}`,
    action: `LAUNCH W${wave.id} ▸`,
  };
}

function getWaveEnemyLabels(
  weights: Readonly<Record<EnemyKind, number>>,
  scriptedSpawns: readonly Readonly<{ kind: EnemyKind }>[] | undefined,
): string {
  const kinds = (Object.keys(weights) as EnemyKind[]).filter((kind) => weights[kind] > 0);

  for (const scripted of scriptedSpawns ?? []) {
    if (!kinds.includes(scripted.kind)) {
      kinds.push(scripted.kind);
    }
  }

  return kinds.map((kind) => ENEMY_LABELS[kind]).join("/");
}
