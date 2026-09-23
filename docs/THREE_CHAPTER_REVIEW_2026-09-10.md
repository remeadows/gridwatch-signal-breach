# Three-chapter milestone: current-state review

Date: 2026-09-10
Review base: local `main` / `2e1f023` (PR #80)
Working branch: `codex/phase9-chapter2-sapper`
Verdict: address the findings below before treating Chapter 2 as accepted or expanding its simulator contract.

## Scope and evidence

This review covers the complete pending Chapter 2 patch (24 tracked modified
files and two new files at review start), the existing expansion renderer and
navigation, the Blender authoring pipeline, verification scripts, and the
project's current expansion/release contracts. It is not a fresh audit of every
historical PR or a claim about the live deployment.

- The original V2 campaign remains three sectors / twelve waves.
- Chapter 1 is merged: five levels / twenty-five waves.
- Chapter 2 exists locally: five more levels / twenty-five more waves, using
  the Blender Sapper. It has not received a complete recorded owner playtest.
- Chapters 3–6 have navigation slots but no authored levels.
- Expansion play is restricted to loopback hosts; it never submits scores.
- Blender CLI 5.1.0 is installed at
  `/Applications/Blender.app/Contents/MacOS/Blender`.
- Only Sapper currently has a Blender source scene/build script. Other approved
  board families are primarily image-generated raster assets.
- The local Level 1 browser screen was observed at Wave 3 Build: the grid is
  flat/procedural, the board uses raster machines, and the tool dock uses
  abbreviations rather than matching artwork. That screen is not Sapper
  acceptance evidence; Sapper starts at Level 6.

Three independent local reviews covered simulation/balance, rendering/Blender,
and contracts/progress. Existing content, progress, replay, content-report and
balance checks passed again during this review. Earlier build/audit results
remain prior-turn evidence, not newly rerun results.

## Findings

### R1 — Existing expansion enemy targeting semantics changed

Priority: P1 compatibility blocker before freezing another revision.

`src/sim/expansion/intrusions.ts:88` now derives generic-enemy target sets from
the evolving grid inside the enemy loop. Previously the target set was captured
once at the start of the tick. When an earlier enemy destroys hardware, a later
Hunter can choose a different target and move in a different direction.

A state-transition comparison against `git show HEAD` reproduces the difference
on the actual authored Level 5 terrain. Sell the initial hardware and legally
place ICE at (1,0), Firewalls at (2,1)/(3,0), and Relay at (4,1). With that ICE
damaged to one HP, an eligible Goliath at (2,0) destroys it. A following Hunter
at (1,1) moves north to (1,0) under the old code but south to (1,2) under the
current code. The map and placements are legal; enemy positions/damage form a
constructed mid-run state rather than a captured player command log. It proves
a changed transition contract, not an affected live production score. The
unchanged Chapter 1 balance hash does not cover all possible states.

Resolution: preserve the once-per-tick target snapshot for pre-existing enemy
families while letting Sapper use its approved working-grid selection. Add a
focused ordering regression and broader golden command-log replays before
claiming old expansion behavior is preserved.

### R2 — Sapper death effects can repeat through the entire build phase

Priority: P2 correctness.

`src/render/expansionRenderer.ts:155–170` draws every death event in
`state.events` using global time modulo one simulation tick.
`src/sim/expansion/waves.ts:20–31` preserves events when starting the next build
phase, and `src/expansionMain.ts:73–84` stops advancing the simulation there.
If the last enemy is a Sapper, the same blast can repeat until the next launch.
Pausing immediately after a pulse also retains the event.

Resolution: a renderer-owned effect timeline, keyed by event occurrence and
run identity, with bounded duration, reset handling, and deliberate pause
behavior. Verify last-enemy death, wave change, pause/resume, restart and victory.

### R3 — Sapper animation has no reduced-motion path

Priority: P2 accessibility.

`src/render/expansionRenderer.ts:136–170` continuously pulses target alpha and
blast radius, but `src/expansionMain.ts:92` supplies no reduced-motion or effect
quality input. The accepted original game already has those controls.

Resolution: carry the existing preferences into expansion rendering. Replace
motion with stable target/highlight information and brief bounded impact states.

### R4 — Visual approval and gameplay approval are conflated

Priority: P2 evidence/release gate.

`src/assets/board/asset-manifest.json:366` marks Sapper approved and
`docs/VISUAL_ASSET_MANIFEST.md:190` claims contextual review. The owner liked
the standalone Blender asset and authorized integration, but explicitly had
not seen it in the game; subsequent desktop/mobile acceptance was requested
and has not been recorded in this conversation.

Resolution: track source-art approval, integration authorization and in-game
desktop/mobile acceptance separately. Keep missing acceptance visibly pending;
do not infer it from implementation authorization or a green asset hash check.

### R5 — Required CI omits the dedicated Sapper contract checks

Priority: P2 verification gap.

`.github/workflows/ci.yml:45–53` runs Rusher and Latency Trap tests but omits
`verify:sapper`. Production expansion tests cover some Sapper cases, but the
dedicated script contains additional constants, tie-break and pulse exclusions.

Resolution: include `verify:sapper`, add production-Sapper cases for the
critical prototype guarantees, and enforce release asset approval on a shipping
configuration. Candidate-art validation must remain distinguishable from release.

### R6 — Splitter spawning ignores hardware removed by an earlier Sapper pulse

Priority: P2 correctness.

`src/sim/expansion/combat.ts:64–68` checks `state.grid` for child-spawn spaces
after the death-resolution loop may already have updated local `grid`.
Reproduction on actual Level 9: legally place ICE (3,3) and Relay (4,2); a
four-HP Sapper ID 1 at (3,2) and four-HP Splitter ID 2 at (4,3) die in the same
turret phase. The Sapper removes Relay (4,2), but the Splitter still treats that
space as occupied and produces one child rather than the available two.

Resolution: use the working grid at the correct point in ordered death
resolution. Add simultaneous Sapper/Splitter tests in both ID orders and prove
that old encounters without Sappers are unchanged.

### R7 — A Level 10 lesson describes a combat mechanic that does not exist

Priority: P2 player-facing correctness.

`src/data/campaigns/expansion/chapter02.ts:215` describes a Goliath absorbing
fire to protect Sappers. `src/sim/expansion/combat.ts:24` applies each turret's
damage to every enemy within range. Goliath does not consume a shot that would
otherwise hit Sapper.

Resolution: correct the encounter explanation and its intended pressure using
existing combat rules. Do not change frozen ICE behavior to fit the prose.
The Chapter 3 Arc ICE proposal must account for this existing area-damage rule;
simply calling a new weapon a swarm counter does not create a distinct role.

## End-state gaps, not claims of live production regressions

1. **Human-paced balance is unproven.** The Chapter 2 balance bot can issue up
   to five placements/repairs per 350ms tick. Its 20/20 wins end at 179–180 Core.
   `chapter02.ts:30` also adds 120 BW to every wave. These results prove
   solvability under that controller, not difficulty progression or touch
   usability. Keep the old hash as a regression fixture, add a slower controller
   and per-wave command logs, and evaluate the economy with owner playtests.
2. **The spacing comparison is confounded.** The safe and clustered full-level
   plans use different counts and coverage. Add a controlled production-Sapper
   comparison with equivalent investment/timing where spacing is the variable.
3. **Old expansion revisions are not replayable by the current dispatcher.**
   `replay.ts:17` accepts only the global current revision. The same valid Level
   2 hash/seed is rejected as r1 and accepted as r2. Expansion has never been
   publicly enabled, so this is a local compatibility/release-readiness gap.
   Add revision-aware dispatch before further revision growth and before any
   public expansion score support.
4. **Frozen balance reports omit final wave and score.** Add those fields and
   recorded winning command logs without rewriting the historical hash fixture.
5. **The art is not integrated consistently.** Expansion lacks matching tool
   artwork, strong attack feedback, movement interpolation, contact grounding,
   chapter floor themes and a coherent chapter-specific help flow. Sapper always
   faces the same direction. These are concrete presentation tasks.
6. **Target search is repeated per render frame.** A Mac-only benchmark of
   thirteen Sappers measured about 0.65ms p95 for target selection alone. This
   is not a demonstrated frame-budget failure. Cache derived targets per
   immutable state and measure actual device performance before adding support
   enemies, more effects and detailed backgrounds.
7. **Real-phone access is unresolved.** `127.0.0.1` on an iPhone is the phone,
   not this Mac. The feature gate rejects LAN hostnames. Prior mobile-size
   viewport checks must not be labeled physical iPhone testing. Include an
   explicitly local test-host configuration and real-device acceptance.
8. **Contributor instructions are stale.** `SKILLS.md` still describes Chapter
   2 as unauthored/prototype-only. The Sapper spec's opening status contradicts
   its later integration section. Update current status separately from history
   before assigning implementation to another model.
9. **Guided plans silently attempt impossible moves.** Every Level 6 trap
   coordinate in its default guided plan is on the forbidden perimeter.
   Placements fail silently. Report successful/failed plan commands and verify
   claimed tool use; do not count an attempted command as mechanic coverage.
10. **Sapper Core-contact parity needs an explicit rule.** The prototype removes
    Sapper after one two-point Core hit; production keeps it on the Core with
    contact damage each tick. Define the intended rule and update parity tests
    and teaching copy before claiming the integrated contract is exact.

## Protected evidence

- No pending change is in Supabase migrations, the Edge Function,
  leaderboard client code, or original campaign definitions.
- Chapter 1 content hashes and the sampled balance report hash are unchanged.
  This is narrower than proof of universal simulation equivalence; see R1.
- The previously rebuilt original validator bundle is byte-identical at
  `48a3ecf68be9d05e57ccabb2c90e335669a1a1808fbda814ac7ea81a952dafa6`.
- Chapter 2 sampled balance hash:
  `6c2c3d4a739d8b945bbf44a2ff0c237e65007fe77555533498d6bb21d3fd2690`.
- The machine asset registry contains sixteen families and about 854 KB of
  runtime raster assets; the existing per-family and aggregate budgets apply.

## External-review status

The CodeRabbit CLI is installed. Its local review could not complete in the
sandbox. Automatic approval review then rejected the external upload of the
uncommitted/untracked diff because that upload lacked explicit authorization
for this review. No CodeRabbit findings or clean result are claimed. The local
reviews and planning continued. No push, merge or deployment occurred.
