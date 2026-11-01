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

  /* ── nav: shadow on scroll + current section + small-screen menu ── */
  (function nav() {
    var bar = $('#nav');
    var links = $$('.nav-links a, .subnav a');
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
      .filter(function (a) { return a.getAttribute('href').charAt(0) === '#'; })
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

  /* ── nav menus: hover on desktop (CSS), click and keyboard here ─── */
  (function menus() {
    var btns = $$('.nav-drop-btn');
    function shut(except) {
      btns.forEach(function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        b.parentElement.classList.remove('is-open');
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = b.parentElement.classList.toggle('is-open');
        b.setAttribute('aria-expanded', String(open));
        shut(b);
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.nav-panel')) shut(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
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
      new Image().src = '../assets/compare/autocad-' + n + '.png';
      new Image().src = '../assets/compare/cadmium-' + n + '.png';
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
          bad.src = '../assets/compare/autocad-' + n + '.png';
          good.src = '../assets/compare/cadmium-' + n + '.png';
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
        ($('#fTrack') ? 'Start with: ' + $('#fTrack').value : ''),
        notes.value.trim() || form.dataset.default || '',
        '',
        form.dataset.attach || ''
      ].join('\n');

      window.location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent((form.dataset.subject || 'Enquiry') + ' — ' + (company.value.trim() || name.value.trim())) +
        '&body=' + encodeURIComponent(body);
    });
  })();

  /* ── year ───────────────────────────────────────────────────────── */
  (function year() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  })();

})();
