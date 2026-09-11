# Three-chapter Blender milestone

Status: approved and active. The owner said "Proceed" to the recommended end
state and explicitly approved sending the diff to CodeRabbit on 2026-09-10.
Date: 2026-09-10
Current base: `main` / `2e1f023`, with local Chapter 2 work on
`codex/phase9-chapter2-sapper`.

Read the companion `THREE_CHAPTER_REVIEW_2026-09-10.md` before executing this
plan. It records defects and evidence limits that the previous green test
summary did not capture.

## Approved end state

| Decision | Scope |
|---|---|
| Three chapters | Expansion Chapters 1–3, Levels 1–15, 75 waves |
| Blender assets | Consistent Blender grid and visible gameplay roster for the expansion |
| Finish line | Locally playable, reviewed, verified and committed, ready for owner acceptance |
| External review | Current game diff may be sent to CodeRabbit |

The complete six-chapter/thirty-level envelope remains the long-term roadmap.
Publication is not included in this local milestone. Preserve source-art and
contextual player acceptance as separate evidence; local implementation can
progress through the approved roster while release approval stays pending.

## Active goal

Deliver a polished, cohesive Expansion 1 milestone covering the agreed three
target chapters. Every target chapter has five authored 8x8 levels and five
waves per level, coherent Blender-authored environments and gameplay assets,
clear briefings and combat feedback, a complete chapter/level progression flow,
and balanced desktop/mobile-web play. Finish at the approved local acceptance
boundary, with evidence against the acceptance checklist below.

The scope keeps the original three-sector/twelve-wave campaign, its replay
rulesets, progress and leaderboard behavior intact. No native mobile app or
runtime 3D framework is needed: Blender constructs and renders the models;
Canvas2D displays the optimized art and tactical state. Shared GridWatchGamesDB
changes and public expansion scoring remain a separate server-first release.

## What the player should experience

- Start the expansion from the local preview's normal campaign menu, choose a
  chapter, and understand the objective and available tools before launching.
- Spend unlimited Build time preparing a route and defenses. During combat,
  deliberate repairs or replacements help, but success must not require machine
  speed or continuous rapid tapping.
- Read the Source, Core, signal path, blocked terrain, targets, damage, charges,
  corruption and danger at phone size while enemies are moving.
- See ICE firing and hitting, machines responding to damage, enemies moving
  and dying, and a brief chapter/level outcome with a clear next action.
- Lose for an understandable reason, retry quickly, keep earned unlocks after
  reload, and enter each level with fresh fixed resources.
- Encounter a new tactical decision as chapters advance. Avoid difficulty
  based solely on more HP, faster tapping or less readable effects.

Recommended human targets: early levels clear in one or two informed attempts;
Chapter 3 in one to three. Target roughly four to seven minutes per level
including ordinary Build time, with no Build countdown. These are provisional
design targets to validate, not promises established by the existing bot.

## Chapter contract

| Chapter | Levels | Tactical focus | Implementation |
|---|---:|---|---|
| Latency Front | 1–5 | Route coverage, delay and fast Rushers | Keep accepted content; add consistent art/UI and preserve simulation |
| Demolition Front | 6–10 | Bait Firewalls, spacing and repair priorities | Repair/review the current Sapper integration; retest human-paced economy |
| Shield Front | 11–15 | Swarms, support targets and chain attacks | Arc ICE and Shield Drone contract, then five authored levels |

The approved Chapter 3 names/mechanics are from the existing roadmap. The exact
contract is in `EXPANSION_CHAPTER_03_SHIELD_SPEC.md`; pure and production tests
demonstrate counters before final art/content. Existing ICE
already hits every enemy in range, so Arc ICE needs a demonstrably distinct
reach/chain decision rather than merely an area-damage label. Keep its single
target power below normal ICE and preserve existing ICE behavior. Shield Drone must show
which enemies it protects and how to break the protection. No arbitrary
cooldown buttons or aiming mode. A chapter finale can combine reviewed rules;
a unique boss family is optional and must earn its complexity.

Chapters 4–6 remain outside this milestone. Finalize one chapter contract at a
time. Chapters 1–2 remain the compatibility baseline.

## Blender CLI production contract

Executable: `/Applications/Blender.app/Contents/MacOS/Blender` (verified 5.1.0).
Reference implementation: `art/blender/expansion1/build-sapper-v1.py`.

Use deterministic Python scripts invoked with background/factory-startup mode:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python art/blender/expansion1/build-<family>-v2.py
```

This is a command pattern, not a literal executable filename. Each build script
must parse explicit output paths and support a low-resolution draft render and
a final render. Never overwrite an approved v1 source or the user's open scene.

1. Extract a small shared rig for materials, the locked approximately 70-degree
   orthographic object camera, upper-left key light, weak fill, dimensions,
   color management, rendering and provenance. Use fixed random seeds for wear.
2. Model beveled metal/ceramic/composite forms, believable fasteners, vents,
   emitter assemblies and restrained wear. Readability comes from silhouette,
   mass and a few large details; tiny noise must not dominate phone sprites.
3. Model the grid as modular floor plates, recessed seams, perimeter rails and
   void inserts. Render the floor from a perpendicular orthographic camera so
   all 64 cells align exactly with Canvas coordinates. Object sprites use the
   elevated camera for visible height; both share world lighting/materials.
4. Cache chapter floors or tile-atlas composites. Chapter themes use restrained
   material/environment differences: clean signal station, scarred demolition
   deck, shield-network power facility. Terrain has visible depth without
   obstructing cell centers or changing the screen-space projection.
5. Keep route lines, corruption, attack beams, targets, health, selection,
   trap charges and damage states procedural. Do not bake live tactical state
   into the floor or sprites.
6. Keep editable `.blend` sources under versioned `art/source/blender-v2/`, per-family
   scripts under `art/blender/expansion1/`, versioned masters and runtime files,
   and build/model/image hashes in the asset manifest. Include Blender version,
   render engine, resolution, color-space and seed in the provenance record.
7. Render native transparent masters at 1024px minimum; ordinary board sprites
   at 256px, bosses at 384px. Derive toolbar/briefing art from the same model,
   adjusting crop and lighting for small-size legibility only.
8. Test the directional Sapper with one sprite first. If rotating it rotates
   shadows/highlights implausibly, render a small directional set with fixed
   world lighting. Do not introduce dozens of animation frames speculatively.

Full replacement inventory: Source, Core, Relay, Firewall, ICE,
Scrubber, Overclock, Latency Trap; Probe, Crawler, Spoof, Hunter, Splitter,
Goliath, Rusher, Sapper; plus the approved new chapter families. Sell is an
interface action, not a physical model. Preserve accepted source versions as
rollback material. Use chapter-aware loading; do not preload future content.

## Ordered implementation packages

### A — Correctness and evidence baseline

Files: the current Chapter 2 patch, `scripts/verify-expansion-sim.ts`, relevant
replay/balance scripts, `.github/workflows/ci.yml`, current-state docs.

- Resolve review R1–R7 and add targeted reproductions for the real defects.
  Decide Sapper's Core-contact parity explicitly; test death-order interactions
  with Splitter in both ID orders and old-enemy targeting after hardware loss.
- Retain original V2 validator bytes and Chapter 1 definitions/hashes.
- Add revision-aware local replay dispatch with explicit allowed levels/hashes;
  retain golden command logs for old revisions and malformed-input rejection.
- Add a separate human-paced balance lane. Baseline: unlimited between-wave
  planning; one live action per three simulation ticks, one reaction interval
  before responding to new damage, no access to future RNG. Keep a stricter
  one-action-per-six-ticks stress profile for margin measurement.
- Record actual commands, final wave, score, integrity, uptime, money, kills,
  corruption, remaining hardware and elapsed active time. Replay saved winning
  logs through the public local replay API and compare terminal state/score.
- Report rejected guided-plan commands and actual per-tool usage. Fix the
  Level 6 plan's forbidden perimeter trap placements before claiming coverage.
- Add equivalent-cost spacing/control scenarios. Preserve the historical
  fast-bot fixture; label it as deterministic solvability rather than human QA.
- Document a development-only LAN preview configuration for real-phone testing.
  Keep the shipping flag off and never include leaderboard credentials in this
  acceptance build. Verify public builds cannot activate the dev-only gate.

Exit: the actual regression tests pass, historical contracts are accounted for,
and the baseline is reproducible before art or more chapter mechanics land.

### B — In-game Blender style slice

Files: shared authoring rig, one floor kit, Relay and ICE versioned art,
Sapper reuse/re-render as needed, manifests, renderer-only integration.

- Build a grid + Relay + ICE scene with the current Sapper as a comparison.
- Show it inside real gameplay at desktop and 320/390px widths, with route,
  selection, damage and corruption active. Produce a contact sheet as secondary
  evidence; the playable screen is the main acceptance artifact.
- Implement cached background drawing, bounded effect lifetimes, reduced motion,
  movement interpolation, contact grounding and visible ICE attack impacts.
- Keep drawing/input metrics shared; hit tests must select the same cell at
  portrait, landscape and desktop dimensions.

Exit: a coherent contextual style with readable tactics and measured performance.
The owner's full-roster local authorization permits continuing after the internal
style-slice check. Contextual desktop/mobile acceptance remains a release gate;
source generation or an agent screenshot is not owner approval.

### C — Shared roster and interface parity

- Build related families in groups of at most four, using the approved rig.
- Replace every in-scope board/picker/briefing reference consistently. Each
  tactical family gets a recognizable small silhouette and a readable purpose.
- Add versioned error-handled loading, one warning on failure, glyph fallback
  and a diagnostic art switch. Test missing sprites intentionally.
- Complete chapter/level introductions, loss reasons, accessible selected-tool
  state, pause/resume, results and next-level navigation. Remove developer
  terminology from ordinary player screens.
- Add chapter-specific floor themes through the shared grid contract.

Exit: the target chapters no longer mix new board models with obsolete tutorial
or picker art; all states remain readable in reduced-motion/low-quality modes.

### D — Finish current Chapter 2

- Validate all five maps under the slower controller and owner play sessions.
- Reassess the blanket +120 BW adjustment; author explicit per-wave grants with
  reasons. Change only unreleased Chapter 2 tuning under a clear prerelease
  revision, preserving the accepted Chapter 1 baseline.
- Ensure Level 6 teaches Sapper target priority and safe pulse spacing before
  requiring several simultaneous threats. Levels 7–10 combine that knowledge.
- Freeze twenty-five wave rows, complete command logs and measured results.
- Record desktop/mobile acceptance separately from source-art approval.

Exit: Levels 6–10 can be understood and cleared without fast-bot repair speed;
each level has a documented purpose and its increase in challenge is reviewed.

### E — Build each new target chapter separately

This package creates only Chapter 3. Chapters 4–6 remain outside the milestone.

1. Write exact mechanic constants, target/tie rules, effect ordering, exclusions,
   one-sentence teaching copy and counter-positive/counter-negative examples.
2. Implement a small pure simulator proof and the readable local demonstration.
3. Build the new families using Blender CLI once their silhouettes have a clear
   mechanic to communicate.
4. Author five maps and five waves per map: introduce, practice, combine,
   stress, finale. Cap the dock at five tools plus Sell.
5. Freeze hashes/content reports and golden replay evidence. Require four fixed
   seeds per level plus empty-build losses and human-paced runs.
6. Complete local visual, controls, progression, win/loss and performance checks.
7. Close that chapter's evidence and local review before starting the next.

Exit: no placeholder chapter, missing asset, unexplained new mechanic or pending
defect is counted as a finished chapter.

### F — Milestone acceptance and selected delivery boundary

- Run the cross-chapter checklist below and reconcile every failure.
- Save a clear handoff with current commit, content/art versions, test evidence,
  open decisions, local URL and rollback instructions.
- Make scoped local commits: correctness; renderer/style slice; related asset
  batches; completed chapter content; milestone verification. Preserve the
  current uncommitted Chapter 2 work while separating these concerns.
- If local delivery is selected, finish with the playable preview and evidence
  for owner acceptance. Do not call it deployed.
- If PR delivery is selected, run both Codex and authorized CodeRabbit review,
  publish chapter-sized PRs after local acceptance, resolve actionable findings,
  rerun affected checks, and leave required checks and conversations clean.
  The owner merges. Public expansion activation/backend compatibility is not
  implied by a PR being published or merged.

## Acceptance checklist

| Area | Required evidence |
|---|---|
| Content | Agreed target chapter count; exactly five levels per chapter/five waves per level; no placeholders |
| Complete play path | Menu → chapter → level → five waves → win/loss → retry/next/select; reload retains unlocks |
| Strategy | Every introduced mechanic has a visible counter and controlled failure example |
| Human pace | Slower action-budget runs plus owner attempts; no rapid-tap dependency; escalating challenge evaluated per level |
| Blender provenance | Rebuild scripts, editable scenes, masters, runtime files, hashes and render settings |
| Visual consistency | Matching board, picker and briefing artwork; meaningful chapter floors; clear attack/damage/death feedback |
| Tactical readability | Source/Core/Relay distinct; selection, range, path, threats and HP readable at 320px width and in grayscale |
| Input | Touch, pointer and keyboard placement/sell/launch; no overflow or hidden required controls; target size at least 44px where possible |
| Motion | Reduced-motion/low-quality modes preserve information; pause/resume/reset/last-enemy effects correct |
| Performance | Measure p95 frame time in busiest wave on agreed actual phone; target ≤16.7ms and art regression ≤2ms |
| Assets | Ordinary sprite ≤90KB, boss ≤160KB; loaded runtime art target ≤1.5MB, initial compressed transfer <2.5MB; decoded sprite memory ≤24MB |
| Device coverage | 320×568, 390×844, 420×900, 568×320, 760×420, 1440×900; plus actual iPhone Safari if available, labeled separately from emulation |
| Offline | Built static files play without configured Supabase/network service; no accidental external runtime calls |
| Compatibility | Original validator byte-identical; original progress/leaderboard safe; prior expansion revisions explicitly tested |
| Review | All actionable local findings resolved; optional external review status accurately recorded; selected GitHub gates complete |

Budgets are ceilings, not reasons to ship unreadable or unresponsive art.
If a new floor requires a budget change, measure the concrete cost and adjust
chapter loading before proposing a larger total. Physical-device performance
or owner acceptance that has not happened remains pending.

## Execution handoff rules

Every package ends with: changed files, commands run and results, screenshots or
playable URL, content/art hashes, actual acceptance status, and next package.
Do not set a goal complete because a build passes or the token budget ends.
Do not skip defects to add more levels. Review can run in parallel, but edits to
shared simulation/renderer/manifests have a single owner per package.
