"""Read-only provenance, alpha, dimension, margin, and budget verification.

blender --background --factory-startup \
  --python art/blender/expansion1/verify-tactical-slice-v2.py
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[3]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def has_clear_margin(bounds, size=256, fraction=.11):
    # A visible pixel at x=28 leaves only 28/256=10.9375% empty columns.
    # ceil(256*.11)=29, so inclusive visible bounds must be within 29..226.
    clear_pixels = math.ceil(size * fraction)
    return min(bounds[:2]) >= clear_pixels and max(bounds[2:]) <= size - 1 - clear_pixels


def verify_approval(record):
    # Approval is owner-maintained metadata, independent of artifact integrity.
    assert type(record.get("ownerApproved")) is bool, "ownerApproved must be a boolean."


def test_approval():
    for approved in [False, True]:
        verify_approval({"ownerApproved": approved})
    for invalid in [None, 0, 1, "true", "false"]:
        try:
            verify_approval({"ownerApproved": invalid})
        except AssertionError:
            continue
        raise AssertionError(f"Invalid approval metadata accepted: {invalid!r}.")
    print("APPROVAL_METADATA_TESTS_PASS", flush=True)


def test_clear_margin():
    assert has_clear_margin([29, 29, 226, 226]), "Exact 29-pixel margin should pass."
    assert has_clear_margin([50, 60, 200, 210]), "Larger margins should pass."
    for bounds in ([28, 29, 226, 226], [29, 28, 226, 226],
                   [29, 29, 227, 226], [29, 29, 226, 227]):
        assert not has_clear_margin(bounds), f"Sub-11% margin accepted: {bounds}."
    print("CLEAR_MARGIN_BOUNDARY_TESTS_PASS", flush=True)


def main():
    test_clear_margin()
    test_approval()
    if "--self-test" in sys.argv:
        return
    manifest = json.loads((ROOT / "art/source/blender-v2/provenance.json").read_text())
    assert sha(ROOT / manifest["sourceScript"]) == manifest["sourceScriptSha256"], "Builder hash changed. Rebuild the candidate slice."
    assert sha(ROOT / manifest["rigScript"]) == manifest["rigScriptSha256"], "Rig hash changed. Rebuild the candidate slice."
    rows = []
    for record in manifest["assets"]:
        verify_approval(record)
        for field in ["model", "master", "runtime"]:
            assert sha(ROOT / record[field]) == record[f"{field}Sha256"], f"{record['id']} {field} hash differs."
        path = ROOT / record["runtime"]
        assert path.stat().st_size <= 90 * 1024, f"{record['id']} exceeds runtime budget."
        image = bpy.data.images.load(str(path))
        assert list(image.size) == [256, 256], f"{record['id']} dimensions differ."
        values = np.empty(256 * 256 * 4, dtype=np.float32)
        image.pixels.foreach_get(values)
        pixels = values.reshape((256, 256, 4))
        alpha = pixels[:, :, 3]
        yy, xx = np.where(alpha > .01)
        assert len(xx) > 0, f"{record['id']} is empty."
        bounds = [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())]
        if record["id"].startswith("floor-"):
            assert float(alpha.min()) == 1.0, "Square floor must fully cover each tile without seams."
            assert bounds == [0, 0, 255, 255], "Floor alignment is not edge-to-edge."
        else:
            assert has_clear_margin(bounds), f"{record['id']} has less than 11% clear margin."
            assert all(float(alpha[y, x]) == 0 for x, y in [(0, 0), (255, 0), (0, 255), (255, 255)]), "Object corners are not transparent."
        bpy.data.images.remove(image)
        master = bpy.data.images.load(str(ROOT / record["master"]))
        assert list(master.size) == [1024, 1024], f"{record['id']} master dimensions differ."
        bpy.data.images.remove(master)
        rows.append({"id": record["id"], "runtimeBytes": path.stat().st_size, "alphaBounds": bounds, "status": "pass"})
    total_bytes = sum(row["runtimeBytes"] for row in rows)
    assert total_bytes <= 1.5 * 1024 * 1024, "Active Blender roster exceeds 1.5 MiB."
    print(json.dumps({"assetCount": len(rows), "activeRuntimeBytes": total_bytes, "runtimeBudgetBytes": 1572864, "tacticalSliceVerification": rows}, indent=2))


if __name__ == "__main__":
    main()
