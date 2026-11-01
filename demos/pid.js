/* P&ID reader, live. A drawing is rasterised, degraded like a scan, then read back from its
   pixels alone: threshold, deskew, despeckle, find closed shapes (equipment and instruments),
   extract straight runs (pipe), match what is left against a symbol library, read the tags,
   and join it all into a connectivity graph that can answer questions.

   read() never sees the drawing model. The model is used to paint pixels and, separately,
   to score the result, which is why the score can drop when the scan gets worse. */
(function () {
  'use strict';

  var W = 1280, H = 820, FONT = "700 14px 'Fira Mono', ui-monospace, monospace", FONT_S = "700 12px 'Fira Mono', ui-monospace, monospace";

  /* ═══ the drawings ═══════════════════════════════════════════════════
     lines: polylines, with `from`/`to` naming the equipment they end on.
     inline: symbols sitting on a line, by index and position.          */
  var DRAWINGS = {
    skid: {
      label: 'Feed pump skid', title: 'FEED PUMP SKID',
      equip: [
        { tag: 'T-101', kind: 'tank', x: 90, y: 300, w: 130, h: 300, tx: 118, ty: 628 },
        { tag: 'P-101A', kind: 'pump', x: 390, y: 380, tx: 356, ty: 338 },
        { tag: 'P-101B', kind: 'pump', x: 390, y: 540, tx: 356, ty: 498 },
        { tag: 'D-101', kind: 'vessel', x: 1000, y: 250, w: 90, h: 310, tx: 1110, ty: 280 },
        { tag: 'E-101', kind: 'hx', x: 620, y: 100, w: 170, h: 60, tx: 680, ty: 90 }
      ],
      lines: [
        { pts: [[220, 380], [362, 380]], from: 'T-101', to: 'P-101A', tag: '6-PW-101', tp: [232, 408] },
        { pts: [[220, 540], [362, 540]], from: 'T-101', to: 'P-101B', tag: '6-PW-102', tp: [232, 568] },
        { pts: [[418, 380], [640, 380], [640, 540], [418, 540]], from: 'P-101A', to: 'P-101B', tag: '4-PW-103', tp: [538, 466] },
        { pts: [[640, 460], [1000, 460]], to: 'D-101', tag: '4-PW-104', tp: [838, 488] },
        { pts: [[1045, 250], [1045, 130], [790, 130]], from: 'D-101', to: 'E-101', tag: '3-VP-105', tp: [804, 158] },
        { pts: [[620, 130], [230, 130]], from: 'E-101', tag: '3-VP-106', tp: [246, 158], end: 'TO V-201', ep: [120, 136] },
        { pts: [[1045, 560], [1045, 700], [480, 700]], from: 'D-101', tag: '2-DR-107', tp: [545, 728], end: 'TO DRAIN', ep: [376, 706] }
      ],
      inline: [
        { tag: 'HV-101', kind: 'gate', line: 0, x: 292, y: 380 },
        { tag: 'HV-102', kind: 'gate', line: 1, x: 292, y: 540 },
        { tag: 'CK-101', kind: 'check', line: 2, x: 468, y: 380 },
        { tag: 'HV-103', kind: 'gate', line: 2, x: 556, y: 380 },
        { tag: 'CK-102', kind: 'check', line: 2, x: 468, y: 540 },
        { tag: 'HV-104', kind: 'gate', line: 2, x: 556, y: 540 },
        { tag: 'FV-101', kind: 'control', line: 3, x: 770, y: 460 },
        { tag: 'HV-105', kind: 'gate', line: 3, x: 935, y: 460 },
        { tag: 'HV-106', kind: 'gate', line: 4, x: 930, y: 130 },
        { tag: 'HV-107', kind: 'gate', line: 5, x: 440, y: 130 },
        { tag: 'HV-108', kind: 'gate', line: 6, x: 900, y: 700 },
        { tag: 'LV-101', kind: 'control', line: 6, x: 720, y: 700 }
      ],
      inst: [
        { tag: 'FT-101', x: 695, y: 395, on: [695, 460] },
        { tag: 'PT-101', x: 860, y: 395, on: [860, 460] },
        { tag: 'LT-101', x: 1180, y: 400, on: [1090, 400], eq: 'D-101' },
        { tag: 'TT-101', x: 640, y: 225, on: [550, 130], elbow: [550, 225] }
      ]
    },
    cw: {
      label: 'Cooling water loop', title: 'COOLING WATER',
      equip: [
        { tag: 'P-201', kind: 'pump', x: 280, y: 420, tx: 252, ty: 378 },
        { tag: 'E-201', kind: 'hx', x: 560, y: 390, w: 180, h: 60, tx: 625, ty: 380 },
        { tag: 'E-202', kind: 'hx', x: 560, y: 590, w: 180, h: 60, tx: 625, ty: 580 },
        { tag: 'D-201', kind: 'vessel', x: 1040, y: 280, w: 90, h: 280, tx: 1150, ty: 310 }
      ],
      lines: [
        { pts: [[60, 420], [252, 420]], to: 'P-201', tag: '8-CW-201', tp: [70, 448], end: 'FROM CT', ep: [28, 395] },
        { pts: [[308, 420], [560, 420]], from: 'P-201', to: 'E-201', tag: '8-CW-202', tp: [452, 448] },
        { pts: [[440, 420], [440, 620], [560, 620]], to: 'E-202', tag: '6-CW-203', tp: [452, 648] },
        { pts: [[740, 420], [1040, 420]], from: 'E-201', to: 'D-201', tag: '6-CW-204', tp: [882, 406] },
        { pts: [[740, 620], [940, 620], [940, 420]], from: 'E-202', tag: '6-CW-205', tp: [752, 648] },
        { pts: [[1085, 560], [1085, 720], [420, 720]], from: 'D-201', tag: '8-CW-206', tp: [570, 748], end: 'TO CT', ep: [340, 726] }
      ],
      inline: [
        { tag: 'HV-201', kind: 'gate', line: 0, x: 160, y: 420 },
        { tag: 'CK-201', kind: 'check', line: 1, x: 360, y: 420 },
        { tag: 'HV-203', kind: 'gate', line: 1, x: 505, y: 420 },
        { tag: 'HV-204', kind: 'gate', line: 2, x: 500, y: 620 },
        { tag: 'FV-201', kind: 'control', line: 3, x: 855, y: 420 },
        { tag: 'HV-205', kind: 'gate', line: 4, x: 840, y: 620 },
        { tag: 'HV-206', kind: 'gate', line: 5, x: 800, y: 720 }
      ],
      inst: [
        { tag: 'PT-201', x: 410, y: 335, on: [410, 420] },
        { tag: 'TT-201', x: 795, y: 335, on: [795, 420] },
        { tag: 'LT-201', x: 1210, y: 410, on: [1130, 410], eq: 'D-201' }
      ]
    }
  };

  /* ═══ painting ═══════════════════════════════════════════════════════ */
  function drawSymbol(c, kind, x, y, vertical) {
    c.save();
    c.translate(x, y);
    if (vertical) c.rotate(Math.PI / 2);
    c.lineWidth = 2; c.strokeStyle = c.fillStyle = '#000'; c.lineJoin = 'miter';
    var bow = function () {
      c.beginPath(); c.moveTo(-14, -9); c.lineTo(14, 9); c.lineTo(14, -9); c.lineTo(-14, 9); c.closePath(); c.stroke();
    };
    if (kind === 'gate') bow();
    else if (kind === 'check') {
      c.beginPath(); c.moveTo(-13, -9); c.lineTo(10, 0); c.lineTo(-13, 9); c.closePath(); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(10, -11); c.lineTo(10, 11); c.stroke();
    } else if (kind === 'control') {
      bow();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -20); c.stroke();
      c.beginPath(); c.arc(0, -20, 11, Math.PI, 0); c.closePath(); c.stroke();
    }
    c.restore();
  }

  function paint(c, d, extra) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#000'; c.fillStyle = '#000'; c.lineWidth = 2; c.lineCap = 'butt';
    c.strokeRect(12, 12, W - 24, H - 24);

    d.lines.forEach(function (l) {
      c.lineWidth = 2; c.beginPath();
      l.pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
      c.stroke();
    });
    d.inst.forEach(function (n) {
      c.lineWidth = 2; c.beginPath(); c.moveTo(n.on[0], n.on[1]);
      if (n.elbow) c.lineTo(n.elbow[0], n.elbow[1]);
      c.lineTo(n.x, n.y); c.stroke();
    });
    d.equip.forEach(function (e) {
      c.fillStyle = '#fff'; c.lineWidth = 2.5; c.beginPath();
      if (e.kind === 'pump') c.arc(e.x, e.y, 28, 0, 7);
      else if (e.kind === 'vessel') roundRect(c, e.x, e.y, e.w, e.h, 44);
      else if (e.kind === 'tank') { c.moveTo(e.x, e.y + e.h); c.lineTo(e.x, e.y + 40); c.quadraticCurveTo(e.x + e.w / 2, e.y - 34, e.x + e.w, e.y + 40); c.lineTo(e.x + e.w, e.y + e.h); c.closePath(); }
      else roundRect(c, e.x, e.y, e.w, e.h, 30);
      c.fill(); c.stroke();
      if (e.kind === 'hx') {
        c.lineWidth = 2; c.beginPath();
        c.moveTo(e.x + 30, e.y + 20); c.lineTo(e.x + e.w - 40, e.y + 20);
        c.arc(e.x + e.w - 40, e.y + 30, 10, -Math.PI / 2, Math.PI / 2);
        c.lineTo(e.x + 30, e.y + 40); c.stroke();
      }
    });
    d.inline.forEach(function (s) {
      var v = isVertical(d, s);
      c.fillStyle = '#fff';
      if (v) c.fillRect(s.x - 12, s.y - 16, 24, 32); else c.fillRect(s.x - 16, s.y - 12, 32, 24);
      c.fillStyle = '#000';
      drawSymbol(c, s.kind, s.x, s.y, v);
    });
    d.inst.forEach(function (n) {
      c.fillStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(n.x, n.y, 20, 0, 7); c.fill(); c.stroke();
    });

    c.fillStyle = '#000'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = FONT;
    d.equip.forEach(function (e) { letter(c, e.tag, e.tx, e.ty, 11); });
    d.lines.forEach(function (l) {
      if (l.tag) letter(c, l.tag, l.tp[0], l.tp[1], 11);
      if (l.end) letter(c, l.end, l.ep[0], l.ep[1], 11);
    });
    d.inline.forEach(function (s) {
      var below = s.kind === 'control';
      letter(c, s.tag, s.x - 30, below ? s.y + 30 : s.y - 18, 11);
    });
    letter(c, d.title, W - 230, H - 34, 11);
    c.font = FONT_S;
    d.inst.forEach(function (n) {
      var parts = n.tag.split('-');
      letter(c, parts[0], n.x - parts[0].length * 4.5, n.y - 3, 9);
      letter(c, parts[1], n.x - parts[1].length * 4.5, n.y + 12, 9);
    });
    if (extra) extra(c);
  }
  /* CAD lettering: every character on its own pitch, so neighbours never touch. */
  function letter(c, text, x, y, pitch) {
    for (var i = 0; i < text.length; i++) c.fillText(text[i], x + i * pitch, y);
  }
  function roundRect(c, x, y, w, h, r) {
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function isVertical(d, s) {
    var pts = d.lines[s.line].pts;
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1];
      if (a[0] === b[0] && a[0] === s.x && between(s.y, a[1], b[1])) return true;
    }
    return false;
  }
  function between(v, a, b) { return v >= Math.min(a, b) && v <= Math.max(a, b); }

  /* The scan: rotation, blur and sensor noise, from a seed so a setting always gives the same page. */
  function scan(srcCanvas, opt) {
    var out = document.createElement('canvas');
    out.width = W; out.height = H;
    var c = out.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.translate(W / 2, H / 2); c.rotate(opt.skew * Math.PI / 180); c.translate(-W / 2, -H / 2);
    c.drawImage(srcCanvas, 0, 0);
    var img = c.getImageData(0, 0, W, H), g = new Uint8ClampedArray(W * H), i;
    for (i = 0; i < W * H; i++) g[i] = img.data[i * 4];
    for (var pass = 0; pass < opt.blur; pass++) g = box(g);
    var seed = 12345;
    function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
    var amp = opt.noise * 1.1, salt = opt.noise * 0.00012;
    for (i = 0; i < W * H; i++) {
      var v = g[i] * .86 + 26 + (rnd() + rnd() - 1) * amp;
      var r = rnd();
      if (r < salt) v = 20; else if (r < salt * 2) v = 240;
      g[i] = v;
    }
    return g;
  }
  function box(g) {
    var o = new Uint8ClampedArray(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var s = 0, n = 0;
      for (var dy = -1; dy <= 1; dy++) { var yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (var dx = -1; dx <= 1; dx++) { var xx = x + dx; if (xx < 0 || xx >= W) continue;
          s += g[yy * W + xx] * (dx === 0 && dy === 0 ? 4 : (dx === 0 || dy === 0) ? 2 : 1); n += (dx === 0 && dy === 0 ? 4 : (dx === 0 || dy === 0) ? 2 : 1); } }
      o[y * W + x] = s / n;
    }
    return o;
  }

  /* ═══ the reader: pixels in, structure out ═══════════════════════════ */
  /* Halfway between the paper and the ink. Line art is so little of a page that Otsu lands
     on the paper's own noise and fattens every stroke. */
  function otsu(g) {
    var h = new Float64Array(256), i, paper = 0;
    for (i = 0; i < g.length; i++) h[g[i]]++;
    for (i = 0; i < 256; i++) if (h[i] > h[paper]) paper = i;
    var dark = 0, want = g.length * .004, ink = 0;
    for (i = 0; i < 256; i++) { dark += h[i]; if (dark >= want) { ink = i; break; } }
    return Math.round(paper * .52 + ink * .48);
  }
  function threshold(g) {
    var t = otsu(g), b = new Uint8Array(g.length);
    for (var i = 0; i < g.length; i++) b[i] = g[i] < t ? 1 : 0;
    return b;
  }
  /* Impulse noise goes; two-pixel strokes survive a five-point median. */
  function crossMedian(g) {
    var o = new Uint8ClampedArray(g), a = [0, 0, 0, 0, 0];
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var p = y * W + x;
      a[0] = g[p]; a[1] = g[p - 1]; a[2] = g[p + 1]; a[3] = g[p - W]; a[4] = g[p + W];
      for (var i = 1; i < 5; i++) { var v = a[i], j = i - 1; while (j >= 0 && a[j] > v) { a[j + 1] = a[j]; j--; } a[j + 1] = v; }
      o[p] = a[2];
    }
    return o;
  }
  /* Straight pipe makes a sharp profile when the page is square. Pick the angle that sharpens it most. */
  function findSkew(b) {
    var pts = [], y, x;
    // every row, so the histogram has no aliasing that would favour exactly 0 degrees
    for (y = 2; y < H - 2; y++) for (x = 2; x < W - 2; x += 3) if (b[y * W + x]) pts.push(x - W / 2, y - H / 2);
    function score(deg) {
      var a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), rows = new Int32Array(H * 2), s = 0;
      for (var i = 0; i < pts.length; i += 2) rows[(pts[i] * sn + pts[i + 1] * cs + H) | 0]++;
      for (i = 0; i < rows.length; i++) s += rows[i] * rows[i];
      return s;
    }
    var bestA = 0, bestS = -1, d;
    for (d = -5; d <= 5; d += .25) { var s = score(d); if (s > bestS) { bestS = s; bestA = d; } }
    var base = bestA;
    for (d = base - .25; d <= base + .25; d += .05) { s = score(d); if (s > bestS) { bestS = s; bestA = d; } }
    return bestA;
  }
  function rotate(g, deg) {
    if (Math.abs(deg) < .03) return g;
    var a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), o = new Uint8ClampedArray(W * H), cx = W / 2, cy = H / 2;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var dx = x - cx, dy = y - cy, sx = cs * dx - sn * dy + cx, sy = sn * dx + cs * dy + cy;
      var x0 = sx | 0, y0 = sy | 0;
      if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) { o[y * W + x] = 255; continue; }
      var fx = sx - x0, fy = sy - y0, p = y0 * W + x0;
      o[y * W + x] = (g[p] * (1 - fx) + g[p + 1] * fx) * (1 - fy) + (g[p + W] * (1 - fx) + g[p + W + 1] * fx) * fy;
    }
    return o;
  }
  /* Connected components; background uses 4-connectivity against 8-connected ink. */
  function components(b, val, eight, minPx) {
    var seen = new Uint8Array(b.length), out = [], stack = new Int32Array(b.length);
    for (var start = 0; start < b.length; start++) {
      if (b[start] !== val || seen[start]) continue;
      var sp = 0, n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0, pix = [];
      stack[sp++] = start; seen[start] = 1;
      while (sp) {
        var p = stack[--sp], x = p % W, y = (p - x) / W;
        n++; pix.push(p);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!eight && dx && dy) continue;
          var xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          var q = yy * W + xx;
          if (b[q] === val && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
        }
      }
      if (n >= (minPx || 0)) out.push({ n: n, x0: x0, x1: x1, y0: y0, y1: y1, w: x1 - x0 + 1, h: y1 - y0 + 1, pix: pix });
    }
    return out;
  }
  function despeckle(b) {
    components(b, 1, true, 0).forEach(function (c) { if (c.n <= 3) c.pix.forEach(function (p) { b[p] = 0; }); });
    components(b, 0, false, 0).forEach(function (c) { if (c.n <= 3) c.pix.forEach(function (p) { b[p] = 1; }); });
  }

  /* Straight runs, along either axis, merged across rows into strokes. */
  function runs(b, horizontal, minRun, maxT) {
    var L = horizontal ? W : H, M = horizontal ? H : W, out = [], active = [];
    function at(line, i) { return horizontal ? b[line * W + i] : b[i * W + line]; }
    for (var line = 0; line < M; line++) {
      var found = [], i = 0;
      while (i < L) {
        if (!at(line, i)) { i++; continue; }
        var s = i, last = i;
        while (i < L && i - last <= 3) { if (at(line, i)) last = i; i++; }
        if (last - s + 1 >= minRun) found.push([s, last]);
        i = last + 1;
      }
      var next = [];
      found.forEach(function (r) {
        var hit = null;
        for (var k = 0; k < active.length; k++) {
          var a = active[k], ov = Math.min(a.b, r[1]) - Math.max(a.a, r[0]);
          if (ov > .5 * Math.min(a.b - a.a, r[1] - r[0])) { hit = a; active.splice(k, 1); break; }
        }
        if (hit) { hit.a = Math.min(hit.a, r[0]); hit.b = Math.max(hit.b, r[1]); hit.l1 = line; next.push(hit); }
        else next.push({ a: r[0], b: r[1], l0: line, l1: line });
      });
      active.forEach(function (a) { out.push(a); });
      active = next;
    }
    active.forEach(function (a) { out.push(a); });
    return out.filter(function (a) { return a.l1 - a.l0 + 1 <= maxT; }).map(function (a) {
      var mid = (a.l0 + a.l1) / 2;
      return horizontal
        ? { x0: a.a, y0: mid, x1: a.b, y1: mid, h: true, t0: a.l0, t1: a.l1 }
        : { x0: mid, y0: a.a, x1: mid, y1: a.b, h: false, t0: a.l0, t1: a.l1 };
    });
  }

  /* Symbol and glyph libraries are drawn with the same painter, so the reader starts each session
     knowing the notation; everything after that comes from the page in front of it. */
  var LIB = null;
  function buildLibrary() {
    var size = 80, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var c = cv.getContext('2d', { willReadFrequently: true }), syms = [];
    function grab() {
      var d = c.getImageData(0, 0, size, size).data, x0 = size, x1 = 0, y0 = size, y1 = 0, i, x, y;
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
        if (d[(y * size + x) * 4] < 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      var w = x1 - x0 + 1, h = y1 - y0 + 1, m = new Uint8Array(w * h);
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) m[y * w + x] = d[((y + y0) * size + x + x0) * 4] < 128 ? 1 : 0;
      return { w: w, h: h, m: m };
    }
    ['gate', 'check', 'control'].forEach(function (k) {
      [false, true].forEach(function (v) {
        c.fillStyle = '#fff'; c.fillRect(0, 0, size, size); c.fillStyle = '#000';
        drawSymbol(c, k, 40, 44, v);
        var t = grab(); t.kind = k; t.vertical = v;
        syms.push(t);
      });
    });
    var glyphs = {};
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').forEach(function (ch) {
      // Each glyph at both sizes, and again fattened, since a soft scan thickens strokes.
      glyphs[ch] = [[FONT, 0], [FONT_S, 0], [FONT, .8], [FONT_S, .8]].map(function (f) {
        c.fillStyle = '#fff'; c.fillRect(0, 0, size, size); c.fillStyle = '#000';
        c.font = f[0]; c.textBaseline = 'alphabetic'; c.fillText(ch, 30, 50);
        if (f[1]) { c.lineWidth = f[1]; c.strokeStyle = '#000'; c.strokeText(ch, 30, 50); }
        var g = grab();
        return { grid: toGrid(function (x, y) { return g.m[y * g.w + x]; }, g.w, g.h), aspect: g.w / g.h };
      });
    });
    LIB = { syms: syms, glyphs: glyphs };
  }
  var GW = 10, GH = 14;
  function toGrid(get, w, h) {
    var o = new Float32Array(GW * GH);
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      var sx = (x + .5) / GW * w - .5, sy = (y + .5) / GH * h - .5, s = 0;
      for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
        var xx = Math.max(0, Math.min(w - 1, Math.round(sx + a * .33))), yy = Math.max(0, Math.min(h - 1, Math.round(sy + b * .33)));
        s += get(xx, yy);
      }
      o[y * GW + x] = s / 9;
    }
    return o;
  }
  /* Returns the best reading and the cost of every alternative, so that words can be decoded
     as a whole. A smudged 0 and a smudged 8 cost about the same; the tag's structure decides. */
  function readGlyph(c, residual) {
    if (c.w >= 3 && c.h <= 6) { c.ch = '-'; c.costs = null; return; }
    var get = function (x, y) { return residual[(y + c.y0) * W + x + c.x0]; };
    var grid = toGrid(get, c.w, c.h), aspect = c.w / c.h, best = '?', bs = 1e9, costs = {};
    for (var ch in LIB.glyphs) {
      var least = 1e9;
      LIB.glyphs[ch].forEach(function (t) {
        var cost = 0;
        for (var i = 0; i < grid.length; i++) cost += Math.abs(grid[i] - t.grid[i]);
        cost += Math.abs(aspect - t.aspect) * 14;
        if (cost < least) least = cost;
      });
      costs[ch] = least;
      if (least < bs) { bs = least; best = ch; }
    }
    // T and I differ only in the foot, which is what a coarse grid blurs away.
    var foot = 0;
    for (var x = 0; x < c.w; x++) if (residual[c.y1 * W + c.x0 + x] || residual[(c.y1 - 1) * W + c.x0 + x]) foot++;
    if (foot > c.w * .6) costs.T += 4; else costs.I += 4;
    if (best === 'T' || best === 'I') best = costs.T < costs.I ? 'T' : 'I';
    c.ch = best; c.costs = costs;
  }
  function matchSymbol(c, residual) {
    var best = null, bs = 0;
    LIB.syms.forEach(function (t) {
      for (var oy = -3; oy <= 3; oy++) for (var ox = -3; ox <= 3; ox++) {
        var x0 = Math.round((c.x0 + c.x1 - t.w + 1) / 2) + ox, y0 = Math.round((c.y0 + c.y1 - t.h + 1) / 2) + oy;
        var inter = 0, union = c.n;
        for (var y = 0; y < t.h; y++) for (var x = 0; x < t.w; x++) {
          if (!t.m[y * t.w + x]) continue;
          var xx = x + x0, yy = y + y0, hit = xx >= 0 && yy >= 0 && xx < W && yy < H && residual[yy * W + xx];
          if (hit) inter++; else union++;
        }
        var s = inter / union;
        if (s > bs) { bs = s; best = t; }
      }
    });
    return best ? { kind: best.kind, vertical: best.vertical, score: bs } : null;
  }

  /* Decode a whole word against the tag grammar: a known prefix, a hyphen, three digits and an
     optional train letter; or size-service-number for a line. Anything else stays as read. */
  var PREFIXES = ['HV', 'CK', 'FV', 'LV', 'PT', 'FT', 'LT', 'TT', 'T', 'P', 'D', 'E', 'V'];
  var SERVICES = ['PW', 'VP', 'DR', 'CW'];   // from the sheet's legend
  var DIGITS = '0123456789'.split('');
  function bestOf(g, set) {
    var b = set[0], bc = 1e9;
    set.forEach(function (ch) { if (g.costs[ch] < bc) { bc = g.costs[ch]; b = ch; } });
    return { ch: b, cost: bc };
  }
  function run(gs, set) {
    return gs.map(function (g) { return bestOf(g, set).ch; }).join('');
  }
  function decodeWord(gs) {
    var raw = gs.map(function (g) { return g.ch; }).join(''), parts = [], cur = [];
    gs.forEach(function (g) { if (g.ch === '-') { parts.push(cur); cur = []; } else cur.push(g); });
    parts.push(cur);
    if (parts.some(function (p) { return !p.length; })) return raw;
    if (parts.length === 3 && parts[0].length <= 2 && parts[1].length === 2 && parts[2].length === 3)
      {
      var svc = SERVICES[0], sc = 1e9;
      SERVICES.forEach(function (p) {
        var cost = parts[1][0].costs[p[0]] + parts[1][1].costs[p[1]];
        if (cost < sc) { sc = cost; svc = p; }
      });
      return run(parts[0], DIGITS) + '-' + svc + '-' + run(parts[2], DIGITS);
    }
    if (parts.length === 2 && (parts[1].length === 3 || parts[1].length === 4)) {
      var bestP = null, bc = 1e9;
      PREFIXES.forEach(function (p) {
        if (p.length !== parts[0].length) return;
        var cost = 0;
        for (var i = 0; i < p.length; i++) cost += parts[0][i].costs[p[i]];
        if (cost < bc) { bc = cost; bestP = p; }
      });
      if (!bestP) return raw;
      var tail = parts[1].slice(0, 3), train = parts[1][3];
      return bestP + '-' + run(tail, DIGITS) + (train ? bestOf(train, ['A', 'B']).ch : '');
    }
    return raw;
  }
  var RX = {
    equip: /^(T|P|D|E)-\d{3}[AB]?$/,
    valve: /^(HV|CK|FV|LV)-\d{3}$/,
    inst: /^(PT|FT|LT|TT)-\d{3}$/,
    line: /^\d+-[A-Z]{2}-\d{3}$/
  };
  function classOf(t) { for (var k in RX) if (RX[k].test(t)) return k; return null; }

  function read(gray0) {
    var T0 = performance.now(), R = { gray0: gray0 };
    var filtered = crossMedian(gray0);
    var b0 = threshold(filtered);
    R.skew = findSkew(b0);
    var gray = rotate(filtered, -R.skew);
    var b = threshold(gray);
    despeckle(b);
    R.bin = b.slice();

    // the sheet border is one enormous component
    components(b, 1, true, 200).forEach(function (c) {
      if (c.w > W * .85 && c.h > H * .85) {
        c.pix.forEach(function (p) { var x = p % W, y = (p - x) / W; if (x < 26 || y < 26 || x > W - 26 || y > H - 26) b[p] = 0; });
      }
    });

    /* closed shapes: every background region that does not reach the outside */
    var holes = components(b, 0, false, 500), outer = holes.reduce(function (m, c) { return c.n > m.n ? c : m; }, holes[0]);
    R.equip = []; R.inst = [];
    holes.forEach(function (c) {
      if (c === outer) return;
      var a = c.w / c.h, area = c.w * c.h;
      var fill = c.n / area;
      if (Math.abs(c.w - c.h) <= 4 && c.w >= 30 && c.w <= 44 && fill > .45) { R.inst.push({ x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2, r: c.w / 2, box: c }); return; }
      if (Math.abs(c.w - c.h) <= 4 && c.w >= 46 && c.w <= 64 && fill > .65) { R.equip.push({ kind: 'pump', box: c }); return; }
      if (area < 3000 || area > 60000) return;    // too small to be a vessel; bigger is a loop of pipe
      if (fill > .992 || fill < .55) return;      // dead-square is a pipe loop, vessels have heads
      // A tank stands on a flat base; a vessel has a head at both ends.
      var rowWidth = function (row) { var n = 0; c.pix.forEach(function (p) { if (((p - p % W) / W) === row) n++; }); return n; };
      var kind = a > 1.8 ? 'hx' : rowWidth(c.y1 - 2) > c.w * .8 ? 'tank' : 'vessel';
      R.equip.push({ kind: kind, box: c });
    });

    /* pipe: straight strokes, thinner than anything filled */
    var segs = runs(b, true, 28, 6).concat(runs(b, false, 28, 6));
    function eqBox(e, m) { var c = e.box; return { x0: c.x0 - m, y0: c.y0 - m, x1: c.x1 + m, y1: c.y1 + m }; }
    var shapes = R.equip.map(function (e) { return { r: eqBox(e, 6), e: e }; })
      .concat(R.inst.map(function (n) { return { r: eqBox(n, 4), e: n }; }));
    var kept = [];
    segs.forEach(function (s) {
      var pieces = [s];
      shapes.forEach(function (sh) {
        var next = [];
        pieces.forEach(function (p) {
          var r = sh.r, mid = p.h ? p.y0 : p.x0;
          if (p.h ? (mid < r.y0 || mid > r.y1) : (mid < r.x0 || mid > r.x1)) { next.push(p); return; }
          var a = p.h ? p.x0 : p.y0, z = p.h ? p.x1 : p.y1, lo = p.h ? r.x0 : r.y0, hi = p.h ? r.x1 : r.y1;
          if (z < lo || a > hi) { next.push(p); return; }
          if (a < lo) next.push(p.h ? copy(p, { x1: lo }) : copy(p, { y1: lo }));
          if (z > hi) next.push(p.h ? copy(p, { x0: hi }) : copy(p, { y0: hi }));
        });
        pieces = next;
      });
      pieces.forEach(function (p) { var len = p.h ? p.x1 - p.x0 : p.y1 - p.y0; if (len >= 16) kept.push(p); });
    });
    R.segs = kept;

    /* whatever is left once pipe and shapes are lifted off: symbols and text */
    var res = b.slice();
    segs.forEach(function (s) {
      var x0 = s.h ? s.x0 : s.t0 - 1, x1 = s.h ? s.x1 : s.t1 + 1, y0 = s.h ? s.t0 - 1 : s.y0, y1 = s.h ? s.t1 + 1 : s.y1;
      for (var y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) res[y * W + x] = 0;
    });
    R.equip.forEach(function (e) {
      var r = eqBox(e, 6);
      for (var y = Math.max(0, r.y0); y <= Math.min(H - 1, r.y1); y++) for (var x = Math.max(0, r.x0); x <= Math.min(W - 1, r.x1); x++) res[y * W + x] = 0;
    });
    R.inst.forEach(function (n) {
      for (var y = Math.round(n.y - n.r - 6); y <= n.y + n.r + 6; y++) for (var x = Math.round(n.x - n.r - 6); x <= n.x + n.r + 6; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (Math.hypot(x - n.x, y - n.y) > n.r - 1) res[Math.round(y) * W + Math.round(x)] = 0;
      }
    });
    R.residual = res;
    var cc = components(res, 1, true, 4);
    R.valves = []; var glyphs = [];
    cc.forEach(function (c) {
      if ((c.w >= 15 || c.h >= 15) && c.w <= 60 && c.h <= 60) {
        var m = matchSymbol(c, res);
        if (m && m.score > .34) R.valves.push({ kind: m.kind, vertical: m.vertical, score: m.score, x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2, box: c });
      } else if (c.w <= 14 && c.h <= 14) glyphs.push(c);
    });
    /* text: glyphs into words along a baseline, words inside a bubble into one tag */
    glyphs.forEach(function (g) { readGlyph(g, res); g.cy = (g.y0 + g.y1) / 2; });
    glyphs.sort(function (a, c) { return a.x0 - c.x0; });
    var words = [];
    glyphs.forEach(function (g) {
      var w = null;
      for (var i = words.length - 1; i >= 0; i--) {
        var o = words[i];
        if (Math.abs(o.cy - g.cy) <= 5 && g.x0 - o.x1 <= 10 && g.x0 - o.x1 > -3) { w = o; break; }
      }
      if (w) { w.s += g.ch; w.g.push(g); w.x1 = g.x1; w.y0 = Math.min(w.y0, g.y0); w.y1 = Math.max(w.y1, g.y1); }
      else words.push({ s: g.ch, g: [g], x0: g.x0, x1: g.x1, y0: g.y0, y1: g.y1, cy: g.cy });
    });
    R.inst.forEach(function (n) {
      var inside = words.filter(function (w) { return Math.hypot((w.x0 + w.x1) / 2 - n.x, w.cy - n.y) < n.r; });
      inside.sort(function (a, c) { return a.cy - c.cy; });
      inside.forEach(function (w) { w.used = true; });
      var seq = [];
      inside.forEach(function (w, i) { if (i) seq.push({ ch: '-', costs: null }); seq = seq.concat(w.g); });
      n.tag = seq.length ? decodeWord(seq) : null;
    });
    words = words.filter(function (w) { return !w.used; });
    words.forEach(function (w) { w.tag = decodeWord(w.g); w.cls = classOf(w.tag); });
    R.words = words;

    assign(words.filter(function (w) { return w.cls === 'equip'; }), R.equip, 120, function (t, e) { e.tag = t.tag; }, function (e) { return boxOf(e.box); });
    assign(words.filter(function (w) { return w.cls === 'valve'; }), R.valves, 60, function (t, v) { v.tag = t.tag; }, function (v) { return boxOf(v.box); });

    graph(R, words);
    R.ms = performance.now() - T0;
    return R;
  }
  function copy(o, p) { var c = {}; for (var k in o) c[k] = o[k]; for (k in p) c[k] = p[k]; return c; }
  function boxOf(c) { return { x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1 }; }
  function gap(a, b) {
    var dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
    return Math.hypot(dx, dy);
  }
  function assign(tags, nodes, max, set, boxer) {
    var pairs = [];
    tags.forEach(function (t, i) { nodes.forEach(function (n, j) { var d = gap(t, boxer(n)); if (d <= max) pairs.push([d, i, j]); }); });
    pairs.sort(function (a, b) { return a[0] - b[0]; });
    var ut = {}, un = {};
    pairs.forEach(function (p) { if (ut[p[1]] || un[p[2]]) return; ut[p[1]] = un[p[2]] = 1; set(tags[p[1]], nodes[p[2]]); });
  }

  /* Pipe segments that touch join into a net; a net is everything hydraulically continuous. */
  function graph(R, words) {
    var S = R.segs, parent = S.map(function (_, i) { return i; });
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    function ends(s) { return [[s.x0, s.y0], [s.x1, s.y1]]; }
    function distPt(p, s) {
      var x = Math.max(s.x0, Math.min(s.x1, p[0])), y = Math.max(s.y0, Math.min(s.y1, p[1]));
      return Math.hypot(p[0] - x, p[1] - y);
    }
    var touched = S.map(function () { return [false, false]; });
    S.forEach(function (a, i) {
      ends(a).forEach(function (p, ei) {
        S.forEach(function (c, j) {
          if (i === j) return;
          var collinear = a.h === c.h && Math.abs(a.h ? a.y0 - c.y0 : a.x0 - c.x0) <= 3;
          if (distPt(p, c) <= (collinear ? 9 : 5)) { parent[find(i)] = find(j); touched[i][ei] = true; }
        });
      });
    });

    var nodes = [];
    R.equip.forEach(function (e) { nodes.push({ type: 'equip', kind: e.kind, tag: e.tag || null, box: boxOf(e.box), pad: 10 }); });
    R.valves.forEach(function (v) { nodes.push({ type: 'valve', kind: v.kind, tag: v.tag || null, box: boxOf(v.box), pad: 8, vertical: v.vertical }); });
    R.inst.forEach(function (n) { nodes.push({ type: 'inst', kind: 'instrument', tag: n.tag || null, box: boxOf(n.box), pad: 8 }); });
    nodes.forEach(function (n, i) { n.id = i; n.nets = {}; });

    S.forEach(function (s, i) {
      ends(s).forEach(function (p, ei) {
        nodes.forEach(function (n) {
          var b = n.box;
          var d = Math.hypot(Math.max(b.x0 - p[0], p[0] - b.x1, 0), Math.max(b.y0 - p[1], p[1] - b.y1, 0));
          if (d <= n.pad) { n.nets[i] = true; touched[i][ei] = true; }
        });
      });
    });
    var netIds = {}, nets = [];
    S.forEach(function (s, i) {
      var r = find(i);
      if (netIds[r] === undefined) { netIds[r] = nets.length; nets.push({ id: nets.length, segs: [], nodes: [], tag: null }); }
      s.net = netIds[r];
      nets[s.net].segs.push(i);
    });
    nodes.forEach(function (n) {
      var seen = {};
      Object.keys(n.nets).forEach(function (si) { seen[S[si].net] = true; });
      n.nets = Object.keys(seen).map(Number);
      n.nets.forEach(function (k) { nets[k].nodes.push(n.id); });
    });
    words.filter(function (w) { return w.cls === 'line'; }).forEach(function (w) {
      var best = null, bd = 30;
      S.forEach(function (s) {
        var d = gap(w, { x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1 });
        if (d < bd) { bd = d; best = s; }
      });
      if (best && !nets[best.net].tag) nets[best.net].tag = w.tag;
    });
    // A line keeps its number through the valves on it, but not through equipment.
    for (var changed = true; changed;) {
      changed = false;
      nets.forEach(function (net) {
        if (!net.tag) return;
        net.nodes.forEach(function (id) {
          var n = nodes[id];
          if (n.type !== 'valve') return;
          n.nets.forEach(function (k) { if (!nets[k].tag) { nets[k].tag = net.tag; changed = true; } });
        });
      });
    }
    var free = words.filter(function (w) { return !w.cls; });
    R.open = [];
    S.forEach(function (s, i) {
      ends(s).forEach(function (p, ei) {
        if (touched[i][ei]) return;
        var label = null;
        free.forEach(function (w) { if (gap(w, { x0: p[0], x1: p[0], y0: p[1], y1: p[1] }) < 70) label = (label ? label + ' ' : '') + w.tag; });
        R.open.push({ x: p[0], y: p[1], net: s.net, label: label });
      });
    });
    R.nodes = nodes; R.nets = nets;
  }

  /* ═══ questions the graph can answer ═════════════════════════════════
     Isolating something means closing every positive-isolation valve around it.
     Check and control valves do not count: neither is a guarantee of tight shut-off. */
  function isolate(R, startId) {
    var visited = {}, close = {}, inside = {}, leaks = [], queue = [];
    var start = R.nodes[startId];
    visited[startId] = true;
    start.nets.forEach(function (k) { queue.push(k); });
    while (queue.length) {
      var k = queue.pop();
      if (inside[k]) continue;
      inside[k] = true;
      R.nets[k].nodes.forEach(function (id) {
        if (visited[id]) return;
        var n = R.nodes[id];
        if (n.type === 'valve' && n.kind === 'gate') { close[id] = true; return; }
        visited[id] = true;
        if (n.type === 'equip') leaks.push(id);
        n.nets.forEach(function (o) { if (!inside[o]) queue.push(o); });
      });
    }
    return { close: Object.keys(close).map(Number), nets: Object.keys(inside).map(Number), inside: Object.keys(visited).map(Number), reaches: leaks };
  }

  /* ═══ scoring against the drawing's own model ═══════════════════════ */
  function truth(d) {
    var nets = [], parent = [];
    function find(i) { while (parent[i] !== i) i = parent[i]; return i; }
    var segs = [];
    d.lines.forEach(function (l, li) {
      for (var i = 0; i + 1 < l.pts.length; i++) {
        var marks = d.inline.filter(function (s) { return s.line === li; }).filter(function (s) {
          var a = l.pts[i], b = l.pts[i + 1];
          return a[0] === b[0] ? (s.x === a[0] && between(s.y, a[1], b[1])) : (s.y === a[1] && between(s.x, a[0], b[0]));
        });
        var a = l.pts[i], b = l.pts[i + 1], horiz = a[1] === b[1], dir = horiz ? Math.sign(b[0] - a[0]) : Math.sign(b[1] - a[1]);
        marks.sort(function (p, q) { return (horiz ? p.x - q.x : p.y - q.y) * dir; });
        var cur = a;
        marks.forEach(function (m) {
          segs.push({ a: cur, b: horiz ? [m.x - dir * 16, a[1]] : [a[0], m.y - dir * 16], li: li, ends: [null, m.tag] });
          cur = horiz ? [m.x + dir * 16, a[1]] : [a[0], m.y + dir * 16];
        });
        segs.push({ a: cur, b: b, li: li, ends: [marks.length ? null : null, null] });
      }
    });
    segs.forEach(function (_, i) { parent[i] = i; });
    function on(p, s) { return between(p[0], s.a[0], s.b[0]) && between(p[1], s.a[1], s.b[1]); }
    segs.forEach(function (s, i) {
      segs.forEach(function (o, j) { if (i !== j && (on(s.a, o) || on(s.b, o))) parent[find(i)] = find(j); });
    });
    var attach = {};
    function add(seg, tag) { var r = find(seg); (attach[r] = attach[r] || {})[tag] = 1; }
    segs.forEach(function (s, i) {
      var l = d.lines[s.li];
      if (l.from && s.a === l.pts[0]) add(i, l.from);
      var last = l.pts[l.pts.length - 1];
      if (l.to && s.b === last) add(i, l.to);
      if (s.ends[1]) add(i, s.ends[1]);
    });
    d.inline.forEach(function (m) {
      var h = !isVertical(d, m);
      segs.forEach(function (s, i) {
        var px = h ? [[m.x - 16, m.y], [m.x + 16, m.y]] : [[m.x, m.y - 16], [m.x, m.y + 16]];
        if (px.some(function (p) { return on(p, s); })) add(i, m.tag);
      });
    });
    d.inst.forEach(function (n) {
      if (n.eq) return;
      segs.forEach(function (s, i) { if (on(n.on, s) && !(attach[find(i)] || {})[n.tag]) add(i, n.tag); });
    });
    var edges = {}, tags = {};
    Object.keys(attach).forEach(function (r) {
      var t = Object.keys(attach[r]).sort();
      t.forEach(function (a) { tags[a] = 1; t.forEach(function (b) { if (a < b) edges[a + '|' + b] = 1; }); });
    });
    d.inst.filter(function (n) { return n.eq; }).forEach(function (n) { edges[[n.eq, n.tag].sort().join('|')] = 1; });
    var nodes = {};
    d.equip.forEach(function (e) { nodes[e.tag] = 'equip:' + e.kind; });
    d.inline.forEach(function (s) { nodes[s.tag] = 'valve:' + s.kind; });
    d.inst.forEach(function (n) { nodes[n.tag] = 'inst:instrument'; });
    return { nodes: nodes, edges: edges, lines: d.lines.map(function (l) { return l.tag; }) };
  }
  function score(R, T) {
    var got = {}, gotEdges = {};
    R.nodes.forEach(function (n) { if (n.tag) got[n.tag] = n.type + ':' + n.kind; });
    var nTotal = Object.keys(T.nodes).length, nOk = 0, missing = [];
    Object.keys(T.nodes).forEach(function (k) { if (got[k] === T.nodes[k]) nOk++; else missing.push(k); });
    R.nets.forEach(function (net) {
      var t = net.nodes.map(function (id) { return R.nodes[id].tag; }).filter(Boolean).sort();
      t.forEach(function (a) { t.forEach(function (b) { if (a < b) gotEdges[a + '|' + b] = 1; }); });
    });
    var eTotal = Object.keys(T.edges).length, eOk = 0, extra = 0;
    Object.keys(T.edges).forEach(function (k) { if (gotEdges[k]) eOk++; });
    Object.keys(gotEdges).forEach(function (k) { if (!T.edges[k]) extra++; });
    var ghost = R.nodes.filter(function (n) { return !n.tag || !T.nodes[n.tag]; }).length;
    var seenLines = {};
    R.nets.forEach(function (net) { if (net.tag) seenLines[net.tag] = 1; });
    var lOk = T.lines.filter(function (t) { return seenLines[t]; }).length;
    extra += Object.keys(seenLines).filter(function (t) { return T.lines.indexOf(t) < 0; }).length;
    return { nodes: [nOk + lOk, nTotal + T.lines.length], edges: [eOk, eTotal], extra: extra, ghost: ghost, missing: missing };
  }

  /* ═══ the page ═══════════════════════════════════════════════════════ */
  var COLORS = ['#6fe3a8', '#7cc4ff', '#ffb36b', '#e39bff', '#ffe27a', '#6fe3d8', '#ff9db0', '#b5c8ff', '#c6f26f', '#ffc7f2', '#9cf0ff', '#ffd2a8'];
  var STAGES = [
    { id: 'scan', label: 'Scan', note: 'What the reader is given: pixels and nothing else.' },
    { id: 'clean', label: 'Clean', note: 'Threshold, measure the skew and remove it, drop the specks.' },
    { id: 'lines', label: 'Pipe', note: 'Long straight strokes become pipe segments, coloured by the net they join.' },
    { id: 'symbols', label: 'Symbols', note: 'Closed shapes become equipment and instruments; what is left is matched against the symbol library.' },
    { id: 'text', label: 'Tags', note: 'Tags are read glyph by glyph, corrected by tag grammar and bound to the nearest symbol.' },
    { id: 'graph', label: 'Graph', note: 'Everything joined: click any item to work out how to isolate it.' }
  ];

  window.CadPid = function (root) {
    var view = root.querySelector('[data-pid-canvas]');
    view.width = W; view.height = H;
    var ctx = view.getContext('2d', { willReadFrequently: true });
    var src = document.createElement('canvas');
    src.width = W; src.height = H;
    var srcCtx = src.getContext('2d', { willReadFrequently: true });
    var strokes = [], tool = 'isolate', stage = 'scan', drawingId = 'skid', d = null, T = null;
    var R = null, gray = null, opt = { skew: -1.5, noise: 12, blur: 1 }, selected = null, iso = null, timer = null, autoTimer = null;
    var els = {
      stages: root.querySelector('[data-pid-stages]'),
      note: root.querySelector('[data-pid-note]'),
      score: root.querySelector('[data-pid-score]'),
      reg: root.querySelector('[data-pid-register]'),
      lines: root.querySelector('[data-pid-lines]'),
      answer: root.querySelector('[data-pid-answer]'),
      drawings: root.querySelector('[data-pid-drawings]'),
      warn: root.querySelector('[data-pid-open]')
    };

    function clone(x) { return JSON.parse(JSON.stringify(x)); }
    function loadDrawing(id) {
      drawingId = id; d = clone(DRAWINGS[id]); T = truth(d); strokes = []; selected = null; iso = null;
      Array.prototype.forEach.call(els.drawings.children, function (b) { b.classList.toggle('on', b.dataset.id === id); b.setAttribute('aria-pressed', String(b.dataset.id === id)); });
      run(true);
    }

    function run(animate) {
      paint(srcCtx, d, function (c) {
        strokes.forEach(function (s) {
          c.save();
          if (s.erase) { c.strokeStyle = '#fff'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); s.pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); }
          else { c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.a[0], s.a[1]); c.lineTo(s.b[0], s.b[1]); c.stroke(); }
          c.restore();
        });
      });
      gray = scan(src, opt);
      R = read(gray);
      if (selected !== null && !R.nodes[selected]) { selected = null; iso = null; }
      if (selected !== null) iso = isolate(R, selected);
      report();
      if (animate) autoplay(); else draw();
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(function () { run(false); }, 90); }

    function autoplay() {
      clearInterval(autoTimer);
      if (matchMedia('(prefers-reduced-motion:reduce)').matches) { setStage('graph'); return; }
      var i = 0;
      setStage(STAGES[0].id);
      autoTimer = setInterval(function () {
        i++;
        if (i >= STAGES.length) { clearInterval(autoTimer); return; }
        setStage(STAGES[i].id);
      }, 1500);
    }
    function setStage(id) {
      stage = id;
      Array.prototype.forEach.call(els.stages.children, function (b) {
        var on = b.dataset.id === id;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      els.note.textContent = STAGES.filter(function (s) { return s.id === id; })[0].note;
      draw();
    }

    function lut(values, isInk, ink, bg) {
      var img = ctx.createImageData(W, H), o = img.data;
      for (var i = 0; i < W * H; i++) {
        var on = isInk(values[i]), c = on ? ink : bg;
        o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    function draw() {
      if (!R) return;
      var BG = [8, 30, 58];
      if (stage === 'scan') {
        var img = ctx.createImageData(W, H);
        for (var i = 0; i < W * H; i++) { var v = gray[i]; img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v * .97; img.data[i * 4 + 3] = 255; }
        ctx.putImageData(img, 0, 0);
        return;
      }
      if (stage === 'clean') { lut(R.bin, function (v) { return v; }, [207, 230, 255], BG); label(14, H - 18, 'measured skew ' + R.skew.toFixed(2) + '° · ' + R.ms.toFixed(0) + ' ms for the whole read', '#9CC6F2'); return; }
      lut(R.bin, function (v) { return v; }, stage === 'graph' ? [64, 92, 128] : [66, 96, 134], BG);
      ctx.lineCap = 'round';
      if (stage === 'lines' || stage === 'graph') R.segs.forEach(function (s) {
        var dim = iso && iso.nets.indexOf(s.net) < 0;
        ctx.strokeStyle = iso && !dim ? '#ffcf5c' : dim ? 'rgba(124,160,200,.45)' : COLORS[s.net % COLORS.length];
        ctx.lineWidth = iso && !dim ? 5 : 3;
        ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
      });
      if (stage === 'text') R.inst.forEach(function (n) { label(n.x - 22, n.y - n.r - 8, n.tag || '?', '#e39bff'); });
      if (stage === 'symbols' || stage === 'graph') {
        ctx.fillStyle = 'rgb(8,30,58)';
        R.words.forEach(function (w) { if (w.cls === 'equip' || w.cls === 'valve') ctx.fillRect(w.x0 - 3, w.y0 - 3, w.x1 - w.x0 + 6, w.y1 - w.y0 + 6); });
      }
      if (stage === 'symbols' || stage === 'graph') R.nodes.forEach(function (n) {
        var b = n.box, pad = 4, col = n.type === 'equip' ? '#7cc4ff' : n.type === 'inst' ? '#e39bff' : '#6fe3a8';
        var closing = iso && iso.close.indexOf(n.id) >= 0;
        if (stage === 'graph' && iso) col = closing ? '#ff6b57' : n.id === selected ? '#ffcf5c' : 'rgba(150,180,215,.5)';
        ctx.strokeStyle = col; ctx.lineWidth = closing || n.id === selected ? 3 : 2;
        ctx.strokeRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + pad * 2, b.y1 - b.y0 + pad * 2);
        if (closing) { ctx.fillStyle = 'rgba(255,107,87,.22)'; ctx.fillRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + pad * 2, b.y1 - b.y0 + pad * 2); }
        var text = stage === 'symbols' ? n.kind : (n.tag || '?');
        if (stage !== 'symbols' && !n.tag) col = '#ff6b57';
        label(b.x0 - pad, b.y0 - pad - 5, text, col);
      });
      if (stage === 'text') R.words.forEach(function (w) {
        ctx.fillStyle = 'rgba(6,26,51,.86)'; ctx.fillRect(w.x0 - 4, w.y0 - 4, w.x1 - w.x0 + 8, w.y1 - w.y0 + 8);
        ctx.strokeStyle = w.cls ? '#ffcf5c' : 'rgba(255,207,92,.45)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x0 - 4, w.y0 - 4, w.x1 - w.x0 + 8, w.y1 - w.y0 + 8);
        ctx.font = "500 13px 'Fira Mono', monospace"; ctx.fillStyle = w.cls ? '#ffcf5c' : '#c9a85f';
        ctx.fillText(w.cls ? w.tag : w.s, w.x0, w.y1);
      });
      if (stage === 'graph') R.open.forEach(function (o) {
        ctx.strokeStyle = o.label ? '#7cc4ff' : '#ff6b57'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, 7); ctx.stroke();
      });
    }
    function label(x, y, text, col) {
      ctx.font = "500 13px 'Fira Mono', monospace";
      var w = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(6,26,51,.82)'; ctx.fillRect(x - 2, y - 12, w + 5, 16);
      ctx.fillStyle = col; ctx.fillText(text, x, y);
    }

    function report() {
      var edited = strokes.length > 0 || moved;
      var s = score(R, T);
      root.__pid = { score: s, skew: R.skew, ms: R.ms, nodes: R.nodes.length, open: R.open, R: R };
      els.score.innerHTML = '';
      function tile(v, l, cls) {
        var e = document.createElement('div'); e.className = 'tile ' + (cls || '');
        e.innerHTML = '<b></b><span></span>'; e.firstChild.textContent = v; e.lastChild.textContent = l;
        els.score.appendChild(e);
      }
      if (edited) {
        tile(R.nodes.length, 'items read', '');
        tile(R.nets.length, 'lines traced', '');
        tile(R.open.filter(function (o) { return !o.label; }).length, 'dangling ends', R.open.some(function (o) { return !o.label; }) ? 'warn' : '');
      } else {
        tile(s.nodes[0] + '/' + s.nodes[1], 'tags read correctly', s.nodes[0] === s.nodes[1] ? 'ok' : 'warn');
        tile(s.edges[0] + '/' + s.edges[1], 'connections found', s.edges[0] === s.edges[1] ? 'ok' : 'warn');
        tile(s.extra + s.ghost, 'false readings', s.extra + s.ghost ? 'warn' : 'ok');
      }
      tile(R.ms.toFixed(0) + ' ms', 'on your machine', '');

      var kindName = { pump: 'Pump', vessel: 'Vessel', tank: 'Tank', hx: 'Heat exchanger', gate: 'Isolation valve', check: 'Check valve', control: 'Control valve', instrument: 'Instrument' };
      var rows = R.nodes.slice().sort(function (a, b) { return String(a.tag).localeCompare(String(b.tag)); });
      els.reg.innerHTML = '';
      rows.forEach(function (n) {
        var tr = document.createElement('tr');
        var nbr = {};
        n.nets.forEach(function (k) { R.nets[k].nodes.forEach(function (id) { if (id !== n.id && R.nodes[id].tag) nbr[R.nodes[id].tag] = 1; }); });
        [n.tag || 'unread', kindName[n.kind] || n.kind, Object.keys(nbr).sort().join(', ') || '—'].forEach(function (t) {
          var td = document.createElement('td'); td.textContent = t; tr.appendChild(td);
        });
        tr.tabIndex = 0;
        tr.classList.toggle('on', n.id === selected);
        var pick = function () { select(n.id); };
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') pick(); });
        els.reg.appendChild(tr);
      });
      els.lines.innerHTML = '';
      var byLine = {}, order = [];
      R.nets.forEach(function (net) {
        var key = net.tag || 'untagged';
        if (!byLine[key]) { byLine[key] = {}; order.push(key); }
        net.nodes.forEach(function (id) { if (R.nodes[id].tag) byLine[key][R.nodes[id].tag] = 1; });
      });
      order.sort().forEach(function (key) {
        var tr = document.createElement('tr');
        [key, Object.keys(byLine[key]).sort().join(', ') || '\u2014'].forEach(function (t) {
          var td = document.createElement('td'); td.textContent = t; tr.appendChild(td);
        });
        els.lines.appendChild(tr);
      });
      var dangling = R.open.filter(function (o) { return !o.label; }), off = R.open.filter(function (o) { return o.label; });
      els.warn.textContent = (dangling.length ? dangling.length + ' dangling line end' + (dangling.length > 1 ? 's' : '') + ' (red on the graph). ' : 'No dangling line ends. ') +
        (off.length ? off.length + ' off-sheet connection' + (off.length > 1 ? 's' : '') + ': ' + off.map(function (o) { return o.label; }).join(', ') + '.' : '');
      els.warn.classList.toggle('bad', dangling.length > 0);
      answer();
    }
    function answer() {
      if (selected === null || !iso) { els.answer.innerHTML = '<b>Click any item on the graph.</b> The reader works out which valves must close to isolate it.'; return; }
      var n = R.nodes[selected], close = iso.close.map(function (id) { return R.nodes[id].tag || 'an unread valve'; }).sort();
      var others = iso.reaches.filter(function (id) { return id !== selected; }).map(function (id) { return R.nodes[id].tag || 'unread equipment'; });
      var msg = '<b></b><span></span>';
      els.answer.innerHTML = msg;
      els.answer.firstChild.textContent = 'To isolate ' + (n.tag || 'this item') + ': ';
      var text = close.length ? 'close ' + close.join(', ') + '.' : 'no isolation valve bounds it.';
      if (others.length) text += ' The envelope also takes in ' + others.join(', ') + ', because no isolation valve sits between them.';
      els.answer.lastChild.textContent = text;
    }
    function select(id) {
      selected = id === selected ? null : id;
      iso = selected === null ? null : isolate(R, selected);
      clearInterval(autoTimer);
      if (stage !== 'graph') setStage('graph'); else draw();
      report();
    }

    /* ---- pointer tools work on the source sheet ---- */
    var moved = false, drag = null;
    function toSource(e) {
      var r = view.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
    }
    view.style.touchAction = 'none';
    view.addEventListener('pointerdown', function (e) {
      var p = toSource(e);
      clearInterval(autoTimer);
      view.setPointerCapture(e.pointerId);
      if (tool === 'isolate') {
        if (stage !== 'graph') setStage('graph');
        var hit = null, bd = 34;
        R.nodes.forEach(function (n) {
          var b = n.box, dd = Math.hypot(Math.max(b.x0 - p[0], p[0] - b.x1, 0), Math.max(b.y0 - p[1], p[1] - b.y1, 0));
          if (dd < bd) { bd = dd; hit = n; }
        });
        if (hit) select(hit.id);
        return;
      }
      if (tool === 'move') {
        var pick = null, dist = 30;
        d.inline.forEach(function (s) { var q = Math.hypot(s.x - p[0], s.y - p[1]); if (q < dist) { dist = q; pick = s; } });
        if (pick) drag = { sym: pick, v: isVertical(d, pick), range: range(pick) };
        return;
      }
      if (tool === 'erase') { var st = { erase: true, pts: [p] }; strokes.push(st); drag = { stroke: st }; schedule(); return; }
      if (tool === 'pen') { var ln = { a: p, b: p.slice() }; strokes.push(ln); drag = { line: ln }; }
    });
    view.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = toSource(e);
      if (drag.sym) {
        var v = drag.v ? p[1] : p[0];
        v = Math.max(drag.range[0], Math.min(drag.range[1], Math.round(v)));
        if (drag.v) drag.sym.y = v; else drag.sym.x = v;
        moved = true;
        schedule();
      } else if (drag.stroke) { drag.stroke.pts.push(p); schedule(); }
      else if (drag.line) {
        var a = drag.line.a;
        // pipe is drawn square to the sheet
        drag.line.b = Math.abs(p[0] - a[0]) > Math.abs(p[1] - a[1]) ? [p[0], a[1]] : [a[0], p[1]];
        schedule();
      }
    });
    ['pointerup', 'pointercancel'].forEach(function (n) {
      view.addEventListener(n, function () { if (drag) { drag = null; run(false); } });
    });
    /* A symbol slides along its own straight, staying clear of its neighbours. */
    function range(s) {
      var pts = d.lines[s.line].pts, lo = 0, hi = 0, v = isVertical(d, s);
      for (var i = 0; i + 1 < pts.length; i++) {
        var a = pts[i], b = pts[i + 1];
        if (v && a[0] === b[0] && a[0] === s.x && between(s.y, a[1], b[1])) { lo = Math.min(a[1], b[1]); hi = Math.max(a[1], b[1]); }
        if (!v && a[1] === b[1] && a[1] === s.y && between(s.x, a[0], b[0])) { lo = Math.min(a[0], b[0]); hi = Math.max(a[0], b[0]); }
      }
      lo += 50; hi -= 50;
      var cur = v ? s.y : s.x;
      d.inline.concat(d.inst.map(function (n) { return { x: n.on[0], y: n.on[1], inst: true }; })).forEach(function (o) {
        if (o === s) return;
        var same = v ? o.x === s.x : o.y === s.y;
        if (!same) return;
        var q = v ? o.y : o.x;
        if (q < cur) lo = Math.max(lo, q + 60); else hi = Math.min(hi, q - 60);
      });
      return [lo, hi];
    }

    /* ---- controls ---- */
    Object.keys(DRAWINGS).forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.id = id; b.textContent = DRAWINGS[id].label;
      b.addEventListener('click', function () { moved = false; loadDrawing(id); });
      els.drawings.appendChild(b);
    });
    STAGES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.id = s.id; b.textContent = s.label;
      b.addEventListener('click', function () { clearInterval(autoTimer); setStage(s.id); });
      els.stages.appendChild(b);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-pid-tool]'), function (b) {
      b.addEventListener('click', function () {
        tool = b.dataset.pidTool;
        Array.prototype.forEach.call(root.querySelectorAll('[data-pid-tool]'), function (o) { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', String(o === b)); });
        view.dataset.tool = tool;
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-pid-range]'), function (input) {
      var key = input.dataset.pidRange, out = root.querySelector('[data-pid-val="' + key + '"]');
      var show = function () { out.textContent = key === 'skew' ? (+input.value).toFixed(1) + '°' : input.value; };
      show();
      input.addEventListener('input', function () { opt[key] = +input.value; show(); clearInterval(autoTimer); schedule(); });
    });
    var csv = root.querySelector('[data-pid-export]');
    if (csv) csv.addEventListener('click', function () {
      var rows = [['tag', 'type', 'kind', 'connected_to']];
      R.nodes.forEach(function (n) {
        var nbr = {};
        n.nets.forEach(function (k) { R.nets[k].nodes.forEach(function (id) { if (id !== n.id && R.nodes[id].tag) nbr[R.nodes[id].tag] = 1; }); });
        rows.push([n.tag || '', n.type, n.kind, Object.keys(nbr).join(' ')]);
      });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([rows.map(function (r) { return r.join(','); }).join('\n')], { type: 'text/csv' }));
      a.download = drawingId + '-register.csv';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    var reset = root.querySelector('[data-pid-reset]');
    if (reset) reset.addEventListener('click', function () { moved = false; loadDrawing(drawingId); });

    function start() { buildLibrary(); loadDrawing('skid'); }
    root.__pidApi = { set: function (o) { for (var k in o) opt[k] = o[k]; run(false); return root.__pid.score; }, load: function (id) { loadDrawing(id); clearInterval(autoTimer); }, stage: setStage, isolate: function (tag) { var n = R.nodes.filter(function (x) { return x.tag === tag; })[0]; if (n) select(n.id); return iso; }, erase: function (pts) { strokes.push({ erase: true, pts: pts }); run(false); } };
    (document.fonts && document.fonts.load ? Promise.all([document.fonts.load(FONT, 'A1'), document.fonts.load(FONT_S, 'A1')]) : Promise.resolve()).then(start, start);
  };
})();
