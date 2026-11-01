/* Home page: the project lifecycle map, the cost calculator and the linked-documents view. */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* Lifecycle. A pipe runs through the phases; flow stops at the selected one. */
  var lc = document.getElementById('lc');
  if (lc) {
    var nodes = $$('.lc-node', lc), panels = $$('.lc-panel', lc);
    var pick = function (id, focus) {
      nodes.forEach(function (n, i) {
        var on = n.dataset.phase === id;
        n.classList.toggle('on', on);
        n.setAttribute('aria-selected', String(on));
        n.tabIndex = on ? 0 : -1;
        if (on) {
          lc.style.setProperty('--progress', ((i + .5) / nodes.length * 100) + '%');
          if (focus) n.focus();
          if (n.scrollIntoView && n.parentNode.scrollWidth > n.parentNode.clientWidth) n.parentNode.scrollLeft = n.offsetLeft - 20;
        }
      });
      panels.forEach(function (p) { p.hidden = p.dataset.panel !== id; });
    };
    nodes.forEach(function (n, i) {
      n.addEventListener('click', function () { pick(n.dataset.phase); });
      n.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        pick(nodes[(i + d + nodes.length) % nodes.length].dataset.phase, true);
      });
    });
    pick('feed');
    // Walks the project by itself until someone takes over.
    if (!RM) {
      var auto = setInterval(function () {
        if (!lc.classList.contains('in') || lc.matches(':hover')) return;
        var cur = nodes.map(function (n) { return n.classList.contains('on'); }).indexOf(true);
        pick(nodes[(cur + 1) % nodes.length].dataset.phase);
      }, 5200);
      nodes.forEach(function (n) { n.addEventListener('click', function () { clearInterval(auto); }); });
    }
  }

  /* Walkthrough tabs follow the page. */
  var bar = $$('.walk-bar a'), steps = $$('.walk-step');
  if (bar.length && 'IntersectionObserver' in window) {
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        bar.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    steps.forEach(function (s) { wio.observe(s); });
  }

  /* Cost */
  var calc = document.getElementById('costCalc');
  if (calc) {
    var lastH = 0, lastS = 0;
    var v = function (id) { var x = parseFloat(document.getElementById(id).value); return isFinite(x) && x > 0 ? x : 0; };
    var run = function () {
      var n = v('cIso'), today = n * v('cHrs') * (1 + v('cRev') * .5);
      var withC = n * (1 + v('cRev')) * (10 / 60);
      var hours = Math.max(0, today - withC);
      var E = function (id) { return document.getElementById(id); }, top = Math.max(today, withC, 1);
      CadCount(E('cHours'), Math.round(hours), { dur: 500, from: lastH });
      CadCount(E('cSaved'), Math.round(hours * v('cRate')), { dur: 500, pre: '$', from: lastS });
      lastH = Math.round(hours); lastS = Math.round(hours * v('cRate'));
      E('cBarA').style.width = today / top * 100 + '%';
      E('cBarB').style.width = withC / top * 100 + '%';
      E('cA').textContent = Math.round(today).toLocaleString('en-US') + ' h';
      E('cB').textContent = Math.round(withC).toLocaleString('en-US') + ' h';
    };
    calc.addEventListener('input', run);
    run();
  }

  /* Linked documents */
  var t = document.getElementById('thread-demo');
  if (t) {
    var box = t.querySelector('[data-parts]');
    var PARTS = [['pump', 'Pump'], ['valve', 'Gate valve'], ['reducer', 'Reducer'], ['elbow', 'Elbow'], ['pipe', 'Pipe']];
    var select = function (id) {
      $$('[data-part]', t).forEach(function (el) { el.classList.toggle('hot', el.dataset.part === id); });
      $$('.chip', box).forEach(function (c) { var on = c.dataset.id === id; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
    };
    PARTS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.id = p[0]; b.textContent = p[1];
      b.addEventListener('click', function () { stopT(); select(p[0]); });
      box.appendChild(b);
    });
    $$('[data-part]', t).forEach(function (el) { el.addEventListener('click', function () { stopT(); select(el.dataset.part); }); });
    select('valve');

    var btn = t.querySelector('[data-revise]');
    var revise = function () {
      var toB = t.dataset.rev === 'A';
      t.dataset.rev = toB ? 'B' : 'A';
      btn.textContent = toB ? 'Back to 6 in' : 'Upsize line to 8 in';
      t.querySelector('[data-revtext]').textContent = t.dataset.rev;
      t.querySelector('[data-linetag]').textContent = toB ? '8-PW-101' : '6-PW-101';
      t.querySelector('[data-sizeflag]').textContent = (toB ? '8 NB' : '6 NB') + ' · Rev ' + t.dataset.rev;
      $$('td[data-a]', t).forEach(function (td) { td.innerHTML = toB ? td.dataset.b : td.dataset.a; td.classList.toggle('changed', toB); });
      t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse');
    };
    btn.addEventListener('click', function () { stopT(); revise(); });
    /* Plays itself: find each part, then issue a revision. */
    var ti = 1, tTimer = null;
    function stopT() { clearInterval(tTimer); tTimer = null; }
    if (!RM) tTimer = setInterval(function () {
      if (!t.classList.contains('in')) return;
      if (ti === PARTS.length) { revise(); ti = 0; return; }
      select(PARTS[ti][0]); ti++;
    }, 1900);
  }
})();
