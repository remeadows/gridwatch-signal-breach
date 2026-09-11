"""Read-only provenance, alpha, dimension, margin, and budget verification.

blender --background --factory-startup \
  --python art/blender/expansion1/verify-tactical-slice-v2.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[3]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    manifest = json.loads((ROOT / "art/source/blender-v2/provenance.json").read_text())
    assert sha(ROOT / manifest["sourceScript"]) == manifest["sourceScriptSha256"], "Builder hash changed. Rebuild the candidate slice."
    assert sha(ROOT / manifest["rigScript"]) == manifest["rigScriptSha256"], "Rig hash changed. Rebuild the candidate slice."
    rows = []
    for record in manifest["assets"]:
        assert record["ownerApproved"] is False, "Candidate authoring package must not claim owner approval."
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
            assert min(bounds[:2]) >= 28 and max(bounds[2:]) <= 227, f"{record['id']} has less than 11% clear margin."
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
