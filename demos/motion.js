/* Site-wide motion: reveal on scroll, counters, scroll progress and the pipework canvas behind
   dark heroes. Everything ends in its normal state, so reduced motion simply skips to it. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- reveal ---- */
  var TARGETS = '.band h2,.band .eyebrow,.band .lead,.step,.tenet,.role,.cap,.prod,.pf,.trust-grid>div,.ltable tbody tr,.faq,.pilot-steps li,.integ-col,.walk-step,.cost-calc,.boundary,.flow-mid,.thread-grid figure,.sub-hero h1,.sub-hero .lead,.sub-hero .eyebrow,.sub-hero .hq-actions,.sub-grid>.mock-wrap';
  if (!RM && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion');
    var items = $$(TARGETS).filter(function (el) { return !el.closest('.lab,.hq,.calcpad,.browser,.cta-form'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('seen');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    items.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.tagName === el.tagName; });
      el.classList.add('rv');
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 70 + 'ms');
      io.observe(el);
    });
  }

  /* ---- counters ---- */
  window.CadCount = function (el, to, opts) {
    opts = opts || {};
    var dec = opts.dec || 0, fmt = function (v) { return (opts.pre || '') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (opts.post || ''); };
    if (RM) { el.textContent = fmt(to); return; }
    var from = opts.from || 0, t0 = performance.now(), dur = opts.dur || 1100;
    if (el.__tick) cancelAnimationFrame(el.__tick);
    (function tick(now) {
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (t < 1) el.__tick = requestAnimationFrame(tick);
    })(t0);
  };
  var counts = $$('.count[data-to]');
  if (counts.length && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        CadCount(e.target, parseFloat(e.target.dataset.to), { dec: +(e.target.dataset.dec || 0) });
        var viz = e.target.closest('.pf');
        if (viz) viz.classList.add('live');
      });
    }, { threshold: .4 });
    counts.forEach(function (c) { co.observe(c); });
  }

  /* ---- anything that should animate only while on screen ---- */
  if ('IntersectionObserver' in window) {
    var on = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('in', e.isIntersecting); });
    }, { threshold: .15 });
    $$('[data-inview]').forEach(function (el) { on.observe(el); });
  }

  /* ---- scroll progress along the nav, drawn like a dimension line ---- */
  var nav = document.getElementById('nav');
  if (nav && !RM) {
    var bar = document.createElement('i');
    bar.className = 'nav-progress';
    nav.appendChild(bar);
    var queued = false, paint = function () {
      queued = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    };
    addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  /* ---- pipework: orthogonal runs with flow moving through them ---- */
  window.CadFlow = function (host) {
    var cv = document.createElement('canvas');
    cv.className = 'flow-cv';
    cv.setAttribute('aria-hidden', 'true');
    host.insertBefore(cv, host.firstChild);
    var c = cv.getContext('2d'), W = 0, H = 0, runs = [], dots = [], mx = -999, my = -999, seed = 7, visible = true;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function build() {
      var dpr = Math.min(devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 7; runs = []; dots = [];
      var G = 52, count = Math.max(7, Math.round(W / 130));
      for (var i = 0; i < count; i++) {
        var x = Math.round(rnd() * W / G) * G, y = Math.round(rnd() * H / G) * G, pts = [[x, y]], horiz = rnd() > .4, len = 0;
        for (var s = 0; s < 4; s++) {
          var d = (2 + Math.floor(rnd() * 6)) * G * (rnd() > .5 ? 1 : -1);
          if (horiz) x += Math.abs(d); else y += d;
          pts.push([x, y]); len += Math.abs(d); horiz = !horiz;
        }
        var valves = [];
        for (var v = 0; v < pts.length - 1; v++) if (rnd() > .55) valves.push(v);
        runs.push({ pts: pts, len: len, valves: valves });
        for (var n = 0; n < 3; n++) dots.push({ r: i, at: rnd() * len, sp: .5 + rnd() * 1.1 });
      }
    }
    function at(run, dist) {
      for (var i = 0; i + 1 < run.pts.length; i++) {
        var a = run.pts[i], b = run.pts[i + 1], l = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
        if (dist <= l) { var t = dist / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
        dist -= l;
      }
      return run.pts[run.pts.length - 1];
    }
    function frame() {
      if (!RM) requestAnimationFrame(frame);
      if (!visible || !W) return;
      c.clearRect(0, 0, W, H);
      c.lineWidth = 1;
      runs.forEach(function (r) {
        c.strokeStyle = 'rgba(156,198,242,.13)';
        c.beginPath();
        r.pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
        c.stroke();
        r.valves.forEach(function (i) {
          var a = r.pts[i], b = r.pts[i + 1], x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2, h = a[1] === b[1];
          c.strokeStyle = 'rgba(156,198,242,.22)';
          c.beginPath();
          if (h) { c.moveTo(x - 7, y - 5); c.lineTo(x + 7, y + 5); c.lineTo(x + 7, y - 5); c.lineTo(x - 7, y + 5); }
          else { c.moveTo(x - 5, y - 7); c.lineTo(x + 5, y + 7); c.lineTo(x - 5, y + 7); c.lineTo(x + 5, y - 7); }
          c.closePath(); c.stroke();
        });
      });
      dots.forEach(function (d) {
        var r = runs[d.r];
        d.at += d.sp; if (d.at > r.len) d.at = 0;
        for (var k = 0; k < 9; k++) {
          var p = at(r, Math.max(0, d.at - k * 5)), near = Math.hypot(p[0] - mx, p[1] - my) < 130;
          c.fillStyle = near ? 'rgba(255,207,92,' + (.85 - k * .09) + ')' : 'rgba(92,224,162,' + (.7 - k * .075) + ')';
          c.fillRect(p[0] - 1, p[1] - 1, 2, 2);
        }
      });
    }
    host.addEventListener('pointermove', function (e) { var b = host.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top; });
    host.addEventListener('pointerleave', function () { mx = my = -999; });
    if (window.ResizeObserver) new ResizeObserver(build).observe(host);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(host);
    build();
    frame();
  };
  $$('[data-flow]').forEach(CadFlow);
})();
