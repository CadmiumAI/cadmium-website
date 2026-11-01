/* 3D from 2D, live: three orthographic views become a solid.
   Each view is a soft silhouette. A point is inside the part when all three views say so
   (the field is their minimum, which keeps corners sharp); where the end view is round
   and the other two agree, sections are rounded rather than left square. The surface is
   extracted with surface nets, then re-projected onto the drawing, so any part of a view
   the other views do not support shows up as a conflict. All of it runs on this page. */
(function () {
  'use strict';

  var VIEWS = ['top', 'front', 'side'];   // top: x,y   front: x,z   side: y,z  (third-angle)

  /* Drawing helpers. Coordinates are 0..1 in the view, y down on the canvas. */
  function P(ctx, S) {
    return {
      rect: function (x, y, w, h) { ctx.fillRect(x * S, y * S, w * S, h * S); },
      circle: function (x, y, r) { ctx.beginPath(); ctx.arc(x * S, y * S, r * S, 0, 7); ctx.fill(); },
      poly: function (pts) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0] * S, p[1] * S) : ctx.moveTo(p[0] * S, p[1] * S); }); ctx.closePath(); ctx.fill(); },
      line: function (pts, w) {
        ctx.save(); ctx.lineWidth = w * S; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0] * S, p[1] * S) : ctx.moveTo(p[0] * S, p[1] * S); }); ctx.stroke(); ctx.restore();
      },
      cut: function (fn) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; fn(); ctx.restore(); }
    };
  }

  var SPOOL = function (p) {
    p.rect(.06, .32, .06, .36); p.rect(.12, .39, .76, .22); p.rect(.88, .32, .06, .36);
    p.rect(.4, .35, .2, .3);
  };
  var PRESETS = {
    spool: {
      label: 'Flanged spool',
      note: 'A flanged pipe spool. The bore shows only in the end view, and the sections come out round because the end view is round and the other two views agree.',
      top: SPOOL,
      front: SPOOL,
      side: function (p) { p.circle(.5, .5, .18); p.cut(function () { p.circle(.5, .5, .075); }); }
    },
    bracket: {
      label: 'Mounting bracket',
      note: 'A prismatic bracket with two holes through its base and one through its web. Each feature comes from the one view that shows it.',
      top: function (p) { p.rect(.14, .22, .72, .56); p.cut(function () { p.circle(.3, .36, .05); p.circle(.3, .64, .05); }); },
      front: function (p) { p.poly([[.14, .84], [.14, .68], [.64, .68], [.64, .2], [.86, .2], [.86, .84]]); },
      side: function (p) { p.rect(.22, .2, .56, .64); p.cut(function () { p.circle(.5, .4, .085); }); }
    },
    block: {
      label: 'Bearing block',
      note: 'A pillow block: base with bolt holes and a bored housing. The bore comes from the side view alone, and the rounded housing is the side outline carried through the depth.',
      top: function (p) { p.rect(.1, .1, .8, .8); p.cut(function () { [.18, .82].forEach(function (x) { p.circle(x, .24, .04); p.circle(x, .76, .04); }); }); },
      front: function (p) { p.rect(.1, .68, .8, .14); p.rect(.28, .2, .44, .5); },
      side: function (p) {
        p.rect(.1, .68, .8, .14);
        p.poly([[.28, .7], [.28, .42], [.72, .42], [.72, .7]]);
        p.circle(.5, .42, .22);
        p.cut(function () { p.circle(.5, .42, .12); });
      }
    },
    pipe: {
      label: 'Pipe run (plan + elevation)',
      note: 'One pipe, traced from a plan and an elevation. The side view is left full because a general arrangement usually omits it, so the two drawings alone fix the route.',
      top: function (p) { p.line([[.1, .78], [.42, .78], [.42, .32], [.9, .32]], .05); },
      front: function (p) { p.line([[.1, .22], [.68, .22], [.68, .72], [.9, .72]], .05); },
      side: function (p) { p.rect(0, 0, 1, 1); }
    }
  };

  window.CadCarve = function (root) {
    var N = innerWidth < 720 ? 64 : 96, RES = 384;
    var masks = {}, fields = {}, conflictCtx = {}, viewEls = {};
    var field = new Float32Array((N + 1) * (N + 1) * (N + 1));
    var preset = 'spool', tool = 'add', brush = 'rect', round = null;
    var stats = root.querySelector('[data-carve-stats]');
    var note = root.querySelector('[data-carve-note]');
    var conflictOut = root.querySelector('[data-carve-conflict]');
    var view3d = root.querySelector('[data-carve-3d]');
    var renderer, scene, camera, mesh, pending = false, lastGeom = null;
    var th = -0.72, ph = 0.56, zoom = 1, dirty3d = true, spin = !matchMedia('(prefers-reduced-motion:reduce)').matches;

    VIEWS.forEach(function (v) {
      var host = root.querySelector('[data-view="' + v + '"]');
      var cv = host.querySelector('canvas');
      cv.width = cv.height = RES;
      var over = document.createElement('canvas');
      over.width = over.height = N;
      over.className = 'carve-conflict';
      host.appendChild(over);
      var m = document.createElement('canvas');
      m.width = m.height = RES;
      m.getContext('2d', { willReadFrequently: true });
      masks[v] = m; fields[v] = new Float32Array((N + 1) * (N + 1));
      conflictCtx[v] = over.getContext('2d');
      viewEls[v] = cv;
      paintable(v, cv);
      dropable(v, host);
    });

    function loadPreset(id) {
      preset = id;
      var pr = PRESETS[id];
      VIEWS.forEach(function (v) {
        var ctx = masks[v].getContext('2d');
        ctx.clearRect(0, 0, RES, RES);
        ctx.fillStyle = '#000';
        pr[v](P(ctx, RES));
      });
      if (note) note.textContent = pr.note;
      Array.prototype.forEach.call(root.querySelectorAll('[data-preset]'), function (b) {
        var on = b.dataset.preset === id;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      schedule();
    }

    /* Sample a mask down to the grid, keeping coverage as a 0..1 value for sub-cell edges. */
    function sample(v) {
      var ctx = masks[v].getContext('2d'), d = ctx.getImageData(0, 0, RES, RES).data, f = fields[v];
      var cell = RES / N;
      for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) {
        var x0 = Math.max(0, Math.round((i - .5) * cell)), x1 = Math.min(RES, Math.round((i + .5) * cell));
        var y0 = Math.max(0, Math.round((j - .5) * cell)), y1 = Math.min(RES, Math.round((j + .5) * cell));
        var sum = 0, n = 0;
        for (var y = y0; y < y1; y += 2) for (var x = x0; x < x1; x += 2) { sum += d[(y * RES + x) * 4 + 3]; n++; }
        f[j * (N + 1) + i] = n ? sum / n / 255 : 0;
      }
    }

    /* Is the side view a disc (or ring) with the top and front views describing the same profile? */
    function detectRound() {
      var S = fields.side, W = N + 1, area = 0, x0 = W, x1 = 0, y0 = W, y1 = 0;
      for (var j = 0; j < W; j++) for (var i = 0; i < W; i++) {
        if (S[j * W + i] > .5) { area++; if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
      }
      if (!area || x1 - x0 < 6) return null;
      var w = x1 - x0 + 1, h = y1 - y0 + 1;
      if (Math.abs(w - h) > 2) return null;
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = w / 2, inside = 0, outside = 0;
      for (j = 0; j < W; j++) for (i = 0; i < W; i++) {
        var dd = Math.hypot(i - cx, j - cy);
        if (dd > r + 1 && S[j * W + i] > .5) outside++;
        if (dd > r * .85 && dd < r - 1 && S[j * W + i] < .5) inside++;
      }
      if (outside > 0 || inside > w) return null;
      var profile = [];
      for (i = 0; i < W; i++) {
        var a = 0, b = 0;
        for (j = 0; j < W; j++) { a += fields.top[j * W + i]; b += fields.front[j * W + i]; }
        if (Math.abs(a - b) > 1.5) return null;
        profile.push((a + b) / 4);
      }
      return { col: cx, row: cy, profile: profile };
    }

    function buildField() {
      var W = N + 1, T = fields.top, F = fields.front, S = fields.side;
      round = detectRound();
      for (var z = 0; z < W; z++) {        // z up the page in front and side views
        var zr = N - z;
        for (var y = 0; y < W; y++) {
          var s = S[zr * W + (N - y)], base = z * W * W + y * W;   // third-angle: the side view's left is the front
          for (var x = 0; x < W; x++) {
            var t = T[y * W + x], f = F[zr * W + x];
            var v = t < f ? t : f;
            if (s < v) v = s;
            if (round && v > 0) {
              // Round the section; the half-width of this slice comes from the views.
              var rr = round.profile[x];
              var e = rr + .5 - Math.hypot((N - y) - round.col, zr - round.row);
              if (e < v) v = e < 0 ? 0 : e;
            }
            field[base + x] = v;
          }
        }
      }
    }

    /* Naive surface nets over the iso level 0.5. */
    var nets = { verts: new Float32Array(600000), tris: new Uint32Array(1800000) };
    function surface() {
      var W = N + 1, W2 = W * W, verts = nets.verts, tris = nets.tris, nv = 0, nt = 0, ISO = .5;
      var prev = new Int32Array(W2).fill(-1), cur = new Int32Array(W2).fill(-1);
      var ED = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
      var c = new Float32Array(8);
      for (var z = 0; z < N; z++) {
        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) {
            var i0 = z * W2 + y * W + x, mask = 0;
            c[0] = field[i0]; c[1] = field[i0 + 1]; c[2] = field[i0 + W]; c[3] = field[i0 + W + 1];
            c[4] = field[i0 + W2]; c[5] = field[i0 + W2 + 1]; c[6] = field[i0 + W2 + W]; c[7] = field[i0 + W2 + W + 1];
            for (var k = 0; k < 8; k++) if (c[k] > ISO) mask |= 1 << k;
            if (mask === 0 || mask === 255) continue;
            var sx = 0, sy = 0, sz = 0, count = 0;
            for (var e = 0; e < 12; e++) {
              var a = ED[e][0], b = ED[e][1], A = c[a] > ISO, B = c[b] > ISO;
              if (A === B) continue;
              var t = (ISO - c[a]) / (c[b] - c[a]);
              sx += ((a & 1) + ((b & 1) - (a & 1)) * t);
              sy += (((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t);
              sz += (((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t);
              count++;
            }
            if (nv * 3 + 3 > verts.length) continue;
            verts[nv * 3] = x + sx / count; verts[nv * 3 + 1] = y + sy / count; verts[nv * 3 + 2] = z + sz / count;
            var id = nv++, slot = y * W + x;
            cur[slot] = id;
            if (nt * 3 + 12 > tris.length) continue;
            var inside = mask & 1;
            if (y > 0 && z > 0 && inside !== ((mask >> 1) & 1))   // edge along +x
              nt = quad(inside, id, cur[slot - W], prev[slot - W], prev[slot], tris, nt);
            if (x > 0 && z > 0 && inside !== ((mask >> 2) & 1))   // edge along +y
              nt = quad(inside, id, prev[slot], prev[slot - 1], cur[slot - 1], tris, nt);
            if (x > 0 && y > 0 && inside !== ((mask >> 4) & 1))   // edge along +z
              nt = quad(inside, id, cur[slot - 1], cur[slot - W - 1], cur[slot - W], tris, nt);
          }
        }
        var sw = prev; prev = cur; cur = sw; cur.fill(-1);
      }
      return { nv: nv, nt: nt };
    }
    // Wound for the mirrored y in upload(): the top view's y runs down the page.
    function quad(inside, a, b, c, d, tris, nt) {
      if (a < 0 || b < 0 || c < 0 || d < 0) return nt;
      if (inside) { var t = b; b = d; d = t; }
      tris[nt * 3] = a; tris[nt * 3 + 1] = b; tris[nt * 3 + 2] = c;
      tris[nt * 3 + 3] = a; tris[nt * 3 + 4] = c; tris[nt * 3 + 5] = d;
      return nt + 2;
    }

    /* Mark every view cell that is drawn but has no material behind it in the solid. */
    function reproject() {
      var W = N + 1, proj = { top: new Uint8Array(W * W), front: new Uint8Array(W * W), side: new Uint8Array(W * W) };
      for (var z = 0; z < W; z++) for (var y = 0; y < W; y++) for (var x = 0; x < W; x++) {
        if (field[z * W * W + y * W + x] > .5) {
          proj.top[y * W + x] = 1; proj.front[(N - z) * W + x] = 1; proj.side[(N - z) * W + (N - y)] = 1;
        }
      }
      var total = 0;
      VIEWS.forEach(function (v) {
        var ctx = conflictCtx[v], img = ctx.createImageData(N, N), f = fields[v], miss = 0, p = proj[v], drawn = 0;
        for (var c = 0; c < f.length; c++) if (f[c] > .5) drawn++;
        // A view filled edge to edge was not drawn at all; it constrains nothing and cannot conflict.
        var given = drawn < f.length * .9;
        for (var j = 1; given && j < N; j++) for (var i = 1; i < N; i++) {
          var at = j * W + i;
          // One cell of slack, so rounding along an edge is not reported as a disagreement.
          if (f[at] > .5 && !p[at] && !p[at - 1] && !p[at + 1] && !p[at - W] && !p[at + W]) {
            var o = (j * N + i) * 4;
            img.data[o] = 255; img.data[o + 1] = 74; img.data[o + 2] = 60; img.data[o + 3] = 210;
            miss++;
          }
        }
        ctx.putImageData(img, 0, 0);
        total += miss;
      });
      return total;
    }

    function drawViews() {
      VIEWS.forEach(function (v) {
        var ctx = viewEls[v].getContext('2d');
        ctx.clearRect(0, 0, RES, RES);
        ctx.fillStyle = 'rgba(148,163,184,.16)';
        ctx.fillRect(0, 0, RES, RES);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(masks[v], 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        // the view's outline: mask dilated, minus the mask
        ctx.save();
        ctx.globalAlpha = 1;
        var edge = document.createElement('canvas');
        edge.width = edge.height = RES;
        var e = edge.getContext('2d');
        for (var a = 0; a < 8; a++) e.drawImage(masks[v], Math.cos(a * .785) * 2.2, Math.sin(a * .785) * 2.2);
        e.globalCompositeOperation = 'destination-out';
        e.drawImage(masks[v], 0, 0);
        e.globalCompositeOperation = 'source-in';
        e.fillStyle = '#cbd5e1';
        e.fillRect(0, 0, RES, RES);
        ctx.drawImage(edge, 0, 0);
        ctx.restore();
      });
    }

    function solve() {
      pending = false;
      var t0 = performance.now();
      VIEWS.forEach(sample);
      buildField();
      var r = surface();
      var conflicts = reproject();
      var dt = performance.now() - t0;
      drawViews();
      if (renderer) upload(r);
      var filled = 0;
      for (var i = 0; i < field.length; i++) if (field[i] > .5) filled++;
      if (stats) stats.innerHTML =
        '<span><b>' + filled.toLocaleString() + '</b> solid cells</span>' +
        '<span><b>' + r.nt.toLocaleString() + '</b> triangles</span>' +
        '<span><b>' + dt.toFixed(0) + ' ms</b> this rebuild, on your machine</span>' +
        '<span><b>' + (round ? 'Round' : 'Prismatic') + '</b> sections inferred</span>';
      if (conflictOut) {
        conflictOut.textContent = conflicts
          ? conflicts.toLocaleString() + ' drawn cells have nothing behind them. The views disagree; the conflict is marked in red.'
          : 'The views agree: the solid reproduces all three.';
        conflictOut.classList.toggle('bad', conflicts > 0);
      }
      root.__carve = { conflicts: conflicts, tris: r.nt, round: !!round, cells: filled, ms: dt };
    }

    function schedule() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(solve);
    }

    /* ---- editing the views ---- */
    function paintable(v, cv) {
      var down = false, start = null, snap = null, ctx = masks[v].getContext('2d');
      function pos(e) {
        var r = cv.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width * RES, (e.clientY - r.top) / r.height * RES];
      }
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', function (e) {
        down = true; start = pos(e);
        cv.setPointerCapture(e.pointerId);
        snap = ctx.getImageData(0, 0, RES, RES);
        spin = false;
        apply(start);
        e.preventDefault();
      });
      cv.addEventListener('pointermove', function (e) { if (down) apply(pos(e)); });
      ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { down = false; }); });
      function apply(p) {
        ctx.save();
        if (tool === 'cut') ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        if (brush === 'brush') {
          ctx.beginPath(); ctx.arc(p[0], p[1], 14, 0, 7); ctx.fill();
        } else {
          ctx.putImageData(snap, 0, 0);
          var x = Math.min(start[0], p[0]), y = Math.min(start[1], p[1]), w = Math.abs(p[0] - start[0]), h = Math.abs(p[1] - start[1]);
          if (brush === 'circle') {
            ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); ctx.fill();
          } else {
            ctx.fillRect(x, y, w, h);
          }
        }
        ctx.restore();
        schedule();
      }
    }

    function dropable(v, host) {
      host.addEventListener('dragover', function (e) { e.preventDefault(); host.classList.add('over'); });
      host.addEventListener('dragleave', function () { host.classList.remove('over'); });
      host.addEventListener('drop', function (e) {
        e.preventDefault(); host.classList.remove('over');
        var f = e.dataTransfer.files[0];
        if (!f || !/^image\//.test(f.type)) return;
        var im = new Image(), url = URL.createObjectURL(f);
        im.onload = function () {
          URL.revokeObjectURL(url);
          var c = masks[v].getContext('2d');
          c.clearRect(0, 0, RES, RES);
          var s = Math.min(RES / im.width, RES / im.height), w = im.width * s, h = im.height * s;
          var tmp = document.createElement('canvas'); tmp.width = tmp.height = RES;
          var t = tmp.getContext('2d');
          t.fillStyle = '#fff'; t.fillRect(0, 0, RES, RES);
          t.drawImage(im, (RES - w) / 2, (RES - h) / 2, w, h);
          var d = t.getImageData(0, 0, RES, RES), out = c.createImageData(RES, RES);
          for (var i = 0; i < d.data.length; i += 4) {
            var dark = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3 < 128;
            out.data[i + 3] = dark ? 255 : 0;
          }
          c.putImageData(out, 0, 0);
          schedule();
        };
        im.src = url;
      });
    }

    /* ---- the solid ---- */
    function init3d() {
      if (!window.THREE) { view3d.textContent = 'Could not load the 3D library.'; return; }
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0, 0);
      renderer.domElement.className = 'iso-canvas';
      view3d.appendChild(renderer.domElement);
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
      scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x3a5578, 1.1));
      var d = new THREE.DirectionalLight(0xffffff, .85);
      d.position.set(-.6, 1.4, 1.2);
      scene.add(d);
      var g = new THREE.BufferGeometry();
      mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd5dbe5, roughness: .38, metalness: .35, side: THREE.FrontSide }));
      scene.add(mesh);
      var box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(N, N, N)), new THREE.LineBasicMaterial({ color: 0x637fff, transparent: true, opacity: .55 }));
      box.rotation.x = 0;
      scene.add(box);
      lastGeom = g;
      var drag = false, px = 0, py = 0;
      var el = renderer.domElement;
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', function (e) { drag = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); spin = false; });
      el.addEventListener('pointermove', function (e) {
        if (!drag) return;
        th -= (e.clientX - px) * .01; ph = Math.max(-1.5, Math.min(1.5, ph + (e.clientY - py) * .01));
        px = e.clientX; py = e.clientY; dirty3d = true;
      });
      ['pointerup', 'pointercancel'].forEach(function (n) { el.addEventListener(n, function () { drag = false; }); });
      el.addEventListener('wheel', function (e) {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault(); zoom = Math.max(.5, Math.min(4, zoom * Math.exp(-e.deltaY * .002))); dirty3d = true;
      }, { passive: false });
      if (window.ResizeObserver) new ResizeObserver(sizeUp).observe(view3d);
      sizeUp();
      var on = true;
      new IntersectionObserver(function (en) { on = en[0].isIntersecting; }).observe(view3d);
      (function tick() {
        requestAnimationFrame(tick);
        if (!on) return;
        if (spin) { th += .0035; dirty3d = true; }
        if (dirty3d) { place(); renderer.render(scene, camera); dirty3d = false; }
      })();
    }
    function sizeUp() {
      var w = view3d.clientWidth, h = view3d.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      dirty3d = true;
    }
    function place() {
      var w = view3d.clientWidth, h = view3d.clientHeight, a = w / h, s = N * .74 / zoom;
      var hh = a > 1 ? s : s / a, hw = hh * a;
      camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
      camera.up.set(0, 0, 1);
      camera.position.set(Math.sin(th) * Math.cos(ph) * 300, -Math.cos(th) * Math.cos(ph) * 300, Math.sin(ph) * 300);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
    function upload(r) {
      var g = lastGeom, n = r.nv * 3, pos = new Float32Array(n), half = N / 2;
      for (var i = 0; i < r.nv; i++) {
        pos[i * 3] = nets.verts[i * 3] - half;
        pos[i * 3 + 1] = half - nets.verts[i * 3 + 1];   // the top view's y runs down the page
        pos[i * 3 + 2] = nets.verts[i * 3 + 2] - half;
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(nets.tris.slice(0, r.nt * 3), 1));
      g.deleteAttribute('normal');   // a stale, shorter attribute would leave NaNs past its end
      g.computeVertexNormals();
      dirty3d = true;
    }

    /* ---- STL: the real result, to open in any CAD tool ---- */
    function stl() {
      var g = lastGeom;
      if (!g || !g.index) return;
      var pos = g.attributes.position.array, idx = g.index.array, nt = idx.length / 3;
      var buf = new ArrayBuffer(84 + nt * 50), dv = new DataView(buf), o = 84;
      dv.setUint32(80, nt, true);
      for (var t = 0; t < nt; t++) {
        o += 12; // normals left zero; every reader recomputes them from winding
        for (var k = 0; k < 3; k++) {
          var v = idx[t * 3 + k] * 3;
          dv.setFloat32(o, pos[v], true); dv.setFloat32(o + 4, pos[v + 1], true); dv.setFloat32(o + 8, pos[v + 2], true);
          o += 12;
        }
        o += 2;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'model/stl' }));
      a.download = preset + '-from-2d.stl';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    /* ---- controls ---- */
    var presetBox = root.querySelector('[data-carve-presets]');
    Object.keys(PRESETS).forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.preset = id; b.textContent = PRESETS[id].label;
      b.addEventListener('click', function () { loadPreset(id); });
      presetBox.appendChild(b);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-tool]'), function (b) {
      b.addEventListener('click', function () {
        tool = b.dataset.tool;
        Array.prototype.forEach.call(root.querySelectorAll('[data-tool]'), function (o) { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-brush]'), function (b) {
      b.addEventListener('click', function () {
        brush = b.dataset.brush;
        Array.prototype.forEach.call(root.querySelectorAll('[data-brush]'), function (o) { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    var dl = root.querySelector('[data-carve-stl]');
    if (dl) dl.addEventListener('click', stl);
    var cl = root.querySelector('[data-carve-clear]');
    if (cl) cl.addEventListener('click', function () {
      VIEWS.forEach(function (v) { masks[v].getContext('2d').clearRect(0, 0, RES, RES); });
      schedule();
    });

    init3d();
    loadPreset('spool');
  };
})();
