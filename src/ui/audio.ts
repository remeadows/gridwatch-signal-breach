import type { SimEvent } from "../sim";

type AudioContextLike = AudioContext & {
  webkitAudioContext?: never;
};

export type AudioEngine = Readonly<{
  playEvents: (events: readonly SimEvent[]) => void;
  playUi: (kind: "select" | "start") => void;
}>;

export function createAudioEngine(): AudioEngine {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const context = AudioContextConstructor ? new AudioContextConstructor() : null;

  if (!context) {
    return {
      playEvents: () => undefined,
      playUi: () => undefined,
    };
  }

  const unlock = (): void => {
    void context.resume();
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  return {
    playUi: (kind) => {
      resumeContext(context);

      if (kind === "select") {
        playTone(context, 520, 0.028, 0.028, "triangle");
        return;
      }

      playTone(context, 330, 0.045, 0.034, "triangle");
      playTone(context, 660, 0.06, 0.028, "square", 0.045);
    },
    playEvents: (events) => {
      resumeContext(context);

      for (const event of events) {
        switch (event.type) {
          case "turretHit":
            playTone(context, 620, 0.025, 0.035, "square");
            break;
          case "tileCorrupted":
            playTone(context, 92, 0.08, 0.07, "sawtooth");
            break;
          case "routeSevered":
            playTone(context, 185, 0.09, 0.08, "triangle");
            break;
          case "coreDamaged":
            playTone(context, 58, 0.07, 0.1, "sine");
            break;
          case "intrusionNeutralized":
            playTone(context, 840, 0.045, 0.045, "triangle");
            break;
          case "intrusionMoved":
          case "intrusionSpawned":
          case "corruptionProgress":
            break;
        }
      }
    },
  };
}

function resumeContext(context: AudioContextLike): void {
  if (context.state === "suspended") {
    void context.resume();
  }
}

function playTone(
  context: AudioContextLike,
  frequency: number,
  durationSeconds: number,
  volume: number,
  type: OscillatorType,
  startDelaySeconds = 0,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime + startDelaySeconds;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);
}
