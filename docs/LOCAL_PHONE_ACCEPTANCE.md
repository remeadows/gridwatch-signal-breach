# Local browser acceptance

Port 4177 currently serves GridWatch Match and must not be replaced. Ports 4175
and 4176 belong to GridWatchZero. Signal Breach uses port 4391 for development
acceptance; a phone cannot reach the Mac's loopback address.

For physical-phone acceptance on the same trusted Wi-Fi network, run:

```sh
npm run dev:phone
```

Use Vite's printed private Network address on port 4392 and append
`?expansion-nav=1`. This explicit development mode accepts private IPv4 hosts
only. Do not forward the port or expose it to the internet. Stop the server
after acceptance. The regular production build always compiles the LAN gate
off, even if built with `--mode lan-preview`. This mode also suppresses the
`VITE_` environment prefix, so leaderboard configuration is not exposed.

The expansion never submits scores. Do not copy tokens or attempt fabricated
score submissions. Preserve existing browser saves: the phone, the Mac, and
each hostname/port have independent local progress namespaces.

Acceptance checklist (record browser/device and date):

- Start the expansion from the chapter menu; see Chapters 1–3 and later locked
  roadmap chapters without them being represented as finished content.
- Place and sell the intended cell at 320px, 390px, landscape and desktop sizes.
- Read Source/Core, Relay, Firewall, ICE, Arc ICE, threat shapes and signal lines.
- Check Field Guide/picker art against the board; pause, resume, reset and reload.
- In Chapter 2 see the Sapper's target and finite orthogonal pulse, not a ring
  implying diagonal damage. In Chapter 3 distinguish shields and chain attacks.
- Finish or lose a level, read its reason/results, retry and continue normally.
- Repeat with reduced motion and low effects. Note stutter, heat, unreadable
  sprites, blocked controls, accidental placement or unexpected scrolling.

Automated viewport checks and deterministic paced controllers are useful
evidence, but are not a substitute for this physical-device acceptance.
