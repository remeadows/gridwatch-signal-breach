import "./style.css";
import "@gridwatch/account-kit/header.css";
import { mountAccountHeader } from "@gridwatch/account-kit";
import { accountKit } from "./leaderboard/account";
import { accountNetworkingEnabled } from "./leaderboard/config";
import { isExpansionPlayEnabled, isPrototypePreviewEnabled } from "./ui/featureFlags";

const latencyTrapPreviewEnabled = isPrototypePreviewEnabled("latency-trap-preview");
const rusherPreviewEnabled = isPrototypePreviewEnabled("rusher-preview");
const sapperPreviewEnabled = isPrototypePreviewEnabled("sapper-preview");
const expansionPlayEnabled = isExpansionPlayEnabled();

// Shared GridWatch account bar (spec §2.1): same bar on every game and on Nexus.
if (accountNetworkingEnabled) mountAccountHeader(accountKit);
else document.documentElement.classList.add("account-network-disabled");

if (expansionPlayEnabled) {
  void import("./expansionMain");
} else if (latencyTrapPreviewEnabled) {
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
} else if (sapperPreviewEnabled) {
  void import("./ui/sapperPrototypePreview")
    .then(({ mountSapperPrototypePreview }) => {
      mountSapperPrototypePreview(document.body);
    })
    .catch((error: unknown) => {
      console.error("Unable to load the Sapper prototype preview.", error);
      const fallbackUrl = new URL(window.location.href);
      fallbackUrl.searchParams.delete("sapper-preview");
      window.location.replace(fallbackUrl.toString());
    });
} else {
  void import("./main");
}
