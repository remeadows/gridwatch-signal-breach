/** A private LAN address is accepted only in the explicit development server mode. */
export function isExpansionPreviewHost(hostname: string, lanDevelopmentMode: boolean): boolean {
  if (["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) return true;
  if (!lanDevelopmentMode) return false;
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
