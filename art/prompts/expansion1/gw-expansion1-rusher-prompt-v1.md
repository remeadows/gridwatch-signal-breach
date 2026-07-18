# Expansion 1 Rusher — Source Prompt v1

Generated with the built-in OpenAI ImageGen tool on 2026-07-18.

Reference images:

- `art/source/phase6/gw-phase6-probe-master-v1.png`
- `art/source/phase6/gw-phase6-hunter-master-v1.png`

## Prompt

Use case: stylized-concept

Asset type: GridWatch Signal Breach Canvas2D board-sprite source master

Input images: Image 1 is the approved hostile Probe material/style anchor; Image 2 is the approved hostile Hunter material/style anchor. Use them only for camera, material, lighting, and franchise consistency; do not copy either silhouette.

Primary request: Create one isolated hostile Rusher interceptor drone. It must read as extremely fast and fragile: a very narrow low-profile delta-arrow chassis, long central forward spine pointing east/right, sharp swept-back rear stabilizer fins, compact recessed propulsion vents, and one restrained hostile magenta sensor slit. Its silhouette must be unmistakably directional and substantially narrower and more aerodynamic than the broad round Probe. No legs, claws, round central body, drill nose, turret, wings wider than its length, or bulky armor mass.

Camera: orthographic approximately 70 degrees above the board, centered, upright, entire object visible, 18% clear margin, facing east/right.

Style/medium: photorealistic pre-rendered 3D game sprite; Reactor-tech tactical industrial realism; dark machined metal, matte black ceramic armor, carbon composite seams, micro-scratches and controlled wear; high detail that remains legible at 40-55 CSS pixels.

Lighting/mood: upper-left studio key with restrained hostile red/magenta emissive accents; strong readable silhouette.

Scene/backdrop: perfectly flat solid `#00ff00` chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.

Constraints: crisp fully separated edges; generous padding; no use of `#00ff00` anywhere in the drone; no cast shadow; no contact shadow; no reflection; no particles; no trail; no route; no health bar; no text; no logo; no watermark.

## Local Processing

The source master was processed locally with the ImageGen skill's chroma-key helper using border-key detection, soft matte, and despill. The transparent result was downscaled to a 256×256 RGBA runtime PNG. Presentation-only shadows, trails, direction, health, and movement feedback remain procedural Canvas2D effects.
