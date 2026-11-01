#!/usr/bin/env python3
"""Records one real Cadmium pipeline run as the data behind the isometric demo.

The pipeline needs OpenCASCADE and stays on the server, so the page replays what
it produced rather than running it. Nothing here is drawn by hand: the meshes,
graphs and sheet are the stage artifacts of `cadmium.pipeline.run_pipeline`.

    conda run -n cadmium python tools/build_iso_demo.py \\
        ../cadmium/examples/iso-test-8_cadmium_export demos/data

Writes iso8.json (stages, items, sheet SVG) and iso8.bin (decimated meshes).
Part numbers and internal names are dropped; only catalogue descriptions stay.
"""
import json
import os
import re
import sys
import tempfile
import time

import numpy as np

from cadmium.pipeline import run_pipeline

SKIP = {"Dimension", "Label"}
GRAPH_STAGES = ("graph3d", "compact", "expand")


def decimate(tris, divisions=12):
    """Vertex-cluster a triangle soup; the cell follows the part's median extent."""
    p = np.asarray(tris, dtype=np.float64)
    extent = p.max(0) - p.min(0)
    cell = max(float(np.median(extent)), 1e-6) / divisions
    keys = np.round((p - p.min(0)) / cell).astype(np.int64)
    _, first, inverse = np.unique(keys, axis=0, return_index=True, return_inverse=True)
    inverse = inverse.reshape(-1)
    verts = p[first]
    faces = inverse.reshape(-1, 3)
    keep = (faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])
    faces = faces[keep]
    used, remap = np.unique(faces, return_inverse=True)
    return verts[used], remap.reshape(-1, 3)


def main(export_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    arts, timings, marks = {}, {}, {}

    def on_event(e):
        if e.status == "start":
            marks[e.stage] = time.time()
        else:
            timings[e.stage] = round(time.time() - marks[e.stage], 3)
            if e.artifact is not None:
                arts[e.stage] = e.artifact

    with tempfile.TemporaryDirectory() as tmp:
        run_pipeline(export_dir, os.path.join(tmp, "out.dxf"), on_event=on_event, debug=False)

    scene = arts["load"]
    tags = [t[0] for t in scene["tags"]]
    metas = [json.loads(m) for m in scene["metadatas"]]
    item_tag = [row[2] for row in scene["items"]]

    baked, items = {}, {}
    cache = {}
    for mesh_i, xf_i, _color, item_i in scene["instances"]:
        kind = tags[item_tag[item_i]] if item_tag[item_i] >= 0 else None
        kind = kind or metas[item_i].get("type") or "Support"
        if kind in SKIP:
            continue
        geom_i = scene["meshes"][mesh_i][1]
        if geom_i not in cache:
            cache[geom_i] = decimate(scene["geometries"][geom_i][1])
        v, f = cache[geom_i]
        m = np.asarray(scene["transforms"][xf_i], dtype=np.float64).reshape(4, 4)
        world = v @ m[:3, :3].T + m[:3, 3]
        baked.setdefault(item_i, []).append((world, f))
        items[item_i] = {"type": kind, "desc": metas[item_i].get("description", "")}

    all_v = np.vstack([w for parts in baked.values() for w, _ in parts])
    lo, hi = all_v.min(0), all_v.max(0)
    span = float((hi - lo).max())

    pos, idx, out_items, base = [], [], [], 0
    for item_i in sorted(baked):
        v_start, i_start = base, sum(len(a) for a in idx)
        for world, f in baked[item_i]:
            pos.append(world)
            idx.append((f + base).reshape(-1))
            base += len(world)
        out_items.append({**items[item_i], "v": [v_start, base - v_start],
                          "i": [i_start, sum(len(a) for a in idx) - i_start]})

    pos = np.vstack(pos)
    idx = np.concatenate(idx)
    q = np.round((pos - lo) / span * 65535 - 32768).astype(np.int16)

    # Graph vertices keep their indices through every stage, so the page can morph.
    stages = {s: arts[s]["vertices"] for s in GRAPH_STAGES}
    edges = arts["graph3d"]["edges"]

    svg = arts["solve"]["svg"]
    w, h = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg).groups())
    green = np.array(re.findall(
        r'<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#00aa00"', svg
    ), dtype=float).reshape(-1, 2)

    with open(os.path.join(out_dir, "iso8.bin"), "wb") as fh:
        fh.write(q.tobytes())
        fh.write(idx.astype(np.uint32).tobytes())

    with open(os.path.join(out_dir, "iso8.json"), "w") as fh:
        json.dump({
            "box": {"lo": lo.round(3).tolist(), "span": round(span, 3)},
            "counts": {"verts": int(len(q)), "indices": int(len(idx))},
            "items": out_items,
            "edges": edges,
            "stages": {k: np.round(v, 2).tolist() for k, v in stages.items()},
            "timings": timings,
            "sheet": {"w": w, "h": h, "svg": svg,
                      "pipeBox": [green.min(0).round(2).tolist(), green.max(0).round(2).tolist()]},
        }, fh, separators=(",", ":"))

    print("items", len(out_items), "verts", len(q), "tris", len(idx) // 3, "timings", timings)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
