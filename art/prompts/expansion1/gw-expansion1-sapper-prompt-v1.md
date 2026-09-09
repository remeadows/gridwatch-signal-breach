# Expansion 1 Sapper - Blender Build Brief v1

Generated locally with Blender 5.1.0 on 2026-09-08.

## References

- `art/source/phase6/gw-phase6-probe-master-v1.png`
- `art/source/phase6/gw-phase6-hunter-master-v1.png`
- `art/source/expansion1/gw-expansion1-rusher-master-v1.png`
- `docs/EXPANSION_CHAPTER_02_SAPPER_SPEC.md`

The approved hostile assets are camera, material, lighting, and franchise
anchors only. The Sapper must not copy their silhouettes.

## Modeling brief

Use case: pre-rendered Canvas2D board sprite for the isolated Expansion 1
Chapter 2 Sapper visual-intake preview.

Primary request: build one low, heavy tracked breaching drone. It strictly
targets hardware, so it needs obvious forward demolition jaws and more mass
than the fast Rusher. A protected but visibly energized central capacitor must
communicate the six-damage orthogonal death pulse without baking the pulse
effect into the sprite. The silhouette should read as a compact armored wedge
with parallel tracks, not a flying interceptor, spider, turret, or humanoid.

Style: Reactor-tech tactical industrial realism. Use dark machined steel,
carbon-black chassis panels, segmented track armor, brushed edges, recessed
fasteners, cooling vents, restrained wear, and hostile magenta energy channels.
Keep large forms readable at 32-55 CSS pixels; fine detail supports those forms
instead of replacing them.

Camera and framing: orthographic camera at approximately 70 degrees above the
board plane; object faces east/right; centered square frame; no perspective
distortion; at least 11 percent transparent margin; no clipped tracks, jaws, or
armor.

Lighting: neutral upper-left studio key, weak lower-right blue fill, and a
restrained magenta rear rim. The body stays predominantly dark neutral metal.

Constraints: one isolated object; transparent background; no floor; no cast or
contact shadow; no text; no logo; no watermark; no health bar; no route; no
target bracket; no baked explosion, shockwave, particles, or damage state.
Contact shadow, HP, targeting, death pulse, and combat feedback remain
procedural Canvas2D effects.

## Reproducible build

Editable scene:
`art/source/expansion1/gw-expansion1-sapper-source-v1.blend`

Build script:
`art/blender/expansion1/build-sapper-v1.py`

Build script SHA-256:
`9a9d34429450fabc4fb4a6646cda16a24368f1e3315be14a94328a57f1c31c83`

Command from the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --factory-startup \
  --python art/blender/expansion1/build-sapper-v1.py
```

The script constructs every mesh, material, camera, and light; saves the
editable `.blend`; and renders both the 1024x1024 RGBA source master and the
256x256 RGBA runtime PNG from the same scene. The runtime file is not used by
the playable expansion or production sprite registry in this visual-intake
batch.
