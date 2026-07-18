# Expansion 1 Latency Trap — Source Prompt v1

Generated with the built-in OpenAI ImageGen tool on 2026-07-18.

Reference images:

- `art/source/phase6/gw-phase6-firewall-master-v1.png`
- `art/source/phase6/gw-phase6-overclock-master-v1.png`

## Prompt

Use case: stylized-concept

Asset type: GridWatch Signal Breach Canvas2D board-sprite source master

Input images: Image 1 is the approved Firewall material, camera, and lighting anchor; Image 2 is the approved Overclock friendly-hardware material and construction anchor. Use them only for franchise consistency. Do not copy either silhouette, layout, or vertical mass.

Primary request: Create one isolated friendly LATENCY TRAP floor device for an 8x8 tactical grid. It must read as a traversable timing pad, never as a wall, turret, mine, weapon, or signal relay. Build a very low-profile octagonal armored floor plate with chamfered ramp-like edges, one large recessed central segmented induction/timing ring, and exactly three compact recessed capacitor housings arranged evenly around the center. Keep the top visually open and flat enough for an enemy drone to pass over. The three housings are permanent physical construction details; dynamic remaining-charge pips will be drawn procedurally by Canvas2D and must not be baked into the image.

Subject details: dark machined-metal outer frame, matte black ceramic panels, carbon-composite seams, tiny fasteners, micro-scratches, restrained wear, fine copper traces, and controlled electric violet-to-ice-blue emissive channels. The central ring should imply time dilation/latency through segmented concentric geometry, not through text, clocks, hourglasses, or magical symbols. Friendly, precision-engineered, compact, and premium.

Camera: orthographic approximately 70 degrees above the board, centered, upright, square footprint, entire device visible, 18% clear margin.

Style/medium: photorealistic pre-rendered 3D game sprite; Reactor-tech tactical industrial realism; extremely detailed source master that remains readable at 40-55 CSS pixels.

Lighting/mood: upper-left studio key, restrained violet and ice-blue emissive glow, strong readable silhouette and surface separation.

Scene/backdrop: perfectly flat solid `#00ff00` chroma-key background for local background removal. One uniform color only, with no shadows, gradients, texture, reflections, floor plane, or lighting variation.

Constraints: crisp fully separated edges; generous padding; no `#00ff00` anywhere in the device; no cast shadow; no contact shadow; no reflection; no particles; no trigger pulse; no route; no health bar; no charge pips; no text; no logo; no watermark.

Avoid: tall walls, raised barricades, gun barrels, antennae, relay towers, spikes, explosives, bear-trap jaws, radial blades, obvious mines, bulky generator towers, humanoid shapes, and anything that appears to block movement.

## Local Processing

The source master was PNG-optimized with only the least-significant bit of each
RGB channel removed to meet the standard 2 MB source budget, then processed
locally with the ImageGen skill's chroma-key helper using border-key detection,
soft matte, and despill. The transparent result was downscaled to a 256×256 RGBA
runtime PNG. The three remaining-charge pips, trigger pulse, selection state,
path traversal, and timing feedback remain procedural Canvas2D effects and are
not baked into the raster.
