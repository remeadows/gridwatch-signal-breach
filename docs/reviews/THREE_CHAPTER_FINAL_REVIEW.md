# Three-chapter local milestone review

Date: 2026-09-10. Scope: Expansion 1 Chapters 1–3, 15 levels / 75 waves,
Blender grid/roster, local-only acceptance. No GitHub push, deployment, DB write,
or public expansion scoring was performed.

## CodeRabbit review

The owner authorized sending the diff. The full local comparison against
`main` completed using `coderabbit review --agent --include-untracked --base main`
and returned 19 findings. This is an external CLI review, not a GitHub approval
or passing PR status. Earlier Chapter 2 findings are recorded separately in
`CODERABBIT_LOCAL_DIFF_2026-09-10.md`.

| Finding | Evaluated disposition |
| --- | --- |
| Stale 4177 handoff guidance | Fixed to dedicated local port 4391; 4392 is the credential-disabled trusted-LAN dev server. |
| Expansion changes could trigger legacy validator deployment | Fixed: handoff separates frozen V2 regeneration from separately authorized deployment and the new expansion server-first release. |
| Only Chapter 2 listed for owner acceptance | Fixed: all three authored chapters require desktop/mobile owner acceptance before publication. |
| Partial Blender rebuild can relabel retained artifacts | Fixed: compare generator, rig, Blender and render metadata before writing; reject mismatched retained records. Guard negative tests pass. All 21 artifacts were genuinely rebuilt with the corrected generator. |
| 28-pixel margin is below 11% | Fixed in Blender and Node verifiers to 29–226 inclusive; all four boundary-negative tests and all assets pass. |
| Sapper presence only checked per serialized level | Fixed: every Chapter 2 wave must contain positive Sapper weight or a scripted Sapper. |
| Shield/Arc tuning lives in simulation module | Fixed: constants now live in data/campaigns/expansion/tuning.ts with unchanged values and compatibility exports. |
| Campaign copy implies only three chapters ever | Fixed: explicitly says the first three of six planned chapters / 15 of 30 levels are locally playable. |
| Duplicate SHA-256 helpers | Deferred maintainability-only consolidation. Digest behavior already matches frozen reports. No correctness or acceptance defect is reproduced. |
| Rewrite and re-freeze historical fast-bot placements | Rejected: the approved plan explicitly retains that historical candidate-policy fixture. Duplicate candidates are documented, not sold as human plans. Current acceptance uses strict disjoint human plans and separate equal-cost spacing tests; frozen hashes stay unchanged. |
| Sapper manifest row says owner approved | Fixed: source approval and integration authorization are distinct from pending contextual release acceptance. |
| Share evidence-shape construction between generator and verifier | Deferred cleanup: independent expected-shape construction plus complete JSON comparison and direct retained-log replay are intentional independent checks. No fixture mismatch exists. |
| Missing unusual-host policy tests | Added raw uppercase, lookalike, abbreviated/integer IPv4 and private IPv6 cases; strict raw policy rejects them. Browser URL canonicalization is documented. |
| Persist low-effects choice across raw reload | Deferred preference enhancement. Current run and navigation URLs preserve selected quality; raw reload follows its explicit URL. This is not a lost progress or gameplay defect. |
| Repeated navigation parsing/availability check | Fixed: initial query and chapter availability are computed once. |
| Enabled unsupported Sapper range silently ignored | Fixed: malformed enabled ranges fail fast; disabled pulses and approved range-one behavior stay unchanged. Targeted positive/negative and retained replay tests pass. |
| Critical duplicate visual-timeline trailing block | Not present in the current source: exactly one isVisualEvent and effectDuration definition, no top-level return. Build, tool typecheck and visual tests pass. No deletion was applied based on this stale/non-reproduced finding. |
| Make Scrubber sellable | Rejected: selling sets a tile empty and would enable instant fully refunded cleanup. This matches the original non-sellable Scrubber contract. Added no-sale/no-refund and exact six-active-tick cleanup regressions; an intentional sellability mutation fails. |
| Gracefully render chapters with no floor mapping | Rejected for unauthored content: Levels 16+ are unavailable and cannot instantiate a run. All three authored chapters have strict validated mappings. Actual missing/failed image loads already fall back safely, tested for every family. No placeholder chapter is silently created. |

## Independent Codex checks

Independent passes inspected combat ordering, Arc/shield exclusions, historical
revision dispatch, progress reload boundaries, range-preview input, renderer
interpolation, mobile control layout, and Blender provenance. Reproduced issues
were fixed and retested. Additional durable gates now directly replay all 116
saved wins, perform 115 historical r1/r2 equivalents, pin all ten r2 content
hashes, and intentionally fail every Blender sprite through the real Vite loader
transform to verify glyph fallback and warning/request deduplication.

The Scrubber and malformed-pulse regressions were mutation-checked without
changing recorded fixtures. Gameplay tuning, original validator bytes, old
content reports and previous leaderboard behavior remain preserved.

## Evidence boundaries

Browser verification used the in-app Chromium browser against loopback dev
4391 and built static preview 4393, without configured Supabase credentials.
The page loaded its assets successfully and reported no console warnings/errors.
At 320×568, 390×844, 420×900, 568×320, 760×420 and 1440×900, active Chapter 3
had no horizontal overflow or offscreen buttons. This is viewport emulation,
not physical Safari/Chrome device testing. Additional breakpoint checks at
390×700, 390×701, 390×740 and 760×801 also pass; all ten cases have a square
canvas. The guide remains internally scrollable at 320×568 with its return
button reachable and all roster images loaded. Fixed observed layout issues:
the shortest portrait tool dock overflow and cramped landscape action labels;
the 700→701 portrait transition now reserves the full active HUD/dock height.
Also prevented a tall desktop sidebar from stretching the square game canvas.

Ordinary browser actions verified local title/chapter/level navigation, ICE
placement/full Build refund, Arc preview without changing 120 BW, exit plus one
20-BW placement, Field Guide art/copy/pause, low-effects toggle and pause/resume.
Chapter 3's first two waves cleared through normal controls in one check. A
production-build Chapter 1 playthrough cleared two waves, lost on wave three,
showed the failure reason, and Retry restored 48 BW / 180 Core / wave one.
No simulation or storage was injected through browser evaluation. Whole-level
wins and reload unlock boundaries are supported by the deterministic/progress
tests, not a claim of manually playing all fifteen levels in the browser.

Automated human-paced policies clear 60/60 normal and 56/60 stress cases, with
116 exact winning replays; all 60 no-action controls lose. These are paced-input
simulations, not human playtest success rates or measured phone performance.

The raster roster contains 21 Blender families, 1,058,094 bytes total; the
largest loaded level roster is 792,098 bytes. The full corrective render used
the same geometry/rig, and every alpha plane stayed identical. Small Cycles
denoising variation exists in seven images; old source/runtime artifacts remain
in a temporary backup. Model/master/runtime hashes reflect the new actual files.

The release verifier intentionally fails while ownerApproved is false. Physical
phone frame-time/heat and owner gameplay-scale art/fun acceptance are pending.
No claim of deployed or production-approved expansion is made.
