"""Build and render the Expansion 1 Sapper visual-intake asset.

Run from the repository root with Blender 5.x:

  blender --background --factory-startup \
    --python art/blender/expansion1/build-sapper-v1.py

The scene is deterministic and writes the editable .blend source, a 1024px
transparent master, and a 256px transparent runtime sprite.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND_PATH = ROOT / "art/source/expansion1/gw-expansion1-sapper-source-v1.blend"
MASTER_PATH = ROOT / "art/source/expansion1/gw-expansion1-sapper-master-v1.png"
RUNTIME_PATH = ROOT / "src/assets/board/expansion1/gw-expansion1-sapper-board-v1.png"


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.45,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    surface_noise: float = 0.0,
) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission is not None:
        shader.inputs["Emission Color"].default_value = emission
        shader.inputs["Emission Strength"].default_value = emission_strength
    if surface_noise > 0.0:
        noise = result.node_tree.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 18.0
        noise.inputs["Detail"].default_value = 5.0
        noise.inputs["Roughness"].default_value = 0.72
        bump = result.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = surface_noise
        bump.inputs["Distance"].default_value = 0.06
        result.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        result.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return result


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> bpy.types.Object:
    obj.data.materials.append(mat)
    return obj


def bevel(obj: bpy.types.Object, width: float = 0.08, segments: int = 3) -> bpy.types.Object:
    modifier = obj.modifiers.new("Machined bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    return obj


def box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    rotation_z: float = 0.0,
    bevel_width: float = 0.08,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0.0, 0.0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel(obj, bevel_width)
    return assign(obj, mat)


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 32,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    bevel(obj, min(0.06, depth * 0.12), 2)
    return assign(obj, mat)


def wedge(
    name: str,
    *,
    x_back: float,
    x_front: float,
    y_inner: float,
    y_outer: float,
    z_bottom: float,
    z_top: float,
    mat: bpy.types.Material,
    mirror: bool = False,
) -> bpy.types.Object:
    sign = -1.0 if mirror else 1.0
    points_2d = [
        (x_back, sign * y_inner),
        (x_back + 0.25, sign * y_outer),
        (x_front - 0.32, sign * (y_outer * 0.72)),
        (x_front, sign * (y_inner * 0.64)),
    ]
    vertices = [(x, y, z_bottom) for x, y in points_2d] + [
        (x, y, z_top) for x, y in points_2d
    ]
    faces = [
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel(obj, 0.1, 3)
    return assign(obj, mat)


def add_bolt(x: float, y: float, z: float, mat: bpy.types.Material) -> None:
    cylinder(
        "Armor fastener",
        (x, y, z),
        0.09,
        0.08,
        mat,
        vertices=16,
    )


def add_track(y: float, dark: bpy.types.Material, gunmetal: bpy.types.Material) -> None:
    box("Track housing", (-0.15, y, 0.38), (1.95, 0.44, 0.34), dark, bevel_width=0.16)
    box("Track armor", (0.02, y, 0.73), (1.58, 0.36, 0.12), gunmetal, bevel_width=0.07)
    for index in range(8):
        x = -1.62 + index * 0.46
        box("Track tread", (x, y, 0.16), (0.16, 0.51, 0.08), gunmetal, bevel_width=0.025)
        box("Visible tread plate", (x, y, 0.82), (0.16, 0.39, 0.055), gunmetal, bevel_width=0.025)
    for x in (-1.42, 1.18):
        cylinder(
            "Track wheel",
            (x, y, 0.43),
            0.31,
            0.16,
            gunmetal,
            vertices=24,
            rotation=(math.pi / 2, 0.0, 0.0),
        )


def build_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    black = material("Carbon black", (0.018, 0.024, 0.032, 1.0), metallic=0.62, roughness=0.34, surface_noise=0.17)
    armor = material("Gunmetal armor", (0.075, 0.09, 0.11, 1.0), metallic=0.9, roughness=0.27, surface_noise=0.2)
    edge = material("Brushed steel edges", (0.22, 0.25, 0.28, 1.0), metallic=0.96, roughness=0.22, surface_noise=0.12)
    rubber = material("Track rubber", (0.006, 0.008, 0.01, 1.0), metallic=0.05, roughness=0.62)
    magenta = material(
        "Demolition capacitor",
        (0.09, 0.003, 0.018, 1.0),
        metallic=0.58,
        roughness=0.16,
        emission=(0.7, 0.003, 0.06, 1.0),
        emission_strength=0.75,
    )
    hot_pink = material(
        "Pulse channels",
        (0.18, 0.003, 0.04, 1.0),
        metallic=0.2,
        roughness=0.24,
        emission=(1.0, 0.015, 0.24, 1.0),
        emission_strength=1.7,
    )
    core_glow = material(
        "Capacitor hot core",
        (0.24, 0.002, 0.04, 1.0),
        metallic=0.15,
        roughness=0.12,
        emission=(1.0, 0.004, 0.15, 1.0),
        emission_strength=5.0,
    )

    add_track(1.42, rubber, armor)
    add_track(-1.42, rubber, armor)

    box("Lower chassis", (-0.15, 0.0, 0.63), (1.7, 1.22, 0.42), black, bevel_width=0.22)
    box("Upper armor", (-0.25, 0.0, 1.04), (1.18, 0.92, 0.26), armor, bevel_width=0.2)
    box("Rear reactor guard", (-1.66, 0.0, 0.91), (0.42, 0.82, 0.28), armor, bevel_width=0.13)
    box("Central spine", (0.68, 0.0, 1.16), (1.04, 0.22, 0.17), edge, bevel_width=0.07)
    for side in (-1.0, 1.0):
        box("Upper side armor", (-0.46, side * 0.86, 1.2), (0.76, 0.16, 0.12), edge, rotation_z=side * 0.06, bevel_width=0.06)
        box("Reactor channel", (-0.72, side * 0.61, 1.38), (0.5, 0.055, 0.045), hot_pink, bevel_width=0.025)

    wedge(
        "Port breaching jaw",
        x_back=0.42,
        x_front=2.9,
        y_inner=0.28,
        y_outer=1.15,
        z_bottom=0.52,
        z_top=1.18,
        mat=armor,
    )
    wedge(
        "Starboard breaching jaw",
        x_back=0.42,
        x_front=2.9,
        y_inner=0.28,
        y_outer=1.15,
        z_bottom=0.52,
        z_top=1.18,
        mat=armor,
        mirror=True,
    )
    wedge(
        "Port jaw edge",
        x_back=0.72,
        x_front=2.78,
        y_inner=0.34,
        y_outer=0.92,
        z_bottom=1.18,
        z_top=1.27,
        mat=edge,
    )
    wedge(
        "Starboard jaw edge",
        x_back=0.72,
        x_front=2.78,
        y_inner=0.34,
        y_outer=0.92,
        z_bottom=1.18,
        z_top=1.27,
        mat=edge,
        mirror=True,
    )

    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=(-0.12, 0.0, 1.5), radius=0.56)
    capacitor = bpy.context.object
    capacitor.name = "Exposed demolition capacitor"
    assign(capacitor, magenta)
    for polygon in capacitor.data.polygons:
        polygon.use_smooth = True

    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, location=(-0.12, -0.08, 1.91), radius=0.27)
    hot_core = bpy.context.object
    hot_core.name = "Capacitor hot core"
    assign(hot_core, core_glow)
    for polygon in hot_core.data.polygons:
        polygon.use_smooth = True

    for major_radius, minor_radius, z in ((0.72, 0.095, 1.5), (0.84, 0.055, 1.5)):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=major_radius,
            minor_radius=minor_radius,
            major_segments=48,
            minor_segments=12,
            location=(-0.12, 0.0, z),
        )
        ring = bpy.context.object
        ring.name = "Capacitor containment ring"
        assign(ring, edge if major_radius < 0.8 else hot_pink)

    for x in (1.22, 1.52, 1.82):
        cylinder("Breaching optic", (x, 0.0, 1.36), 0.075, 0.12, hot_pink, vertices=20)

    for angle in (0.0, math.pi / 2, math.pi, math.pi * 1.5):
        x = -0.12 + math.cos(angle) * 1.08
        y = math.sin(angle) * 1.08
        box(
            "Orthogonal pulse vent",
            (x, y, 1.12),
            (0.42 if abs(math.cos(angle)) > 0.5 else 0.12,
             0.42 if abs(math.sin(angle)) > 0.5 else 0.12,
             0.09),
            hot_pink,
            rotation_z=angle,
            bevel_width=0.045,
        )

    for side in (-1.0, 1.0):
        box("Rear stabilizer", (-1.68, side * 1.12, 1.03), (0.52, 0.29, 0.2), armor, rotation_z=side * 0.18, bevel_width=0.1)
        box("Warning slit", (-1.7, side * 1.42, 1.02), (0.3, 0.055, 0.07), hot_pink, rotation_z=side * 0.18, bevel_width=0.025)

    for index in range(5):
        y = -0.48 + index * 0.24
        box("Rear cooling vent", (-1.98, y, 1.22), (0.24, 0.055, 0.055), edge, bevel_width=0.02)

    for x in (-1.15, -0.45, 0.55):
        for y in (-0.72, 0.72):
            add_bolt(x, y, 1.34, edge)

    # Camera: 70-degree elevation, aligned so +X remains screen-right/east.
    bpy.ops.object.camera_add(location=(0.0, -8.0, 22.0))
    camera = bpy.context.object
    camera.name = "Orthographic 70-degree board camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 7.6
    camera.rotation_euler = (Vector((0.15, 0.0, 0.65)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    def area_light(name: str, location: tuple[float, float, float], energy: float, size: float, color: tuple[float, float, float]) -> None:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (Vector((0.0, 0.0, 0.7)) - light.location).to_track_quat("-Z", "Y").to_euler()

    area_light("Upper-left studio key", (-7.0, -8.0, 15.0), 1450.0, 6.0, (0.82, 0.92, 1.0))
    area_light("Lower-right fill", (7.0, 5.0, 8.0), 420.0, 5.0, (0.3, 0.55, 0.72))
    area_light("Hostile magenta rim", (3.0, 6.0, 7.0), 170.0, 4.0, (1.0, 0.02, 0.17))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.pixel_aspect_x = 1.0
    scene.render.pixel_aspect_y = 1.0
    scene.render.use_file_extension = True
    scene.render.image_settings.compression = 80
    scene.render.resolution_percentage = 100
    scene.world.color = (0.003, 0.005, 0.008)
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    scene.render.filepath = str(MASTER_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)

    scene.render.resolution_x = 256
    scene.render.resolution_y = 256
    scene.render.image_settings.compression = 100
    scene.render.filepath = str(RUNTIME_PATH)
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    build_scene()
