# Blender v2 tactical roster — candidate

This package is a local authoring candidate for the first three expansion
chapters. The first contextual slice established the square Chapter 1 deck tile,
Relay repeater, and ICE turret. The complete candidate roster extends that rig
to three chapter floor treatments, all current units and enemies, Arc ICE, and
Shield Drone. It has not received owner visual acceptance.

The objects follow the tactical industrial direction: manufactured gunmetal
and ceramic bodies, exposed steel edges and fasteners, functional vents,
shielded cables, restrained cyan Relay emitters, and blue ICE optics. Relay's
open antenna crown and ICE's twin emitter barrels provide distinct silhouettes.

## Rebuild

Run from the project root using a separate Blender background process:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 4 --python-exit-code 1 --python art/blender/expansion1/build-tactical-slice-v2.py -- --samples 40 --assets floor-chapter1 relay turret floor-chapter2
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python art/blender/expansion1/verify-tactical-slice-v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 4 --python-exit-code 1 --python art/blender/expansion1/build-contact-sheet-v2.py
```

`tactical-rig-v2.py` contains reusable material, geometry, lighting, framing,
rendering, and export helpers. `build-tactical-slice-v2.py` contains separate
models for each family. `--assets relay` or `--assets turret` permits focused
candidate iteration; `provenance.json` merges each invocation's new asset records
with the previously generated records. Render at most four related families per
invocation during review. Omit `--assets` only for an intentional full rebuild.

The complete 21-family roster is:

| Group | Family IDs |
|---|---|
| Chapter deck tiles | `floor-chapter1`, `floor-chapter2`, `floor-chapter3` |
| Signal and defense | `source`, `core`, `relay`, `firewall`, `turret` |
| Support hardware | `scrubber`, `overclock`, `latency-trap`, `arc-turret` |
| Threats | `probe`, `crawler`, `spoof`, `hunter`, `splitter`, `goliath`, `rusher`, `sapper`, `shield-drone` |

All runtime candidates together must fit the 1.5 MiB roster budget. Each source
scene is independently editable; common materials and framing live in the rig.

The completed 21-family render on 2026-09-10 totals 1,058,144 runtime bytes
(1.009 MiB). The independent Blender verifier passed all model/master/runtime
hashes, 1024/256 dimensions, transparent object corners, at least 29 pixels of
object margin, and fully opaque floor borders. These checks establish asset
integrity and geometry alignment; gameplay-scale visual approval remains pending.

The scene uses Cycles on four CPU threads, a fixed seed of 17, 40 master
samples, and 64 runtime samples. All rendering happens offline. The process
does not load or alter a user's open Blender scene. Reproducible geometry and
render inputs are the contract; exact render bytes can vary with Blender or
denoiser versions. The recorded hashes identify the actual reviewed outputs.

## Camera and integration contract

- Object camera: orthographic, exactly 70 degrees above the board plane,
  screen-right equals world +X, at least 11% transparent margin on all sides.
- Floor camera: orthographic, exactly 90 degrees, 4×4 world units mapped to a
  256×256 square. The backing overscans the camera crop by 0.06 world units per
  edge to avoid antialias transparency seams. The tile is fully opaque and
  reaches all four edges. Repeat
  it over the simulation's existing 8×8 cell rectangles without perspective.
- Lighting: broad upper-left studio key, weaker lower-right fill, restrained
  neutral edge light. No baked cast shadow, ground plane, labels, route,
  selection, damage bars, or runtime state is included in the object sprites.
- Output: independently editable `.blend` scenes, 1024×1024 RGBA source
  masters, and 256×256 RGBA runtime PNGs below 90 KiB per family.
- Only files under `src/assets/board/blender-v2/` are runtime candidates.
  Models, masters, provenance, and the context image are source/review material.
- `gw-blender-v2-context-chapter1.png` composites the real runtime sprites over
  an 8×8 field of the rendered floor tile. It is a readability review image,
  not a sprite atlas or a replacement for contextual gameplay testing.
- `gw-blender-v2-roster-contact.png` labels every generated candidate using its
  actual runtime raster. Rebuild this review sheet after the final model batch.

Existing approved v1 sources are untouched. The new files deliberately have a
new versioned directory and filename prefix. Preserve those older sources for
comparison and rollback. The `ownerApproved` values in the provenance file stay
false until actual gameplay-scale desktop and mobile acceptance is recorded.
