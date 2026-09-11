# Chapter 3: Shield Front

Status: mechanic contract for the approved three-chapter local milestone.
Content: Levels 11–15, five waves per level, fresh 8x8 start each time.

## Tactical decision

Normal ICE already damages every enemy in its two-tile Manhattan radius.
Arc ICE therefore earns a different role through longer reach, shield piercing,
and a bounded chain. Its single-target damage remains below normal ICE.

Shield Drones protect nearby attackers. The drone is deliberately vulnerable,
and its visible links explain which enemies receive protection. Arc ICE focuses
the drone automatically; placing it where the chain can reach a group matters
more than tapping quickly.

## Fixed initial contract

| Property | Value |
|---|---|
| Arc ICE cost / live sale / HP | 20 BW / 10 BW / 10 HP |
| Arc first-target range | Manhattan 3 |
| Arc target priority | Shield Drone first, then distance, then lowest intrusion ID |
| Arc chain | At most 3 distinct targets; each next target within Manhattan 2 of previous |
| Arc damage | 3, then 2, then 1; ignores linked shields |
| Arc firing | Every active simulation tick; no user cooldown action |
| Arc signal/blocking | No signal; ordinary hardware blocking/chew/corruption rules |
| Shield Drone HP / move cadence | 12 HP / every 3 active ticks |
| Shield Drone route/corruption | Route targeting / 8 contact ticks |
| Shield Drone chew / Core contact | 1 / 1 damage per active contact tick |
| Shield links | Manhattan 2 to other non-drone living intrusions |
| Shield reduction | Subtract 2 from normal ICE damage, minimum 1; never stacks |
| Shield exclusions | No self-protection, no drone-to-drone protection, no shielding Arc damage |
| Death effect | No children or explosion; links disappear with the drone |

All weapon damage in one combat phase uses the living enemy/shield snapshot at
the beginning of that phase. Apply deaths afterward by ascending ID, retaining
Sapper/Splitter ordering. A drone killed this phase stops shielding next phase;
there is no dependence on turret iteration order. Chain targets are chosen by
distance from the previous target then ID, without repeats or random choices.

Keep normal ICE, Sapper, the original campaign and earlier chapter behavior
unchanged. Arc and Shield Drone exist only in Chapter 3's expansion vocabulary
and configuration. Old revisions must reject new level/tool identities.

## Teaching ladder

1. Level 11: one visible shield network; compare normal ICE protection versus
   a well-positioned Arc chain.
2. Level 12: a turning route exposes the distinction between first-target reach
   and chain jump reach.
3. Level 13: split enemy groups require two coverage zones.
4. Level 14: Sappers punish tightly packed Arc/Relay clusters while Drones
   protect Rushers.
5. Level 15: a finale combining route recovery, spacing and shield focus. Use
   existing Goliath pressure without claiming that it absorbs other units' hits.

## Counter evidence

- A lone unshielded enemy takes 3 damage from Arc and 4 from normal ICE.
- A 4-damage normal ICE hit becomes 2 against a shielded non-drone target.
- Two covering drones still reduce by 2, not 4.
- Shield Drones take full normal damage and are first Arc targets when in range.
- Three chained targets receive exactly 3/2/1; a fourth receives zero.
- A chain may reach beyond the source weapon's first-target radius, but never
   crosses a gap larger than 2 or visits the same target twice.
- Equal positions/distances use stable intrusion ID, independent of array order.
- Pure mechanic tests pass before production art/content is registered.

## Presentation

Arc ICE: cool-blue dual coils with a bright bridging arc emitter, visually
distinct from normal ICE's barrel/optic. Shield Drone: elevated violet armored
disc with a luminous canopy and paired side projectors. In gameplay, thin links
identify protected enemies and a broken-link flash marks drone loss; effects
are bounded and reduced-motion friendly. Briefing and picker use the same art.
