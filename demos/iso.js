/* The isometric demo: one recorded run of the real Cadmium pipeline.
   Mesh -> centreline graph -> compaction -> expansion -> projection -> the solved sheet.
   Graph vertices keep their indices through every stage, so what moves on screen is
   exactly what the pipeline moved. Data comes from tools/build_iso_demo.py. */
(function () {
  'use strict';

  var ISO_DIR = [-1 / Math.sqrt(3), -1 / Math.sqrt(3), 1 / Math.sqrt(3)]; // top-south-west
  var SVG_PER_MODEL = Math.sqrt(1.5);                                    // isometric drawing scale
  var TYPE_COLOR = {
    Pipe: 0x8d99ad, Elbow: 0xb4bdcb, Flange: 0xdde2ea, Gasket: 0xffffff,
    Valve: 0x6f86ff, Tee: 0xb4bdcb, Reducer: 0xa3acc0, Support: 0x4d5868
  };
  var HOT = new (function () { this.r = 1; this.g = 0.85; this.b = 0.35; })();
  var LAYERS = [
    { id: 'pipe', label: 'Pipe', stroke: ['#00aa00'], to: '#34d399' },
    { id: 'glyph', label: 'Fittings', stroke: ['#00aa55', '#1565c0'], to: '#a9b6ca' },
    { id: 'dim', label: 'Dimensions', stroke: ['#ff0000'], to: '#ff7b6b' },
    { id: 'elev', label: 'Elevations', stroke: ['#ff00ff'], to: '#e59af7' },
    { id: 'bom', label: 'Balloons', stroke: ['#333', '#000000', '#999999'], to: '#e2e8f0' }
  ];

  function vLerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function basis(dir) { var r = norm(cross([0, 0, 1], dir)); return { r: r, u: cross(dir, r) }; }

  window.CadIso = function (root, opts) {
    opts = opts || {};
    var hero = !!opts.hero;
    var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
    var view = root.querySelector('[data-iso-view]') || root;
    var captions = root.querySelector('[data-iso-steps]');
    var note = root.querySelector('[data-iso-note]');
    var tip = root.querySelector('[data-iso-tip]');
    var play = root.querySelector('[data-iso-play]');
    var layerBox = root.querySelector('[data-iso-layers]');
    if (!window.THREE) { fail('Could not load the 3D library.'); return; }

    function fail(m) { root.classList.add('iso-failed'); if (note) note.textContent = m; }

    var STAGES = [
      { id: 'model', graph: 'graph3d', title: '3D model', text: 'The piping model as exported: {items} parts. Hover any part to read its catalogue entry.' },
      { id: 'graph', graph: 'graph3d', title: 'Centreline graph', text: 'What is connected to what: {nodes} nodes and {edges} edges, recovered from the solids.' },
      { id: 'compact', graph: 'compact', title: 'Compact', text: 'Long runs are capped so the whole line reads at one scale. Topology does not change.' },
      { id: 'expand', graph: 'expand', title: 'Expand', text: 'Short runs are floored, and fittings pushed apart until every symbol has room.' },
      { id: 'project', graph: 'expand', title: 'Project', text: 'The graph, viewed along the isometric axis from the top south-west.' },
      { id: 'sheet', graph: 'expand', title: 'Annotate', text: 'Dimensions, elevations and balloons placed so nothing collides. Export writes native CAD entities.' }
    ];

    var data, renderer, scene, camera, mesh, tubes, joints, used, colorAttr, baseColors;
    var state = { dir: null, target: [0, 0, 0], ppw: 1 };
    var stage = 0, morph = { from: null, to: null, t: 1 }, cam = null, sheetEl = null;
    var lastTick = performance.now(), hovered = -1, timer = null, onScreen = true, dirty = true, W = 1, H = 1, started = false;
    var userDir = norm([-0.75, -1, 0.72]);

    var canvas = document.createElement('canvas');
    canvas.className = 'iso-canvas';
    canvas.setAttribute('aria-label', 'A piping model that can be rotated, then transformed step by step into a finished isometric drawing');
    view.appendChild(canvas);

    function anchor() {
      // The hero keeps its drawing clear of the copy on the left.
      if (hero && W > 980) return { x: W * 0.52, y: 64, w: W * 0.46, h: H - 170 };
      if (hero) return { x: 10, y: 8, w: W - 20, h: H - 16 };
      return { x: 12, y: 12, w: W - 24, h: H - 24 };
    }

    function fitStage(i) {
      var s = STAGES[i], A = anchor();
      if (s.id === 'project' || s.id === 'sheet') {
        // Fit the whole sheet, then derive the camera from it so the 3D graph lands on the SVG.
        var sh = data.sheet, x = sh.box, px = Math.min(A.w / x.width, A.h / x.height);
        var P = bounds(data.stages.expand, ISO_DIR), b = sh.pipeBox;
        var cu = (x.x + x.width / 2 - b[0][0]) / SVG_PER_MODEL + P.minR;
        var cv = -((x.y + x.height / 2 - b[0][1]) / SVG_PER_MODEL - P.maxU);
        var B = basis(ISO_DIR);
        return { dir: ISO_DIR, target: [B.r[0] * cu + B.u[0] * cv, B.r[1] * cu + B.u[1] * cv, B.r[2] * cu + B.u[2] * cv], ppw: px * SVG_PER_MODEL };
      }
      var dir = userDir, F = bounds(data.stages[s.graph], dir);
      var ppw = Math.min(A.w / (F.maxR - F.minR), A.h / (F.maxU - F.minU)) * 0.9;
      var Bb = basis(dir), mr = (F.minR + F.maxR) / 2, mu = (F.minU + F.maxU) / 2, d0 = F.centerD;
      return { dir: dir, ppw: ppw, target: [
        Bb.r[0] * mr + Bb.u[0] * mu + dir[0] * d0,
        Bb.r[1] * mr + Bb.u[1] * mu + dir[1] * d0,
        Bb.r[2] * mr + Bb.u[2] * mu + dir[2] * d0] };
    }

    function bounds(V, dir) {
      var B = basis(dir), o = { minR: 1e18, maxR: -1e18, minU: 1e18, maxU: -1e18, centerD: 0 }, n = 0;
      used.forEach(function (i) {
        var p = V[i], r = dot(B.r, p), u = dot(B.u, p);
        if (r < o.minR) o.minR = r; if (r > o.maxR) o.maxR = r;
        if (u < o.minU) o.minU = u; if (u > o.maxU) o.maxU = u;
        o.centerD += dot(dir, p); n++;
      });
      o.centerD /= n;
      return o;
    }

    function applyCamera() {
      var A = anchor(), s = state, d = norm(s.dir), far = 200000;
      var ax = A.x + A.w / 2, ay = A.y + A.h / 2;
      camera.left = -ax / s.ppw; camera.right = (W - ax) / s.ppw;
      camera.top = ay / s.ppw; camera.bottom = -(H - ay) / s.ppw;
      camera.near = 1; camera.far = far * 2;
      camera.up.set(0, 0, 1);
      camera.position.set(s.target[0] + d[0] * far, s.target[1] + d[1] * far, s.target[2] + d[2] * far);
      camera.lookAt(s.target[0], s.target[1], s.target[2]);
      camera.updateProjectionMatrix();
      if (sheetEl) placeSheet();
    }

    function placeSheet() {
      var sh = data.sheet, P = bounds(data.stages.expand, ISO_DIR), B = basis(ISO_DIR);
      var scale = state.ppw / SVG_PER_MODEL, A = anchor(), ax = A.x + A.w / 2, ay = A.y + A.h / 2;
      var tr = dot(B.r, state.target), tu = dot(B.u, state.target);
      var left = ax + (P.minR - tr) * state.ppw - sh.pipeBox[0][0] * scale;
      var top = ay - (P.maxU - tu) * state.ppw - sh.pipeBox[0][1] * scale;
      sheetEl.style.transform = 'translate(' + left + 'px,' + top + 'px) scale(' + scale + ')';
    }

    var _m, _q, _v, _s, _y, _p;
    function setGraph(V) {
      var radius = 2.6 / state.ppw;
      data.edges.forEach(function (e, i) {
        var a = V[e[0]], b = V[e[1]];
        _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        var len = _v.length() || 1;
        _q.setFromUnitVectors(_y, _v.divideScalar(len));
        _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        _s.set(radius, len, radius);
        _m.compose(_p, _q, _s);
        tubes.setMatrixAt(i, _m);
      });
      tubes.instanceMatrix.needsUpdate = true;
      _q.identity();
      used.forEach(function (idx, i) {
        var a = V[idx];
        _p.set(a[0], a[1], a[2]);
        _s.set(radius * 2, radius * 2, radius * 2);
        _m.compose(_p, _q, _s);
        joints.setMatrixAt(i, _m);
      });
      joints.instanceMatrix.needsUpdate = true;
    }

    function currentGraph() {
      var A = data.stages[morph.from], B = data.stages[morph.to], t = ease(morph.t);
      return A.map(function (p, i) { return vLerp(p, B[i], t); });
    }

    function go(i, immediate) {
      stage = i;
      var s = STAGES[i], target = fitStage(i);
      morph = { from: morph.to || s.graph, to: s.graph, t: immediate ? 1 : 0 };
      cam = { from: { dir: state.dir || target.dir, target: state.target, ppw: state.ppw }, to: target, t: immediate ? 1 : 0 };
      if (immediate) { state = { dir: target.dir, target: target.target, ppw: target.ppw }; applyCamera(); setGraph(data.stages[s.graph]); }

      mesh.material.opacity = 1;
      root.dataset.stage = s.id;
      if (sheetEl) sheetEl.classList.toggle('on', s.id === 'sheet');
      var ghost = s.id === 'graph';
      mesh.visible = s.id === 'model' || ghost;
      mesh.material.opacity = ghost ? 0.14 : 1;
      mesh.material.transparent = ghost;
      mesh.material.depthWrite = !ghost;
      tubes.visible = joints.visible = s.id !== 'model' && s.id !== 'sheet';
      if (captions) Array.prototype.forEach.call(captions.children, function (b, n) {
        b.classList.toggle('on', n === i);
        b.classList.toggle('done', n < i);
        b.setAttribute('aria-pressed', String(n === i));
      });
      if (note) note.textContent = s.text
        .replace('{items}', data.items.length)
        .replace('{nodes}', used.length)
        .replace('{edges}', data.edges.length);
      setHover(-1);
      dirty = true;
    }

    function loop() {
      requestAnimationFrame(loop);
      if (!onScreen) return;
      // By the clock rather than per frame, so a slow machine still lands on time.
      var now = performance.now(), step = Math.min(.25, (now - lastTick) / 950);
      lastTick = now;
      if (morph.t < 1) { morph.t = Math.min(1, morph.t + step); setGraph(currentGraph()); dirty = true; }
      if (cam && cam.t < 1) {
        cam.t = Math.min(1, cam.t + step);
        var t = ease(cam.t);
        state = {
          dir: norm(vLerp(cam.from.dir, cam.to.dir, t)),
          target: vLerp(cam.from.target, cam.to.target, t),
          ppw: Math.exp(Math.log(cam.from.ppw) + (Math.log(cam.to.ppw) - Math.log(cam.from.ppw)) * t)
        };
        applyCamera();
        if (morph.t >= 1) setGraph(data.stages[morph.to]);
        dirty = true;
      }
      if (dirty) { renderer.render(scene, camera); dirty = false; }
    }

    function resize() {
      W = view.clientWidth; H = view.clientHeight;
      if (!W || !H) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      var t = fitStage(stage);
      state = { dir: t.dir, target: t.target, ppw: t.ppw };
      if (cam) cam.t = 1;
      applyCamera();
      setGraph(morph.to ? data.stages[morph.to] : data.stages.graph3d);
      dirty = true;
    }

    function setHover(i) {
      if (i === hovered) return;
      paint(hovered, false); paint(i, true);
      hovered = i; dirty = true;
      if (!tip) return;
      if (i < 0) { tip.hidden = true; return; }
      var it = data.items[i];
      tip.hidden = false;
      tip.innerHTML = '<b></b><span></span>';
      tip.firstChild.textContent = it.type === 'Support' ? 'Structural' : it.type;
      tip.lastChild.textContent = it.desc || (it.type === 'Pipe' ? 'Straight run' : 'Unclassified solid in the model');
    }
    function paint(i, on) {
      if (i < 0) return;
      var it = data.items[i], c = colorAttr.array;
      for (var v = it.v[0]; v < it.v[0] + it.v[1]; v++) {
        c[v * 3] = on ? HOT.r : baseColors[v * 3];
        c[v * 3 + 1] = on ? HOT.g : baseColors[v * 3 + 1];
        c[v * 3 + 2] = on ? HOT.b : baseColors[v * 3 + 2];
      }
      colorAttr.needsUpdate = true;
    }
    function itemOfFace(f) {
      var ix = f * 3, lo = 0, hi = data.items.length - 1;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (data.items[mid].i[0] <= ix) lo = mid; else hi = mid - 1;
      }
      return lo;
    }

    function pointer() {
      var down = false, px = 0, py = 0, moved = 0, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      view.style.touchAction = hero ? 'pan-y' : 'none';
      view.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button,a,input,label')) return;
        if (STAGES[stage].id === 'project' || STAGES[stage].id === 'sheet') return;
        down = true; px = e.clientX; py = e.clientY; moved = 0;
        stopAuto();
        view.setPointerCapture(e.pointerId);
      });
      view.addEventListener('pointermove', function (e) {
        if (down) {
          var dx = e.clientX - px, dy = e.clientY - py;
          px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
          var d = state.dir, th = Math.atan2(d[1], d[0]) - dx * 0.008;
          var ph = Math.max(-1.45, Math.min(1.45, Math.asin(d[2]) + dy * 0.008));
          userDir = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)];
          state.dir = userDir;
          if (cam) cam.t = 1;
          applyCamera(); dirty = true;
          return;
        }
        if (STAGES[stage].id !== 'model' || e.pointerType === 'touch') return;
        var r = canvas.getBoundingClientRect();
        ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
        ray.setFromCamera(ndc, camera);
        var hit = ray.intersectObject(mesh)[0];
        setHover(hit ? itemOfFace(hit.faceIndex) : -1);
        if (tip && hit) {
          tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 260) + 'px';
          tip.style.top = (e.clientY - r.top + 14) + 'px';
        }
      });
      ['pointerup', 'pointercancel'].forEach(function (n) { view.addEventListener(n, function () { down = false; }); });
      view.addEventListener('pointerleave', function () { setHover(-1); });
      if (!hero) view.addEventListener('wheel', function (e) {
        if (!(e.ctrlKey || e.metaKey) || STAGES[stage].id === 'sheet' || STAGES[stage].id === 'project') return;
        e.preventDefault();
        state.ppw *= Math.exp(-e.deltaY * 0.0016);
        if (cam) cam.t = 1;
        applyCamera(); setGraph(data.stages[morph.to]); dirty = true;
      }, { passive: false });
    }

    function buildSheet() {
      var host = document.createElement('div');
      host.className = 'iso-sheet';
      var svgText = data.sheet.svg.replace(/<rect width="100%" height="100%" fill="white"\/>/, '');
      LAYERS.forEach(function (l) {
        l.stroke.forEach(function (c) {
          svgText = svgText.split('"' + c + '"').join('"' + l.to + '"');
        });
      });
      svgText = svgText.replace(/fill="white"/g, 'fill="#12182c"').replace(/fill="#eeeeee"/g, 'fill="#182038"');
      host.innerHTML = svgText;
      var svg = host.querySelector('svg');
      svg.setAttribute('width', data.sheet.w);
      svg.setAttribute('height', data.sheet.h);
      Array.prototype.forEach.call(svg.children, function (el) {
        var hay = el.outerHTML.slice(0, 400), found = 'bom';
        LAYERS.forEach(function (l) { if (hay.indexOf('"' + l.to + '"') >= 0 && found === 'bom') found = l.id; });
        el.setAttribute('data-layer', found);
      });
      view.appendChild(host);
      sheetEl = host;
      // The annotations overhang the pipeline's viewBox, so fit what is really drawn.
      data.sheet.box = svg.getBBox();
      if (layerBox) {
        LAYERS.forEach(function (l) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'chip on'; b.textContent = l.label;
          b.style.setProperty('--c', l.to);
          b.setAttribute('aria-pressed', 'true');
          b.addEventListener('click', function () {
            var off = b.classList.toggle('on') === false;
            b.setAttribute('aria-pressed', String(!off));
            host.classList.toggle('hide-' + l.id, off);
          });
          layerBox.appendChild(b);
        });
      }
    }

    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      if (play) play.textContent = 'Play the run';
    }
    function startAuto() {
      stopAuto();
      if (play) play.textContent = 'Pause';
      timer = setInterval(function () {
        if (!onScreen) return;
        go((stage + 1) % STAGES.length);
      }, hero ? 3200 : 2800);
    }

    function build(bin) {
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      scene.add(new THREE.HemisphereLight(0xeef1f6, 0x1a2030, 1.0));
      var sun = new THREE.DirectionalLight(0xffffff, 0.75);
      sun.position.set(-1, -2, 3);
      scene.add(sun);

      var nV = data.counts.verts, nI = data.counts.indices;
      var q = new Int16Array(bin, 0, nV * 3);
      var idx = new Uint32Array(bin.slice(nV * 6, nV * 6 + nI * 4));
      var pos = new Float32Array(nV * 3), lo = data.box.lo, span = data.box.span;
      for (var i = 0; i < nV * 3; i++) pos[i] = (q[i] + 32768) / 65535 * span + lo[i % 3];
      baseColors = new Float32Array(nV * 3);
      var col = new THREE.Color();
      data.items.forEach(function (it) {
        col.setHex(TYPE_COLOR[it.type] || 0x8899aa);
        for (var v = it.v[0]; v < it.v[0] + it.v[1]; v++) {
          baseColors[v * 3] = col.r; baseColors[v * 3 + 1] = col.g; baseColors[v * 3 + 2] = col.b;
        }
      });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      colorAttr = new THREE.BufferAttribute(baseColors.slice(), 3);
      g.setAttribute('color', colorAttr);
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      mesh = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 70, specular: 0x8892a4, side: THREE.DoubleSide }));
      scene.add(mesh);

      var seen = {};
      data.edges.forEach(function (e) { seen[e[0]] = seen[e[1]] = 1; });
      used = Object.keys(seen).map(Number);

      _m = new THREE.Matrix4(); _q = new THREE.Quaternion(); _v = new THREE.Vector3();
      _s = new THREE.Vector3(); _y = new THREE.Vector3(0, 1, 0); _p = new THREE.Vector3();
      tubes = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshBasicMaterial({ color: 0x34d399 }), data.edges.length);
      joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfe6ff }), used.length);
      tubes.frustumCulled = joints.frustumCulled = false;
      scene.add(tubes); scene.add(joints);

      buildSheet();

      if (captions) {
        STAGES.forEach(function (s, n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<i>' + (n + 1) + '</i><span></span>';
          b.lastChild.textContent = s.title;
          b.addEventListener('click', function () { stopAuto(); go(n); });
          captions.appendChild(b);
        });
      }
      if (play) play.addEventListener('click', function () { if (timer) stopAuto(); else { go((stage + 1) % STAGES.length); startAuto(); } });

      morph.to = 'graph3d';
      W = view.clientWidth; H = view.clientHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      var startAt = reduced ? STAGES.length - 1 : 0;
      go(startAt, true);
      pointer();
      if (window.ResizeObserver) new ResizeObserver(resize).observe(view);
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) dirty = true; }).observe(view);
      root.classList.add('iso-ready');
      loop();
      if (!reduced && opts.autoplay !== false) startAuto();
    }

    var base = opts.data || 'demos/data/iso8';
    Promise.all([
      fetch(base + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(base + '.bin').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    ]).then(function (res) {
      data = res[0];
      started = true;
      build(res[1]);
      root.__iso = { go: go, stop: stopAuto, stage: function () { return STAGES[stage].id; } };
    }).catch(function (err) {
      if (window.console) console.error(err);
      if (!started) fail('The recorded run could not load.');
    });
  };
})();
