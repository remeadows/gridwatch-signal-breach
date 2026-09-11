import { isExpansionPreviewHost } from "../src/ui/previewHostPolicy";
for (const host of ["localhost", "127.0.0.1", "[::1]", "::1"]) {
  if (!isExpansionPreviewHost(host, false)) throw new Error(`Loopback rejected: ${host}`);
}
for (const host of ["10.0.0.4", "172.16.0.1", "172.31.255.254", "192.168.1.7"]) {
  if (!isExpansionPreviewHost(host, true) || isExpansionPreviewHost(host, false)) throw new Error(`LAN dev gate failed: ${host}`);
}
for (const host of ["gridwatch-signalbreach.warsignallabs.net", "172.15.1.1", "172.32.1.1", "192.169.1.1", "10.0.0.999", "010.0.0.1", "10.0.0.1.attacker.test", "example.com", "8.8.8.8", "0.0.0.0"]) {
  if (isExpansionPreviewHost(host, true) || isExpansionPreviewHost(host, false)) throw new Error(`Nonprivate host accepted: ${host}`);
}
console.log("Preview policy passed: loopback always; private LAN only with dev opt-in; public hosts rejected.");
