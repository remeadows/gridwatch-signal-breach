import coreUrl from "../assets/board/phase6/gw-phase6-core-board-v1.webp";
import crawlerUrl from "../assets/board/phase6/gw-phase6-crawler-board-v1.png";
import firewallUrl from "../assets/board/phase6/gw-phase6-firewall-board-v1.png";
import goliathUrl from "../assets/board/phase6/gw-phase6-goliath-board-v1.webp";
import hunterUrl from "../assets/board/phase6/gw-phase6-hunter-board-v1.png";
import probeUrl from "../assets/board/phase6/gw-phase6-probe-board-v1.png";
import relayUrl from "../assets/board/phase6/gw-phase6-relay-board-v1.png";
import scrubberUrl from "../assets/board/phase6/gw-phase6-scrubber-board-v1.png";
import sourceUrl from "../assets/board/phase6/gw-phase6-source-board-v1.png";
import overclockUrl from "../assets/board/phase6/gw-phase6-overclock-board-v1.png";
import splitterUrl from "../assets/board/phase6/gw-phase6-splitter-board-v1.png";
import spoofUrl from "../assets/board/phase6/gw-phase6-spoof-board-v1.png";
import turretUrl from "../assets/board/phase6/gw-phase6-turret-board-v1.png";

export type BoardArtMode = "glyphs" | "phase6";
export type Phase6BoardSpriteId =
  | "source"
  | "core"
  | "relay"
  | "firewall"
  | "turret"
  | "probe"
  | "crawler"
  | "spoof"
  | "hunter"
  | "splitter"
  | "goliath"
  | "scrubber"
  | "overclock";

type SpriteState = "idle" | "loading" | "ready" | "failed";

type SpriteRecord = {
  image: HTMLImageElement;
  state: SpriteState;
};

const PHASE6_SPRITES: Readonly<Record<Phase6BoardSpriteId, string>> = {
  source: sourceUrl,
  core: coreUrl,
  relay: relayUrl,
  firewall: firewallUrl,
  turret: turretUrl,
  probe: probeUrl,
  crawler: crawlerUrl,
  spoof: spoofUrl,
  hunter: hunterUrl,
  splitter: splitterUrl,
  goliath: goliathUrl,
  scrubber: scrubberUrl,
  overclock: overclockUrl,
};

const records = new Map<Phase6BoardSpriteId, SpriteRecord>();

export function getBoardArtMode(): BoardArtMode {
  const requested = new URLSearchParams(window.location.search).get("art");
  // Phase 6 is the reviewed production presentation. Keep the glyph path as a
  // query-selectable diagnostic and rollback mode, while individual image load
  // failures still fall back to the corresponding glyph at draw time.
  return requested === "glyphs" ? "glyphs" : "phase6";
}

export function preloadPhase6BoardSprites(): void {
  for (const id of Object.keys(PHASE6_SPRITES) as Phase6BoardSpriteId[]) {
    requestSprite(id);
  }
}

export function getPhase6BoardSprite(id: Phase6BoardSpriteId): HTMLImageElement | null {
  const record = requestSprite(id);
  return record.state === "ready" ? record.image : null;
}

function requestSprite(id: Phase6BoardSpriteId): SpriteRecord {
  const cached = records.get(id);

  if (cached) {
    return cached;
  }

  const image = new Image();
  image.decoding = "async";
  const record: SpriteRecord = { image, state: "loading" };
  records.set(id, record);

  image.addEventListener(
    "load",
    () => {
      const markReady = () => {
        record.state = "ready";
      };

      if (typeof image.decode === "function") {
        void image.decode().then(markReady, markReady);
      } else {
        markReady();
      }
    },
    { once: true },
  );
  image.addEventListener(
    "error",
    () => {
      record.state = "failed";
      console.warn(`GridWatch Phase 6 sprite failed to load: ${id}`);
    },
    { once: true },
  );
  image.src = PHASE6_SPRITES[id];

  return record;
}
