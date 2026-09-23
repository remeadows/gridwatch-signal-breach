"""Rebuild the candidate Chapter 1 floor, Relay, and ICE from Blender CLI.

blender --background --factory-startup --threads 4 \
  --python art/blender/expansion1/build-tactical-slice-v2.py -- --samples 40

Each asset is independently modeled and rendered. Existing v1 art is untouched.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys

import bpy


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
spec = importlib.util.spec_from_file_location("tactical_rig_v2", HERE / "tactical-rig-v2.py")
rig = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rig)


def mount(p, *, radius=1.45):
    rig.cylinder("Eight-sided lower isolation plinth", (0, 0, .16), radius, .30, p["dark"], vertices=8, bevel=.065)
    rig.cylinder("Beveled steel foundation rim", (0, 0, .33), radius * .92, .13, p["steel"], vertices=8, bevel=.025)
    rig.cylinder("Inset armored top plate", (0, 0, .43), radius * .88, .16, p["armor"], vertices=8, bevel=.055)
    for angle in [45, 135, 225, 315]:
        a = math.radians(angle)
        x, y = math.cos(a) * radius * .71, math.sin(a) * radius * .71
        rig.bolt("Foundation captive hex bolt", x, y, .53, p["steel"], .075)
    for x in [-.86, .86]:
        for y in [-.86, .86]:
            rig.box("Vibration isolation foot", (x, y, .12), (.50, .46, .22), p["rubber"], .07)


def relay():
    p = rig.palette("cyan")
    mount(p)
    rig.cylinder("Central repeater socket", (0, 0, .60), .66, .28, p["dark"], vertices=12)
    rig.torus("Cyan socket status collar", (0, 0, .75), .49, .065, p["accent"])
    rig.cylinder("Tower ceramic shaft", (0, 0, 1.17), .38, .83, p["ceramic"], vertices=8, bevel=.055)
    rig.cylinder("Tower armor lower band", (0, 0, .91), .46, .16, p["armor"], vertices=8)
    rig.cylinder("Tower armor upper band", (0, 0, 1.49), .46, .14, p["steel"], vertices=8)
    rig.cylinder("Signal amplifier core", (0, 0, 1.77), .32, .42, p["accent"], vertices=8, bevel=.035)
    rig.cylinder("Core cap", (0, 0, 2.0), .39, .10, p["dark"], vertices=8)
    # Open split crown is the defining Relay silhouette, not a solid disk.
    for sign in [-1, 1]:
        rig.beam("Crown rising steel strut", (sign * .34, 0, 1.33), (sign * 1.06, .03, 1.93), .13, p["steel"])
        rig.beam("Crown outer antenna tine", (sign * 1.06, .03, 1.90), (sign * 1.02, .02, 2.57), .14, p["armor"])
        rig.beam("Crown inward emitter tip", (sign * 1.02, .02, 2.56), (sign * .63, .02, 2.76), .13, p["ceramic"])
        rig.beam("Crown signal strip", (sign * .98, -.11, 1.96), (sign * .95, -.11, 2.48), .045, p["accent"])
        rig.box("Side RF shield can", (sign * .77, .19, .80), (.44, .86, .45), p["armor"], .065)
        rig.box("RF cooling cover", (sign * .78, .20, 1.05), (.34, .72, .07), p["steel"], .018)
        for index in range(5):
            rig.box("RF cover cooling slit", (sign * .78, -.06 + index * .13, 1.092), (.27, .038, .014), p["dark"], .004)
        rig.beam("Shielded signal cable", (sign * .72, -.34, .73), (sign * .30, -.25, 1.23), .057, p["rubber"])
    rig.box("Front access panel", (0, -.95, .60), (.68, .36, .22), p["dark"], .035)
    for x in [-.18, 0, .18]:
        rig.box("Three front status ports", (x, -1.145, .63), (.072, .028, .10), p["accent"], .012)
    rig.cylinder("Raised crown sensing lens", (0, 0, 2.13), .19, .13, p["lens"], vertices=24, bevel=.03)


def turret():
    p = rig.palette("blue")
    mount(p, radius=1.48)
    for sign in [-1, 1]:
        for front in [-1, 1]:
            rig.box("Deployed armored stabilizer", (sign * 1.14, front * .96, .32), (.52, .72, .27), p["armor"], .075, rotation=(0, 0, sign * front * -.25))
            rig.box("Stabilizer steel crown", (sign * 1.14, front * .96, .48), (.34, .45, .06), p["steel"], .025)
    rig.cylinder("Turret traverse motor", (0, .12, .69), .88, .35, p["dark"], vertices=48)
    rig.torus("Blue traverse energy ring", (0, .12, .88), .68, .06, p["accent"])
    rig.cylinder("Rotating armored deck", (0, .12, .99), .89, .22, p["armor"], vertices=12, bevel=.07)
    rig.box("Central ICE weapon body", (0, .08, 1.26), (1.55, 1.22, .50), p["armor"], .16)
    rig.box("Recessed top spine", (0, .16, 1.54), (.35, .92, .12), p["dark"], .045)
    rig.box("Cyan top optic", (0, -.05, 1.61), (.19, .43, .035), p["accent"], .025)
    for sign in [-1, 1]:
        x = sign * .54
        rig.box("Paired ceramic barrel shield", (x, -.60, 1.31), (.47, 1.45, .40), p["ceramic"], .075)
        rig.box("Barrel dorsal cooling rail", (x, -.58, 1.54), (.20, 1.38, .09), p["dark"], .025)
        for y in [-1.05, -.78, -.50]:
            rig.box("Emitter rail blue induction band", (x, y, 1.60), (.25, .055, .05), p["accent"], .016)
        rig.cylinder("Steel emitter muzzle", (x, -1.38, 1.32), .25, .28, p["steel"], vertices=12, rotation=(math.pi / 2, 0, 0), bevel=.025)
        rig.cylinder("Recessed muzzle dark aperture", (x, -1.532, 1.32), .188, .045, p["dark"], vertices=24, rotation=(math.pi / 2, 0, 0), bevel=.012)
        rig.cylinder("Blue emitter lens", (x, -1.56, 1.32), .126, .016, p["lens"], vertices=32, rotation=(math.pi / 2, 0, 0), bevel=.005)
        rig.box("Rear power capacitor", (sign * .75, .72, 1.16), (.45, .54, .53), p["dark"], .07)
        rig.box("Capacitor steel lid", (sign * .75, .72, 1.46), (.34, .45, .08), p["steel"], .025)
        rig.beam("Armored weapon feed line", (sign * .70, .76, .90), (sign * .97, .27, .97), .075, p["copper"])
        for y in [.42, .58, .74, .9]:
            rig.box("Rear capacitor heat fin", (sign * .75, y, 1.51), (.30, .045, .035), p["dark"], .006)
    for x in [-.37, .37]:
        rig.bolt("Deck fastener", x, .48, 1.54, p["steel"])


def floor_chapter(chapter):
    accents = {1: "cyan", 2: "gold", 3: "violet"}
    body_colors = {1: (.026, .051, .060), 2: (.054, .041, .033), 3: (.033, .036, .064)}
    panel_colors = {1: (.036, .064, .073), 2: (.066, .054, .044), 3: (.046, .048, .084)}
    p = rig.palette(accents[chapter])
    p["floor"] = rig.material("Chapter deck body", body_colors[chapter], .5, .47)
    p["panel"] = rig.material("Chapter inset steel", panel_colors[chapter], .64, .40)
    p["seam"] = rig.material("Recessed deck seams", (.006, .012, .017), .35, .60)
    p["trim"] = rig.material("Deck edge highlight", (.075, .118, .128), .72, .43)
    # Exact 4x4 world footprint maps edge-to-edge to a square raster. No
    # perspective or baked neighbor geometry can shift the logical cell bounds.
    # The backing extends beyond the exact4-unit camera crop so reconstruction
    # filtering cannot introduce translucent seams at repeat boundaries.
    rig.box("Square sealed floor body with filter overscan", (0, 0, -.10), (4.12, 4.12, .2), p["floor"], .0)
    rig.box("Recessed square channel", (0, 0, .012), (3.90, 3.90, .024), p["seam"], .035)
    rig.box("Raised octagonal-corner deck panel", (0, 0, .050), (3.74, 3.74, .06), p["panel"], .105)
    for sign in [-1, 1]:
        rig.box("Vertical perimeter steel lip", (sign * 1.94, 0, .038), (.055, 3.87, .045), p["trim"], .008)
        rig.box("Horizontal perimeter steel lip", (0, sign * 1.94, .038), (3.87, .055, .045), p["trim"], .008)
        for other in [-1, 1]:
            rig.bolt("Captive recessed floor screw", sign * 1.68, other * 1.68, .092, p["steel"], .042)
    # Sparse inlaid channels stay below route contrast and don't imitate paths.
    for sign in [-1, 1]:
        rig.box("Inset cable panel", (sign * 1.57, 0, .086), (.17, 1.25, .014), p["seam"], .025)
        for y in [-.47, -.24, 0, .24, .47]:
            rig.box("Deck service vent slat", (sign * 1.57, y, .098), (.13, .065, .012), p["trim"], .006)
    rig.box("Central maintenance plate", (0, 0, .087), (1.94, 2.42, .015), p["floor"], .08)
    for sign in [-1, 1]:
        rig.box("Short cyan status inset", (sign * .65, 1.58, .09), (.22, .046, .015), p["accent"], .012)
    if chapter == 2:
        for x, y, length, angle in [(-.5, -.5, .65, .45), (.8, .3, .32, -.4), (-.1, .6, .22, .3)]:
            rig.box("Shallow demolition abrasion", (x, y, .101), (length, .020, .008), p["seam"], .005, rotation=(0, 0, angle))
        for x in [-1.4, -.95, -.5, -.05, .4, .85, 1.3]:
            rig.box("Industrial lower caution insert", (x, -1.72, .10), (.15, .085, .014), p["trim"], .015, rotation=(0, 0, -.4))
    if chapter == 3:
        rig.box("Recessed power junction plate", (0, 0, .11), (1.10, 1.20, .055), p["panel"], .10)
        for x in [-.32, 0, .32]:
            rig.box("Protected facility cable bus", (x, 0, .146), (.055, .86, .024), p["trim"], .008)
        for x in [-.78, .78]:
            rig.bolt("Junction captive screw", x, -.66, .11, p["steel"], .04)


def prism(name, points, bottom, top, mat, bevel=.045):
    vertices = [(x, y, bottom) for x, y in points] + [(x, y, top) for x, y in points]
    count = len(points)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count)]
    mesh = bpy.data.meshes.new(f"{name} mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return rig.finish(obj, name, mat, bevel)


def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    rig.finish(obj, name, mat, 0)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def radiator(p, x, y, z, count=5, width=.5):
    rig.box("Recessed heat exchanger", (x, y, z), (width + .14, .70, .09), p["dark"], .025)
    for i in range(count):
        rig.box("Individual cooling blade", (x, y - .26 + i * .52 / max(1, count - 1), z + .065), (width, .052, .07), p["steel"], .01)


def tracks(p, length=3.4, width=2.5):
    for sign in [-1, 1]:
        y = sign * width / 2
        rig.box("Armored tread housing", (-.1, y, .37), (length, .64, .56), p["dark"], .16)
        for index in range(8):
            x = -length / 2 + .16 + index * (length - .32) / 7
            rig.box("Segmented steel track shoe", (x, y, .68), (.20, .66, .12), p["steel"], .03)
        rig.box("Track inset shoulder armor", (-.1, y, .83), (length * .66, .55, .16), p["armor"], .07)


def source():
    p = rig.palette("cyan")
    mount(p, radius=1.6)
    rig.box("Broadcast station equipment trunk", (0, 0, .98), (1.26, 1.10, .94), p["armor"], .12)
    rig.cylinder("Broadcaster tower socket", (0, 0, 1.5), .61, .20, p["steel"], vertices=12)
    rig.cylinder("Broadcast mast", (0, 0, 2.05), .22, 1.02, p["ceramic"], vertices=12)
    rig.cylinder("High energy antenna core", (0, 0, 2.36), .28, .53, p["accent"], vertices=16)
    for sign in [-1, 1]:
        rig.beam("Broad lateral antenna arm", (0, 0, 2.34), (sign * 1.40, 0, 2.34), .12, p["steel"])
        rig.beam("Tall side broadcast fin", (sign * 1.40, 0, 2.1), (sign * 1.4, 0, 2.95), .13, p["ceramic"])
        rig.beam("Side cyan aperture", (sign * 1.39, -.12, 2.34), (sign * 1.39, -.12, 2.80), .046, p["accent"])
        rig.box("Auxiliary broadcast pod", (sign * 1.0, .25, .85), (.50, .80, .73), p["dark"], .09)
        radiator(p, sign * 1.0, .25, 1.25, width=.36)
        rig.beam("Tower bracing cable", (sign * 1.0, -.70, .52), (0, 0, 1.90), .044, p["steel"])
    rig.arc("Open wide broadcast crown", (0, 0, 2.34), 1.03, .095, 15, 165, p["steel"], axis="xz")
    rig.cylinder("Central mast cap", (0, 0, 2.76), .17, .22, p["lens"], vertices=16)
    rig.box("Station front service hatch", (0, -.58, 1.03), (.72, .08, .52), p["dark"], .06)
    for x in [-.21, 0, .21]:
        rig.box("Transmit indicator", (x, -.63, 1.14), (.08, .035, .15), p["accent"], .014)


def core():
    p = rig.palette("magenta")
    rig.box("Heavy square vault foundation", (0, 0, .22), (3.1, 3.0, .44), p["dark"], .21)
    rig.box("Vault armored shoulder", (0, 0, .58), (2.75, 2.63, .42), p["armor"], .18)
    rig.cylinder("Reactor sunken chamber rim", (0, 0, .95), 1.05, .36, p["steel"], vertices=12, bevel=.08)
    rig.cylinder("Reactor inner dark well", (0, 0, 1.10), .88, .10, p["dark"], vertices=48)
    sphere("Magenta protected reactor vessel", (0, 0, 1.26), (.62, .62, .66), p["accent"])
    rig.torus("Reactor upper containment ring", (0, 0, 1.75), .66, .095, p["steel"])
    rig.cylinder("Reactor visible hot core", (0, 0, 1.91), .22, .08, p["lens"], vertices=24)
    for angle in [45, 135, 225, 315]:
        a = math.radians(angle)
        x, y = math.cos(a) * 1.04, math.sin(a) * 1.04
        rig.box("Vault corner containment tower", (x, y, 1.04), (.50, .50, .96), p["armor"], .09)
        rig.bolt("Vault roof fastener", x, y, 1.55, p["steel"], .10)
        rig.beam("Reactor cage support", (x, y, 1.40), (x * .57, y * .57, 1.88), .075, p["steel"])
    for sign in [-1, 1]:
        radiator(p, sign * 1.1, 0, .84, count=6, width=.35)
        rig.box("Vault status light", (sign * .83, -1.4, .59), (.54, .04, .10), p["accent"], .018)


def firewall():
    p = rig.palette("gold")
    rig.box("Wide armored wall foundation", (0, 0, .25), (3.45, 1.75, .5), p["dark"], .14)
    for sign in [-1, 1]:
        rig.box("Barricade outward foot", (sign * 1.38, -.18, .16), (.62, 2.04, .28), p["armor"], .08)
        rig.box("Barricade tall end pillar", (sign * 1.35, .15, .95), (.48, .84, 1.35), p["steel"], .10)
    rig.box("Monolithic Firewall armor panel", (0, .20, .97), (2.52, .60, 1.45), p["armor"], .13)
    rig.box("Thick gold ceramic barrier face", (0, -.17, 1.03), (2.30, .20, 1.18), p["ceramic"], .06)
    for x in [-.94, -.47, 0, .47, .94]:
        rig.box("Vertical gold barrier bus", (x, -.30, 1.01), (.11, .08, 1.10), p["accent"], .02)
        rig.bolt("Top wall bolt", x, .17, 1.73, p["steel"], .068)
    rig.box("Firewall top reinforced cap", (0, .18, 1.74), (3.14, .80, .20), p["dark"], .08)
    for x in [-.75, 0, .75]:
        rig.box("Firewall shoulder heat sink", (x, .34, 1.89), (.38, .38, .08), p["steel"], .025)


def scrubber():
    p = rig.palette("green")
    mount(p, radius=1.38)
    rig.box("Recovery service module", (-.25, .1, .92), (1.27, 1.33, .8), p["armor"], .13)
    for x in [-.53, .06]:
        rig.cylinder("Green purification cartridge", (x, .1, 1.49), .22, .86, p["accent"], vertices=24)
        rig.cylinder("Cartridge protective cap", (x, .1, 1.96), .28, .15, p["steel"], vertices=12)
        rig.cylinder("Cartridge lower clamp", (x, .1, 1.12), .29, .16, p["dark"], vertices=12)
    rig.beam("Articulated service arm upright", (.68, .38, .7), (.98, .38, 1.54), .11, p["steel"])
    rig.beam("Service arm forward link", (.98, .38, 1.54), (.82, -.92, 1.54), .12, p["armor"])
    rig.cylinder("Downward cleansing head", (.82, -.92, 1.33), .39, .33, p["dark"], vertices=16)
    rig.torus("Green cleansing head aperture", (.82, -.92, 1.51), .28, .045, p["accent"])
    rig.cylinder("Cleansing head optic", (.82, -.92, 1.53), .14, .025, p["lens"], vertices=24)
    radiator(p, -.3, -.88, .84, width=.68)
    rig.beam("Recovery flexible service hose", (-.4, .7, .9), (.8, .6, 1.34), .085, p["rubber"])


def overclock():
    p = rig.palette("gold")
    mount(p, radius=1.38)
    rig.box("Amplifier central housing", (0, 0, .85), (1.20, 1.32, .68), p["dark"], .09)
    for x in [-.69, .69]:
        rig.cylinder("Power amplifier capacitor", (x, .04, 1.21), .31, 1.1, p["ceramic"], vertices=24)
        for z in [.79, .96, 1.13, 1.30, 1.47, 1.64]:
            rig.torus("Copper amplification coil turn", (x, .04, z), .33, .045, p["copper"])
        rig.cylinder("Gold capacitor terminal", (x, .04, 1.85), .19, .25, p["accent"], vertices=16)
        rig.cylinder("Steel capacitor top shield", (x, .04, 1.70), .39, .14, p["steel"], vertices=12)
    rig.beam("Gold high current bridge", (-.69, .04, 1.98), (.69, .04, 1.98), .09, p["accent"])
    rig.box("Central amplification controller", (0, -.59, 1.02), (.42, .35, .58), p["armor"], .06)
    for z in [.86, 1.03, 1.20]:
        rig.box("Amplifier status segment", (0, -.78, z), (.24, .02, .062), p["accent"], .011)
    radiator(p, 0, .76, .80, width=.57)


def latency_trap():
    p = rig.palette("cyan")
    rig.box("Low profile trap foundation", (0, 0, .13), (2.72, 2.72, .26), p["dark"], .17)
    rig.box("Trap inset steel plate", (0, 0, .30), (2.48, 2.48, .14), p["steel"], .14)
    rig.cylinder("Trap induction well", (0, 0, .40), .98, .14, p["dark"], vertices=48)
    for radius in [.74, .50]:
        rig.torus("Concentric delay induction channel", (0, 0, .49), radius, .047, p["accent"])
    rig.cylinder("Delay circuit center", (0, 0, .46), .31, .13, p["armor"], vertices=6)
    for angle in [45, 135, 225, 315]:
        a = math.radians(angle)
        x, y = math.cos(a) * 1.14, math.sin(a) * 1.14
        rig.box("Trap corner induction block", (x, y, .47), (.36, .36, .32), p["armor"], .05)
        rig.bolt("Trap captive fastener", x, y, .64, p["steel"])
    for x in [-.37, 0, .37]:
        rig.cylinder("Three physical charge cells", (x, -1.04, .49), .087, .08, p["lens"], vertices=16)


def probe():
    p = rig.palette("orange")
    prism("Needle drone pointed body", [(-1.3, -.55), (1.80, 0), (-1.3, .55), (-.90, 0)], .32, .70, p["armor"], .08)
    prism("Probe upper ceramic spine", [(-.91, -.27), (1.46, 0), (-.91, .27)], .70, .86, p["ceramic"], .045)
    for sign in [-1, 1]:
        prism("Probe swept stabilizer", [(-1.1, sign * .24), (-1.5, sign * 1.05), (.28, sign * .44)], .34, .51, p["steel"], .045)
        rig.beam("Probe wing signal slit", (-1.20, sign * .80, .56), (-.51, sign * .48, .56), .033, p["accent"])
        rig.cylinder("Probe compact rear thruster", (-1.20, sign * .34, .54), .17, .37, p["dark"], rotation=(0, math.pi / 2, 0), vertices=20)
    rig.cylinder("Probe target optic", (.56, 0, .92), .12, .065, p["lens"], vertices=24)


def crawler():
    p = rig.palette("red")
    rig.box("Crawler low armored hull", (0, 0, .66), (2.20, 1.43, .72), p["dark"], .25)
    rig.box("Crawler heavy upper carapace", (-.15, 0, 1.02), (1.78, 1.25, .38), p["armor"], .18)
    for side in [-1, 1]:
        for x in [-.75, 0, .75]:
            rig.beam("Crawler segmented leg inner", (x, side * .53, .77), (x + .23, side * 1.0, .53), .14, p["steel"])
            rig.beam("Crawler segmented leg outer", (x + .23, side * 1.0, .53), (x + .39, side * 1.43, .15), .12, p["armor"])
            rig.box("Crawler traction claw", (x + .39, side * 1.43, .11), (.37, .31, .16), p["dark"], .06)
        rig.box("Carapace side red slit", (-.05, side * .60, 1.09), (1.18, .055, .08), p["accent"], .022)
    radiator(p, -.45, 0, 1.25, width=.72)
    for y in [-.30, .30]:
        sphere("Crawler forward red compound optic", (1.12, y, .80), (.15, .15, .16), p["lens"])


def spoof():
    p = rig.palette("violet")
    for sign in [-1, 1]:
        prism("Split phase shell half", [(-1.35, sign * .35), (-.10, sign * 1.08), (1.43, sign * .35), (.10, sign * .18)], .42, .90, p["armor"], .10)
        prism("Phase shell ceramic shoulder", [(-.97, sign * .40), (-.12, sign * .83), (.91, sign * .40)], .90, 1.04, p["ceramic"], .05)
        rig.beam("Violet inner phase rail", (-.99, sign * .27, .84), (.98, sign * .27, .84), .065, p["accent"])
        for x in [-.62, .28]:
            rig.bolt("Phase shell recessed fastener", x, sign * .60, 1.055, p["steel"], .055)
    # Clear central negative space makes this family identifiable without glow.
    sphere("Suspended phase core", (0, 0, 1.02), (.27, .18, .24), p["lens"])


def hunter():
    p = rig.palette("red")
    prism("Hunter narrow aggressive body", [(-1.40, -.51), (.75, -.67), (1.60, 0), (.75, .67), (-1.40, .51)], .33, .85, p["armor"], .11)
    rig.box("Hunter ceramic sensor back", (-.42, 0, .99), (1.35, .76, .34), p["ceramic"], .13)
    for sign in [-1, 1]:
        prism("Hunter forward claw", [(.12, sign * .48), (1.58, sign * 1.08), (1.16, sign * .43)], .32, .64, p["steel"], .065)
        rig.box("Hunter dark skid", (-.53, sign * .81, .30), (1.67, .27, .34), p["dark"], .09)
        rig.beam("Hunter side red sensor line", (-.78, sign * .42, 1.02), (.12, sign * .42, 1.02), .04, p["accent"])
    rig.cylinder("Hunter broad targeting eye housing", (.64, 0, 1.10), .38, .23, p["dark"], vertices=16)
    rig.cylinder("Hunter red targeting eye", (.64, 0, 1.24), .24, .06, p["lens"], vertices=32)
    radiator(p, -.73, 0, 1.21, width=.56)


def splitter():
    p = rig.palette("magenta")
    rig.box("Splitter lower binding chassis", (0, 0, .31), (2.68, 1.88, .34), p["dark"], .20)
    for sign in [-1, 1]:
        sphere("Paired armored shell", (sign * .73, 0, .88), (.60, .84, .49), p["armor"])
        rig.box("Paired shell dorsal steel rail", (sign * .75, 0, 1.37), (.22, 1.09, .08), p["steel"], .035)
        for y in [-.47, 0, .47]:
            rig.box("Splitter hatch lock", (sign * .77, y, 1.44), (.34, .13, .07), p["dark"], .02)
        rig.beam("Splitter outer foot", (sign * 1.0, -.39, .47), (sign * 1.52, -.74, .14), .105, p["steel"])
    rig.cylinder("Exposed central split core", (0, 0, 1.1), .25, .63, p["accent"], vertices=16)
    rig.cylinder("Split core hot cap", (0, 0, 1.46), .18, .08, p["lens"], vertices=24)
    for y in [-.56, .56]:
        rig.beam("Frangible shell connection", (-.44, y, .82), (.44, y, .82), .085, p["accent"])


def goliath():
    p = rig.palette("magenta")
    tracks(p, length=3.65, width=2.9)
    rig.box("Goliath massive lower vault breaker", (-.16, 0, .8), (3.03, 2.41, .98), p["dark"], .22)
    rig.box("Goliath heavy layered upper armor", (-.35, 0, 1.39), (2.35, 1.98, .60), p["armor"], .20)
    rig.box("Front battering ram steel head", (1.52, 0, .75), (.60, 3.13, .98), p["steel"], .15)
    for y in [-1.08, -.54, 0, .54, 1.08]:
        rig.box("Vertical ram impact tooth", (1.87, y, .77), (.20, .30, .79), p["armor"], .055)
        rig.box("Ram magenta warning slit", (1.77, y, 1.30), (.18, .21, .06), p["accent"], .018)
    rig.cylinder("Goliath dorsal reactor housing", (-.48, 0, 1.8), .67, .26, p["steel"], vertices=12)
    rig.cylinder("Goliath magenta reactor plate", (-.48, 0, 1.97), .48, .11, p["accent"], vertices=12)
    for y in [-.78, .78]:
        radiator(p, -.75, y, 1.79, count=5, width=.60)
    for x in [-1.15, .55]:
        for y in [-.66, .66]:
            rig.bolt("Goliath large armored fastener", x, y, 1.73, p["steel"], .095)


def rusher():
    p = rig.palette("orange")
    prism("Rusher long spearhead chassis", [(-1.55, -.41), (.10, -.70), (2.0, 0), (.10, .70), (-1.55, .41)], .38, .71, p["dark"], .10)
    prism("Rusher high speed ceramic nose", [(-.64, -.32), (1.69, 0), (-.64, .32)], .71, .95, p["ceramic"], .055)
    for sign in [-1, 1]:
        rig.cylinder("Rusher side booster housing", (-.68, sign * .77, .52), .28, 1.50, p["armor"], vertices=20, rotation=(0, math.pi / 2, 0), bevel=.06)
        rig.cylinder("Rusher rear booster collar", (-1.48, sign * .77, .52), .30, .13, p["steel"], vertices=20, rotation=(0, math.pi / 2, 0))
        rig.cylinder("Rusher hot exhaust lens", (-1.56, sign * .77, .52), .19, .025, p["accent"], vertices=24, rotation=(0, math.pi / 2, 0), bevel=.008)
        rig.beam("Rusher bright side streak", (-.95, sign * .80, .81), (.12, sign * .80, .81), .04, p["accent"])
    rig.cylinder("Rusher forward sensor", (.39, 0, .97), .12, .05, p["lens"], vertices=24)


def sapper():
    p = rig.palette("magenta")
    tracks(p, length=3.2, width=2.3)
    rig.box("Sapper compact demolition chassis", (-.27, 0, .79), (2.55, 1.78, .70), p["dark"], .17)
    rig.box("Sapper upper sloped armor block", (-.51, 0, 1.16), (1.7, 1.49, .36), p["armor"], .15)
    for sign in [-1, 1]:
        prism("Sapper long split demolition jaw", [(.04, sign * .29), (.20, sign * .97), (2.21, sign * .68), (2.52, sign * .22)], .52, 1.14, p["armor"], .10)
        prism("Sapper jaw cutting steel face", [(.47, sign * .36), (.58, sign * .76), (2.12, sign * .59), (2.29, sign * .30)], 1.14, 1.24, p["steel"], .045)
        rig.box("Sapper charge warning channel", (-.61, sign * .64, 1.39), (.82, .07, .07), p["accent"], .02)
    sphere("Sapper exposed demolition capacitor", (-.29, 0, 1.54), (.50, .50, .49), p["accent"])
    rig.torus("Sapper capacitor containment", (-.29, 0, 1.60), .63, .075, p["steel"])
    rig.cylinder("Sapper hot capacitor crown", (-.29, 0, 2.0), .18, .09, p["lens"], vertices=24)
    radiator(p, -1.22, 0, 1.34, count=5, width=.34)


def arc_turret():
    p = rig.palette("blue")
    mount(p, radius=1.45)
    rig.box("Arc ICE induction control body", (0, .11, .82), (1.88, 1.51, .58), p["dark"], .12)
    for x in [-.70, .70]:
        rig.cylinder("Arc upright ceramic insulator", (x, .02, 1.46), .26, 1.30, p["ceramic"], vertices=20)
        for z in [.98, 1.17, 1.36, 1.55, 1.74]:
            rig.torus("Arc blue induction coil", (x, .02, z), .33, .055, p["accent"])
        sphere("Arc steel terminal sphere", (x, .02, 2.03), (.39, .39, .33), p["steel"])
        rig.cylinder("Arc terminal bright aperture", (x, .02, 2.33), .18, .05, p["lens"], vertices=24)
    rig.beam("Arc bridging emitter left", (-.53, .02, 2.25), (-.15, .02, 2.42), .06, p["accent"])
    rig.beam("Arc bridging emitter right", (-.15, .02, 2.42), (.53, .02, 2.25), .06, p["accent"])
    radiator(p, 0, -.89, .96, width=.86)
    for x in [-.94, .94]:
        rig.bolt("Arc deck fastener", x, .69, 1.15, p["steel"], .09)


def shield_drone():
    p = rig.palette("violet")
    rig.cylinder("Shield drone armored hovering disc", (0, 0, .66), 1.22, .42, p["dark"], vertices=12, bevel=.13)
    rig.cylinder("Shield drone steel disc shoulder", (0, 0, .92), 1.15, .20, p["steel"], vertices=12, bevel=.07)
    sphere("Shield drone violet canopy", (0, 0, 1.13), (.77, .77, .47), p["accent"])
    rig.torus("Shield drone canopy armor rim", (0, 0, 1.05), .85, .075, p["armor"])
    for sign in [-1, 1]:
        rig.beam("Shield projector outrigger", (sign * .95, 0, .82), (sign * 1.51, 0, .82), .16, p["steel"])
        rig.cylinder("Shield side projection pod", (sign * 1.56, 0, .86), .34, .53, p["armor"], vertices=12)
        rig.cylinder("Violet shield projector aperture", (sign * 1.56, 0, 1.16), .23, .08, p["lens"], vertices=24)
    for angle in [45, 135, 225, 315]:
        a = math.radians(angle)
        x, y = math.cos(a) * 1.02, math.sin(a) * 1.02
        rig.box("Disc radial armor clasp", (x, y, 1.04), (.30, .20, .16), p["armor"], .04, rotation=(0, 0, a))
    rig.cylinder("Shield canopy center sensor", (0, 0, 1.62), .16, .08, p["lens"], vertices=24)


BUILDERS = {
    "floor-chapter1": lambda: floor_chapter(1), "floor-chapter2": lambda: floor_chapter(2),
    "floor-chapter3": lambda: floor_chapter(3), "relay": relay, "turret": turret,
    "source": source, "core": core, "firewall": firewall, "scrubber": scrubber,
    "overclock": overclock, "latency-trap": latency_trap, "probe": probe,
    "crawler": crawler, "spoof": spoof, "hunter": hunter, "splitter": splitter,
    "goliath": goliath, "rusher": rusher, "sapper": sapper,
    "arc-turret": arc_turret, "shield-drone": shield_drone,
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def generator_metadata(samples):
    return {
        "version": "blender-v2-slice", "blenderVersion": bpy.app.version_string,
        "sourceScript": str(Path(__file__).resolve().relative_to(ROOT)),
        "sourceScriptSha256": sha(Path(__file__)),
        "rigScript": str((HERE / "tactical-rig-v2.py").relative_to(ROOT)),
        "rigScriptSha256": sha(HERE / "tactical-rig-v2.py"),
        "renderEngine": "CYCLES", "renderDevice": "CPU", "renderThreads": 4,
        "renderSeed": 17, "masterSamples": samples,
        "runtimeSamples": max(64, samples),
    }


def retained_records(previous, selected_assets, metadata):
    """Fail before rendering if retained assets would gain false provenance."""
    if len(set(selected_assets)) != len(selected_assets):
        raise ValueError("Duplicate --assets entries are not allowed.")
    old_records = previous.get("assets", [])
    old_ids = [record["id"] for record in old_records]
    if len(set(old_ids)) != len(old_ids) or any(asset_id not in BUILDERS for asset_id in old_ids):
        raise ValueError("Previous provenance contains duplicate or unknown asset IDs.")
    retained = [record for record in old_records if record["id"] not in selected_assets]
    if retained:
        changed = [key for key, value in metadata.items() if previous.get(key) != value]
        if changed:
            raise ValueError(
                "Partial rebuild cannot retain assets from different generator/render inputs: "
                + ", ".join(changed)
                + ". Perform an intentional full rebuild (omit --assets)."
            )
    return retained


def test_partial_rebuild_guard():
    metadata = generator_metadata(40)
    previous = {**metadata, "assets": [{"id": "relay"}, {"id": "turret"}]}
    snapshot = json.dumps(previous, sort_keys=True)
    assert retained_records(previous, ["relay"], metadata) == [{"id": "turret"}]
    assert retained_records({}, ["relay"], metadata) == []
    for key in metadata:
        changed = {**metadata, key: "different-input"}
        try:
            retained_records(previous, ["relay"], changed)
        except ValueError:
            pass
        else:
            raise AssertionError(f"Partial rebuild accepted changed {key}.")
        assert retained_records(previous, ["relay", "turret"], changed) == []
    for invalid in (["relay", "relay"],):
        try:
            retained_records(previous, invalid, metadata)
        except ValueError:
            pass
        else:
            raise AssertionError("Duplicate render selection was accepted.")
    assert json.dumps(previous, sort_keys=True) == snapshot, "Guard mutated old provenance."
    print("PARTIAL_REBUILD_GUARD_TESTS_PASS", flush=True)


def make_context_sheet(records):
    """A render-derived8x8 board context, not a production sprite atlas."""
    import numpy as np
    by_id = {record["id"]: record for record in records}
    if not all(key in by_id for key in ["floor-chapter1", "relay", "turret"]):
        return
    size, cell = 1024, 128
    pixels = np.zeros((size, size, 4), dtype=np.float32)
    pixels[:, :, 3] = 1

    def load_scaled(key, width):
        image = bpy.data.images.load(str(ROOT / by_id[key]["runtime"]))
        image.scale(width, width)
        values = np.empty(width * width * 4, dtype=np.float32)
        image.pixels.foreach_get(values)
        bpy.data.images.remove(image)
        return values.reshape((width, width, 4))

    floor = load_scaled("floor-chapter1", cell)
    for y in range(8):
        for x in range(8):
            pixels[y * cell:(y + 1) * cell, x * cell:(x + 1) * cell] = floor
    for key, positions in {
        "relay": [(1, 3), (3, 3), (5, 3), (6, 5)],
        "turret": [(2, 1), (5, 1), (2, 5), (5, 6)],
    }.items():
        sprite = load_scaled(key, 120)
        alpha = sprite[:, :, 3:4]
        for x, y in positions:
            left, top = x * cell + 4, y * cell + 4
            region = pixels[top:top + 120, left:left + 120]
            region[:, :, :3] = sprite[:, :, :3] * alpha + region[:, :, :3] * (1 - alpha)
    image = bpy.data.images.new("Candidate Chapter1 board context", width=size, height=size, alpha=True)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(ROOT / "art/source/blender-v2/gw-blender-v2-context-chapter1.png")
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", nargs="+", choices=BUILDERS, default=list(BUILDERS))
    parser.add_argument("--samples", type=int, default=40)
    parser.add_argument("--self-test", action="store_true", help="Run provenance guard checks without rendering or writing assets.")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.self_test:
        test_partial_rebuild_guard()
        return
    if args.samples < 16 or args.samples > 256:
        parser.error("--samples must be between 16 and 256")
    output = ROOT / "art/source/blender-v2/provenance.json"
    previous = json.loads(output.read_text()) if output.exists() else {}
    metadata = generator_metadata(args.samples)
    try:
        records = retained_records(previous, args.assets, metadata)
    except ValueError as error:
        parser.error(str(error))
    for asset_id in args.assets:
        rig.reset_scene()
        BUILDERS[asset_id]()
        rig.configure_scene(floor=asset_id.startswith("floor-"), samples=args.samples)
        stem = f"gw-blender-v2-{asset_id}"
        blend = ROOT / f"art/source/blender-v2/{stem}-source.blend"
        master = ROOT / f"art/source/blender-v2/{stem}-master.png"
        runtime = ROOT / f"src/assets/board/blender-v2/{stem}-board.png"
        rig.export_scene(blend, master, runtime)
        records.append({
            "id": asset_id, "status": "candidate", "ownerApproved": False,
            "camera": "orthographic-90deg-square" if asset_id.startswith("floor-") else "orthographic-70deg",
            "light": "upper-left-studio-key", "masterSize": [1024, 1024], "runtimeSize": [256, 256],
            "model": str(blend.relative_to(ROOT)), "modelSha256": sha(blend),
            "master": str(master.relative_to(ROOT)), "masterSha256": sha(master),
            "runtime": str(runtime.relative_to(ROOT)), "runtimeSha256": sha(runtime),
            "runtimeBytes": runtime.stat().st_size,
        })
        print(f"TACTICAL_ASSET_COMPLETE {asset_id} {runtime.stat().st_size} bytes", flush=True)
    make_context_sheet(records)
    records.sort(key=lambda item: list(BUILDERS).index(item["id"]))
    data = {**metadata, "assets": records}
    output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"TACTICAL_SLICE_COMPLETE {output}", flush=True)


if __name__ == "__main__":
    main()
