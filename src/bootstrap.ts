import "./style.css";

const query = new URLSearchParams(window.location.search);
const latencyTrapPreviewEnabled = query.get("latency-trap-preview") === "1";
const rusherPreviewEnabled = query.get("rusher-preview") === "1";

if (latencyTrapPreviewEnabled) {
  void import("./render/latencyTrapVisualPreview")
    .then(async ({ mountLatencyTrapVisualPreview }) => {
      await mountLatencyTrapVisualPreview(document.body);
    })
    .catch((error: unknown) => {
      console.error("Unable to load the Latency Trap visual preview.", error);
      const fallbackUrl = new URL(window.location.href);
      fallbackUrl.searchParams.delete("latency-trap-preview");
      fallbackUrl.searchParams.delete("rusher-preview");
      window.location.replace(fallbackUrl.toString());
    });
} else if (rusherPreviewEnabled) {
  void import("./render/rusherVisualPreview").then(({ mountRusherVisualPreview }) => {
    mountRusherVisualPreview(document.body);
  });
} else {
  void import("./main");
}
