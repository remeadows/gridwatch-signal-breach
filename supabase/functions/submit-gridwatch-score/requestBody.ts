/** Bound bytes even for chunked requests; do not trust Content-Length alone. */
export async function readReplayBody(req: Request, limit = 524288): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Invalid JSON body.");
  const all = new Uint8Array(limit);
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (bytes + value.byteLength > limit) { await reader.cancel(); throw new Error("Replay body too large."); }
      all.set(value, bytes);
      bytes += value.byteLength;
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(new TextDecoder().decode(all.subarray(0, bytes)));
}
