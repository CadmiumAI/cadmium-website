/* ═══════════════════════════════════════════════════════════════════════
   Cadmium — cadmium-ai.com
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Where the "send us your model" form is addressed. One place to change. */
  var CONTACT_EMAIL = 'hello@cadmium-ai.com';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── theme ──────────────────────────────────────────────────────── */
  (function theme() {
    var btn = $('#themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      if (!cur) {
        cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('cad-theme', next); } catch (e) {}
    });
  })();

  /* ── nav: shadow on scroll + current section + small-screen menu ── */
  (function nav() {
    var bar = $('#nav');
    var links = $$('.nav-links a');
    var menu = $('#navLinks'), burger = $('#navToggle');

    if (burger) {
      var shut = function () {
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
      };
      burger.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      links.forEach(function (a) { a.addEventListener('click', shut); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
      document.addEventListener('click', function (e) {
        if (!menu.contains(e.target) && !burger.contains(e.target)) shut();
      });
    }

    var sections = links
      .map(function (a) { return $(a.getAttribute('href')); })
      .filter(Boolean);

    function onScroll() {
      bar.classList.toggle('is-stuck', window.scrollY > 8);
      var y = window.scrollY + 140, current = null;
      sections.forEach(function (s) { if (s.offsetTop <= y) current = s.id; });
      links.forEach(function (a) {
        a.classList.toggle('is-current', a.getAttribute('href') === '#' + current);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ── lightbox ───────────────────────────────────────────────────── */
  (function lightbox() {
    var box = $('#lightbox'), img = $('#lightboxImg'), close = $('#lightboxClose');
    if (!box) return;

    function open(src, alt) {
      img.src = src; img.alt = alt || '';
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      close.focus();
    }
    function shut() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      img.src = '';
    }

    $$('.zoomable').forEach(function (fig) {
      function fire() {
        var i = fig.querySelector('img');
        if (i) open(i.currentSrc || i.src, i.alt);
      }
      fig.addEventListener('click', fire);
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
      });
    });

    box.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) shut();
    });
  })();

  /* ── comparison tabs ────────────────────────────────────────────── */
  (function compare() {
    var tabs = $$('.cmp-tab');
    var grid = $('.cmp-grid');
    var bad = $('#cmpBad'), good = $('#cmpGood');
    var badLbl = $('#cmpBadLine'), goodLbl = $('#cmpGoodLine');
    if (!tabs.length || !bad) return;

    /* warm the other three pairs so switching is instant */
    ['02', '03', '04'].forEach(function (n) {
      new Image().src = 'assets/compare/autocad-' + n + '.png';
      new Image().src = 'assets/compare/cadmium-' + n + '.png';
    });

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('is-active')) return;
        var n = tab.dataset.line;
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', String(on));
        });
        grid.classList.add('is-swapping');
        setTimeout(function () {
          bad.src = 'assets/compare/autocad-' + n + '.png';
          good.src = 'assets/compare/cadmium-' + n + '.png';
          badLbl.textContent = goodLbl.textContent = 'Line ' + n;
          grid.classList.remove('is-swapping');
        }, 220);
      });
    });
  })();

  /* ── savings calculator ─────────────────────────────────────────── */
  (function calculator() {
    var isos = $('#calcIsos'), drafters = $('#calcDrafters'), hours = $('#calcHours');
    var today = $('#outToday'), cad = $('#outCad'), saved = $('#outSaved'), pct = $('#outPct');
    if (!isos) return;

    var CAD_MINUTES = 10;

    function num(el, min, fallback) {
      var v = parseFloat(el.value);
      if (!isFinite(v) || v < min) v = fallback;
      return v;
    }
    function round(n) { return Math.round(n).toLocaleString('en-US'); }

    function run() {
      var n = num(isos, 0, 0), d = num(drafters, 1, 1), h = num(hours, 0, 0);
      var now = (n * h) / d;
      var next = (n * (CAD_MINUTES / 60)) / d;
      var diff = Math.max(0, now - next);
      today.textContent = round(now);
      cad.textContent = round(next);
      saved.textContent = round(diff);
      var p = now > 0 ? Math.round((diff / now) * 100) : 0;
      pct.textContent = 'hours per month — ' + p + '% less';
    }

    [isos, drafters, hours].forEach(function (el) {
      el.addEventListener('input', run);
      el.addEventListener('change', run);
    });
    run();
  })();

  /* ── contact form → mailto ──────────────────────────────────────── */
  (function contact() {
    var form = $('#contactForm');
    var link = $('#formMailLink');
    if (link) { link.href = 'mailto:' + CONTACT_EMAIL; link.textContent = CONTACT_EMAIL; }
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#fName'), email = $('#fEmail'), notes = $('#fNotes'), company = $('#fCompany');
      var ok = true;

      [[name, name.value.trim().length > 0], [email, /\S+@\S+\.\S+/.test(email.value)]]
        .forEach(function (pair) {
          pair[0].parentElement.classList.toggle('is-bad', !pair[1]);
          if (!pair[1]) ok = false;
        });
      if (!ok) { (name.value.trim() ? email : name).focus(); return; }

      var body = [
        'Name: ' + name.value.trim(),
        'Company: ' + (company.value.trim() || '—'),
        'Email: ' + email.value.trim(),
        '',
        notes.value.trim() || 'Sending a Plant 3D model for an isometric.',
        '',
        '(Please attach the model to this email.)'
      ].join('\n');

      window.location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent('Isometric request — ' + (company.value.trim() || name.value.trim())) +
        '&body=' + encodeURIComponent(body);
    });
  })();

  /* ── year ───────────────────────────────────────────────────────── */
  (function year() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  })();

  /* ═══════════════════════════════════════════════════════════════
     App walkthrough — a scripted run of the real drawing page
     ══════════════════════════════════════════════════════════════ */
  (function demo() {
    var root = $('#demo');
    if (!root) return;

    var cursor   = $('#demoCursor');
    var drop     = $('#demoDrop');
    var fileA    = $('#demoFileA');
    var fileB    = $('#demoFileB');
    var pill     = $('#demoPill');
    var generate = $('#demoGenerate');
    var pipeCard = $('#demoPipelineCard');
    var pipePill = $('#demoPipePill');
    var progress = $('#demoProgress');
    var logEl    = $('#demoLog');
    var resCard  = $('#demoResultCard');
    var page     = $('.ui-page', root);
    var body     = $('.browser-body', root);
    var stages   = $$('.ui-stages li', root);
    var replay   = $('#demoReplay');

    var LOG = [
      '[1/7] acquiring geometry',
      '[2/7] segmenting model',
      '[3/7] calibrating layout',
      '[4/7] reconciling spacing',
      '[5/7] composing sheet',
      '[6/7] placing annotation',
      '[7/7] publishing -> Isometric 8.dxf'
    ];

    var timers = [];
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    function moveTo(el, pad) {
      if (!el) return;
      var a = root.getBoundingClientRect(), b = el.getBoundingClientRect();
      var x = b.left - a.left + b.width / 2;
      var y = b.top - a.top + (pad === undefined ? b.height / 2 : pad);
      cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    function click() {
      cursor.classList.remove('is-click');
      void cursor.offsetWidth;
      cursor.classList.add('is-click');
    }
    function show(card) {
      card.classList.add('is-shown');
      requestAnimationFrame(function () { card.classList.add('is-in'); });
    }
    /* the page scrolls under the app's top bar, so that is the real top edge */
    function bounds() {
      var b = body.getBoundingClientRect();
      return { top: $('.ui-top', root).getBoundingClientRect().bottom, bottom: b.bottom };
    }
    function shift(delta) {
      if (!delta) return;
      var next = Math.min(0, parseFloat(page.dataset.y || '0') + delta);
      page.dataset.y = String(next);
      page.style.transform = 'translateY(' + next + 'px)';
    }
    /* put `el` near the top of the visible area */
    function scrollTo(el) {
      var v = bounds();
      shift((v.top + 14) - el.getBoundingClientRect().top);
    }
    /* …or nudge it just far enough to be in sight, so the cursor never clicks
       off-screen and the page never jumps more than it has to */
    function ensure(el) {
      var v = bounds(), e = el.getBoundingClientRect();
      if (e.bottom > v.bottom - 14) shift((v.bottom - 14) - e.bottom);
      else if (e.top < v.top + 14) shift((v.top + 14) - e.top);
    }

    function loadFile(el, label, size) {
      el.classList.add('is-loaded');
      $('.ui-file-icon', el).textContent = '✓';
      $('.ui-file-meta em', el).textContent = label + ' · ' + size;
    }

    function reset() {
      clearAll();
      root.dataset.stage = '0';
      cursor.classList.remove('is-on', 'is-click');
      cursor.style.transform = 'translate(-40px,-40px)';
      page.dataset.y = '0';
      page.style.transform = 'translateY(0)';
      drop.classList.remove('is-hot');
      [fileA, fileB].forEach(function (f, i) {
        f.classList.remove('is-loaded');
        $('.ui-file-icon', f).textContent = i ? 'I' : 'D';
        $('.ui-file-meta em', f).textContent = 'REQUIRED';
      });
      pill.textContent = '• NEW';
      pill.classList.remove('is-ready');
      pipePill.textContent = '• RUNNING';
      pipePill.classList.remove('is-done');
      progress.style.width = '0%';
      logEl.textContent = '';
      stages.forEach(function (s) { s.classList.remove('is-run', 'is-ok'); });
      [pipeCard, resCard].forEach(function (c) { c.classList.remove('is-shown', 'is-in'); });
    }

    function finish() {
      root.dataset.stage = '3';
      loadFile(fileA, 'DXF', '689 KB');
      loadFile(fileB, 'IGES', '919 KB');
      pill.textContent = '• READY';
      pill.classList.add('is-ready');
      show(pipeCard); show(resCard);
      progress.style.width = '100%';
      logEl.textContent = LOG.join('\n');
      stages.forEach(function (s) { s.classList.add('is-ok'); });
      pipePill.textContent = '• DONE';
      pipePill.classList.add('is-done');
    }

    function play() {
      reset();
      if (reduced) { finish(); return; }

      at(300,  function () { ensure(drop); });
      at(900,  function () { cursor.classList.add('is-on'); moveTo(drop); });
      at(1700, function () { drop.classList.add('is-hot'); });
      at(2050, function () { click(); });
      at(2250, function () {
        root.dataset.stage = '1';
        drop.classList.remove('is-hot');
        loadFile(fileA, 'DXF', '689 KB');
      });
      at(2500, function () { loadFile(fileB, 'IGES', '919 KB'); });
      at(2750, function () { pill.textContent = '• READY'; pill.classList.add('is-ready'); });

      at(3150, function () { ensure(generate); });
      at(3700, function () { moveTo(generate); });
      at(4400, function () { click(); generate.classList.add('is-pressed'); });
      at(4580, function () { generate.classList.remove('is-pressed'); });

      at(4700, function () {
        root.dataset.stage = '2';
        cursor.classList.remove('is-on');
        show(pipeCard);
        stages[0].classList.add('is-run');
      });
      at(5000, function () { scrollTo(pipeCard); });

      /* seven log lines, stages ticking alongside */
      var stageOfLine = [0, 1, 1, 2, 2, 2, 3];
      LOG.forEach(function (line, i) {
        at(5300 + i * 620, function () {
          logEl.textContent += (i ? '\n' : '') + line;
          progress.style.width = Math.round(((i + 1) / LOG.length) * 100) + '%';
          var s = stageOfLine[i];
          stages.forEach(function (el, k) {
            if (k < s) { el.classList.remove('is-run'); el.classList.add('is-ok'); }
            else if (k === s) { el.classList.add('is-run'); }
          });
        });
      });

      var end = 5300 + LOG.length * 620;
      at(end, function () {
        stages.forEach(function (s) { s.classList.remove('is-run'); s.classList.add('is-ok'); });
        pipePill.textContent = '• DONE';
        pipePill.classList.add('is-done');
        root.dataset.stage = '3';
      });
      at(end + 400, function () { show(resCard); });
      /* nudge, not jump — the end of the pipeline stays in shot beside the result */
      at(end + 900, function () { ensure(resCard); });
    }

    if (replay) replay.addEventListener('click', play);

    var started = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !started) { started = true; obs.disconnect(); play(); }
        });
      }, { threshold: 0.3 }).observe(root);
    } else {
      finish();
    }
  })();


})();
