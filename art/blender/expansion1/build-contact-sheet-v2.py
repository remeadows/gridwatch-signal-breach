"""Render a labeled review sheet from actual candidate runtime PNGs.

blender --background --factory-startup --threads 4 --python-exit-code 1 \
  --python art/blender/expansion1/build-contact-sheet-v2.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]


def main():
    records = json.loads((ROOT / "art/source/blender-v2/provenance.json").read_text())["assets"]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    columns = 5
    rows = math.ceil(len(records) / columns)
    text_mat = bpy.data.materials.new("Contact sheet label")
    text_mat.use_nodes = True
    nodes = text_mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (.58, .73, .76, 1)
    text_mat.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])
    for index, record in enumerate(records):
        x, y = (index % columns) * 2.2, -(index // columns) * 2.5
        bpy.ops.mesh.primitive_plane_add(size=1.95, location=(x, y, 0))
        plane = bpy.context.object
        plane.name = f"Runtime raster {record['id']}"
        mat = bpy.data.materials.new(plane.name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        nodes.clear()
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = bpy.data.images.load(str(ROOT / record["runtime"]))
        texture.interpolation = "Linear"
        emission = nodes.new("ShaderNodeEmission")
        transparent = nodes.new("ShaderNodeBsdfTransparent")
        mix = nodes.new("ShaderNodeMixShader")
        output = nodes.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
        mat.node_tree.links.new(texture.outputs["Alpha"], mix.inputs[0])
        mat.node_tree.links.new(transparent.outputs[0], mix.inputs[1])
        mat.node_tree.links.new(emission.outputs[0], mix.inputs[2])
        mat.node_tree.links.new(mix.outputs[0], output.inputs["Surface"])
        plane.data.materials.append(mat)
        bpy.ops.object.text_add(location=(x, y - 1.16, .01))
        label = bpy.context.object
        label.data.body = record["id"].upper()
        label.data.align_x = "CENTER"
        label.data.size = .15
        label.data.materials.append(text_mat)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.cycles.use_denoising = False
    scene.cycles.seed = 17
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.world.color = (.013, .018, .023)
    center = Vector((4.4, -(rows - 1) * 1.25 - .16, 0))
    bpy.ops.object.camera_add(location=center + Vector((0, 0, 12)))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(columns * 2.2, rows * 2.5)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.filepath = str(ROOT / "art/source/blender-v2/gw-blender-v2-roster-contact.png")
    bpy.ops.render.render(write_still=True)
    print(f"TACTICAL_CONTACT_SHEET {scene.render.filepath}")


if __name__ == "__main__":
    main()
