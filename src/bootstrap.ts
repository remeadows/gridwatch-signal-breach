import "./style.css";

const rusherPreviewEnabled =
  new URLSearchParams(window.location.search).get("rusher-preview") === "1";

if (rusherPreviewEnabled) {
  void import("./render/rusherVisualPreview").then(({ mountRusherVisualPreview }) => {
    mountRusherVisualPreview(document.body);
  });
} else {
  void import("./main");
}
