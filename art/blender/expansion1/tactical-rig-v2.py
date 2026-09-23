"""Shared deterministic Blender authoring rig for Signal Breach raster assets.

Pure source-authoring helpers: no downloads, UI calls, or external dependencies.
Object sprites use a 70-degree orthographic camera; floor tiles use 90 degrees.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def material(name, color, metallic=0.0, roughness=0.4, emission=None, strength=0.0, noise=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission is not None:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = strength
    if noise:
        texture = mat.node_tree.nodes.new("ShaderNodeTexNoise")
        texture.inputs["Scale"].default_value = 38.0
        texture.inputs["Detail"].default_value = 3.0
        texture.inputs["Roughness"].default_value = 0.68
        bump = mat.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = noise
        bump.inputs["Distance"].default_value = 0.022
        mat.node_tree.links.new(texture.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def palette(accent="cyan"):
    colors = {
        "cyan": (0.0, 0.85, 0.69), "blue": (0.03, 0.38, 1.0),
        "gold": (1.0, .55, .025), "green": (.025, .95, .20),
        "magenta": (1.0, .015, .25), "violet": (.48, .045, 1.0),
        "red": (1.0, .035, .055), "orange": (1.0, .19, .025),
    }
    emission = colors[accent]
    return {
        "dark": material("Carbon composite", (0.028, 0.037, 0.045), .45, .4, noise=.11),
        "armor": material("Gunmetal ceramic armor", (.115, .145, .165), .75, .31, noise=.08),
        "steel": material("Satin steel machined edges", (.34, .40, .43), .92, .25, noise=.035),
        "ceramic": material("Pale ceramic insulator", (.34, .40, .40), .14, .33),
        "rubber": material("Dark elastomer", (.011, .016, .020), .0, .65),
        "accent": material("Semantic emitter", tuple(c * .12 for c in emission), .35, .22, emission, 2.0),
        "lens": material("Recessed optic hot center", (.25, .45, .48), .2, .18, tuple(.45 + c * .55 for c in emission), 2.1),
        "copper": material("Shielded copper bus", (.31, .16, .055), .8, .32),
    }


def finish(obj, name, mat, bevel=0.04):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Manufactured edge radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
    if obj.type == "MESH":
        modifier = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        modifier.keep_sharp = True
        modifier.weight = 50
    return obj


def box(name, location, size, mat, bevel=.04, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cylinder(name, location, radius, depth, mat, vertices=48, rotation=(0, 0, 0), bevel=.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=location, rotation=rotation)
    return finish(bpy.context.object, name, mat, bevel)


def torus(name, location, radius, tube, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=12,
        major_radius=radius, minor_radius=tube, location=location, rotation=rotation)
    obj = finish(bpy.context.object, name, mat, 0)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def beam(name, start, end, radius, mat, vertices=12):
    start, end = Vector(start), Vector(end)
    direction = end - start
    obj = cylinder(name, (start + end) / 2, radius, direction.length, mat, vertices, bevel=.012)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def bolt(name, x, y, z, mat, radius=.065):
    cylinder(name, (x, y, z), radius, .045, mat, vertices=6, bevel=.007)


def arc(name, center, radius, tube, start_deg, end_deg, mat, axis="xy"):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = tube
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    count = 40
    spline.points.add(count)
    for index in range(count + 1):
        angle = math.radians(start_deg + (end_deg - start_deg) * index / count)
        a, b = math.cos(angle) * radius, math.sin(angle) * radius
        point = (center[0] + a, center[1] + b, center[2]) if axis == "xy" else (center[0] + a, center[1], center[2] + b)
        spline.points[index].co = (*point, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def add_light(name, location, energy, size, color):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (Vector((0, 0, .6)) - light.location).to_track_quat("-Z", "Y").to_euler()


def configure_scene(*, floor=False, samples=40):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.seed = 17
    scene.cycles.use_animated_seed = False
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = .035
    scene.cycles.max_bounces = 5
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 100
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = 1.0
    scene.render.pixel_aspect_y = 1.0
    scene.render.use_file_extension = True
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.045, .055, .065, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .3
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = .6
    # +Y is screen up. The key therefore comes from world upper-left, not
    # camera-left/front; this convention is shared by object and floor rigs.
    add_light("Upper-left broad studio key", (-5, 6, 10), 1250, 6, (.83, .93, 1))
    add_light("Lower-right soft fill", (5, -4, 7), 380, 5, (.54, .68, .82))
    add_light("Neutral edge separator", (1, 4, 5), 210, 4, (.75, .92, 1))
    elevation = math.radians(90 if floor else 70)
    bpy.ops.object.camera_add(location=(0, -20 * math.cos(elevation), 20 * math.sin(elevation) + .8))
    camera = bpy.context.object
    camera.name = "Board square top-down camera" if floor else "Locked 70 degree object camera"
    camera.data.type = "ORTHO"
    camera.rotation_euler = (Vector((0, 0, .8)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    bpy.context.view_layer.update()
    if floor:
        camera.data.ortho_scale = 4
    else:
        mesh_objects = [obj for obj in scene.objects if obj.type in {"MESH", "CURVE"}]
        inverse_rotation = camera.rotation_euler.to_matrix().transposed()
        corners = [inverse_rotation @ (obj.matrix_world @ Vector(point) - camera.location) for obj in mesh_objects for point in obj.bound_box]
        low_x, high_x = min(p.x for p in corners), max(p.x for p in corners)
        low_y, high_y = min(p.y for p in corners), max(p.y for p in corners)
        center_offset = camera.rotation_euler.to_matrix() @ Vector(((low_x + high_x) / 2, (low_y + high_y) / 2, 0))
        camera.location += center_offset
        camera.data.ortho_scale = max(high_x - low_x, high_y - low_y) / .76
    return scene


def export_scene(blend_path: Path, master_path: Path, runtime_path: Path):
    for path in (blend_path, master_path, runtime_path):
        path.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    bpy.context.preferences.filepaths.save_version = 0
    scene.render.resolution_x = scene.render.resolution_y = 1024
    scene.render.filepath = str(master_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.render.render(write_still=True)
    scene.render.resolution_x = scene.render.resolution_y = 256
    scene.cycles.samples = max(64, scene.cycles.samples)
    scene.render.filepath = str(runtime_path)
    bpy.ops.render.render(write_still=True)
    if runtime_path.stat().st_size > 90 * 1024:
        raise RuntimeError(f"Runtime sprite exceeds 90 KiB: {runtime_path}")
