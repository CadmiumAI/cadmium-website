/* Product clips: the Cadmium app, playing a job, inside a browser frame. They run only while on
   screen, and hold their finished state when motion is reduced. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var NAV = ['Projects', 'P&IDs', 'Isometrics', 'MTO', 'Reviews', 'Site'];

  function tile(k, v, s) { return '<div class="m-tile"><span>' + k + '</span><b data-num="' + v + '">0</b><em>' + (s || '') + '</em></div>'; }
  function cursor() { return '<i class="m-cursor"><svg viewBox="0 0 20 22"><path d="M1 1v16.2l4.4-4 2.9 6.8 3.1-1.4L8.6 12l6-.6Z" fill="#0B2A50" stroke="#fff" stroke-width="1.4"/></svg></i>'; }

  /* Each clip: the page, its address, the active nav item, and steps of [wait ms, function]. */
  var CLIPS = {
    pid: {
      nav: 'P&IDs', url: 'p-ids/area-200', root: true,
      html: function (R) {
        var TAGS = [['HV-101', 22.8, 46.3], ['P-101A', 30.5, 46.3], ['CK-101', 36.6, 46.3], ['HV-103', 43.4, 46.3], ['FT-101', 54.3, 48.2], ['FV-101', 60.2, 56], ['PT-101', 67.2, 48.2], ['D-101', 81.7, 49], ['E-101', 55, 15.8], ['T-101', 12, 55], ['HV-107', 34.4, 15.8], ['LV-101', 56.3, 85.4]];
        var LINES = [['6-PW-101', 'T-101', 'P-101A', '6'], ['4-PW-103', 'P-101A', 'HV-105', '4'], ['4-PW-104', 'FV-101', 'D-101', '4'], ['3-VP-105', 'D-101', 'E-101', '3'], ['3-VP-106', 'E-101', 'V-201', '3'], ['2-DR-107', 'D-101', 'Drain', '2']];
        return '<div class="m-head"><div><small>Area 200 &rsaquo; P&amp;IDs</small><h5>Feed pump skid</h5></div><span class="m-pill" data-pill>Reading</span></div>' +
          '<div class="m-tiles">' + tile('Sheets read', 48, 'of 48') + tile('Tags', 1284, 'linked to source') + tile('Lines', 212, 'traced') + tile('To review', 6, 'flagged') + '</div>' +
          '<div class="m-split"><div class="m-cad m-pidview"><img src="' + R + 'assets/posters/pid.png" alt=""><i class="m-scan"></i>' +
          TAGS.map(function (t, i) { return '<b class="m-tag" style="left:' + t[1] + '%;top:' + t[2] + '%" data-i="' + i + '">' + t[0] + '</b>'; }).join('') +
          '</div><div class="m-card"><h6>Line list</h6><table class="m-t"><tr><th>Line</th><th>From</th><th>To</th><th>NB</th></tr>' +
          LINES.map(function (l) { return '<tr class="m-row"><td>' + l.join('</td><td>') + '</td></tr>'; }).join('') + '</table></div></div>';
      },
      steps: function (m) {
        return [[300, function () { m.add('.m-scan', 'run'); m.nums(); }],
          [500, function () { m.seq('.m-tag', 170); }], [2100, function () { m.seq('.m-row', 240); }],
          [1500, function () { m.pill('Ready for review', 'ok'); }]];
      }
    },
    iso: {
      nav: 'Isometrics', url: 'isometrics/sheet-8', root: true,
      html: function (R) {
        var S = ['Read model', 'Build graph', 'Lay out', 'Annotate', 'Export DWG'];
        return '<div class="m-head"><div><small>Area 200 &rsaquo; Isometrics</small><h5>Isometric 8</h5></div><span class="m-pill" data-pill>Running</span></div>' +
          '<div class="m-split m-split--iso"><div class="m-card"><h6>Pipeline</h6><div class="m-bar"><i></i></div><ol class="m-stages">' +
          S.map(function (s) { return '<li><i></i>' + s + '</li>'; }).join('') + '</ol>' +
          '<div class="m-kv"><span>Parts</span><b data-num="71">0</b><span>Dimensions</span><b data-num="24">0</b><span>BOM items</span><b data-num="15">0</b></div>' +
          '<button class="m-btn" tabindex="-1">Download DWG</button></div>' +
          '<div class="m-cad"><img class="m-wipe" src="' + R + 'assets/posters/isometrics.png" alt=""></div></div>';
      },
      steps: function (m) {
        return [[300, function () { m.add('.m-bar', 'run'); m.seq('.m-stages li', 620); m.nums(3200); }],
          [700, function () { m.add('.m-wipe', 'run'); }], [3000, function () { m.pill('Finished', 'ok'); m.add('.m-btn', 'ready'); }]];
      }
    },
    mto: {
      nav: 'MTO', url: 'mto/revisions', root: true,
      html: function () {
        var R = [['Pipe, 8 in, Sch 40', '124 m', '131 m', '+7 m', 'up'], ['Elbow 90 LR, 8 in', '18', '21', '+3', 'up'], ['Gate valve, 8 in, 300#', '6', '6', '0', ''], ['Flange WN, 8 in, 300#', '24', '22', '-2', 'dn'], ['Reducer, 8 × 6', '4', '5', '+1', 'up'], ['Gasket, 8 in, SWG', '24', '22', '-2', 'dn'], ['Stud bolt set, 8 in', '24', '22', '-2', 'dn']];
        return '<div class="m-head"><div><small>Area 200 &rsaquo; MTO</small><h5>Rev A &rarr; Rev B</h5></div><span class="m-pill" data-pill>Comparing</span></div>' +
          '<div class="m-tiles">' + tile('Items', 642, 'in this MTO') + tile('Changed', 37, 'since Rev A') + tile('Lines touched', 9, 'of 212') + tile('Surplus avoided', 12, 'items') + '</div>' +
          '<div class="m-card"><table class="m-t m-t--wide"><tr><th>Item</th><th>Rev A</th><th>Rev B</th><th>Change</th></tr>' +
          R.map(function (r) { return '<tr class="m-row ' + r[4] + '"><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="m-b">' + r[2] + '</td><td class="m-d">' + r[3] + '</td></tr>'; }).join('') + '</table></div>';
      },
      steps: function (m) {
        return [[300, function () { m.nums(); m.seq('.m-row', 340); }], [2700, function () { m.pill('Sent to procurement', 'ok'); }]];
      }
    },
    review: {
      nav: 'Reviews', url: 'reviews/sheet-8', root: true,
      html: function (R) {
        return '<div class="m-head"><div><small>Area 200 &rsaquo; Reviews</small><h5>Isometric 8, Rev B</h5></div><span class="m-pill" data-pill>In review</span></div>' +
          '<div class="m-split m-split--rev"><div class="m-cad m-revs"><img src="' + R + 'assets/posters/isometrics.png" alt="">' +
          '<svg viewBox="0 0 100 60" preserveAspectRatio="none"><ellipse class="m-cloud" cx="47" cy="42" rx="13" ry="10"/><ellipse class="m-cloud" cx="19" cy="20" rx="9" ry="9"/></svg>' +
          '<b class="m-pin" style="left:57%;top:53%">1</b><b class="m-pin" style="left:27%;top:17%">2</b></div>' +
          '<div class="m-card"><h6>Changes found</h6><ul class="m-list"><li class="m-row"><b>1</b>Line upsized, 6 to 8 in</li><li class="m-row"><b>2</b>Valve HV-103 moved 400 mm</li><li class="m-row"><b>&#10003;</b>BOM matches model</li><li class="m-row"><b>&#10003;</b>P&amp;ID matches model</li></ul>' +
          '<button class="m-btn" tabindex="-1">Approve and issue</button><p class="m-sign">Checked by R. Engineer</p></div></div>';
      },
      steps: function (m) {
        return [[400, function () { m.add('.m-revs', 'run'); }], [800, function () { m.seq('.m-row', 480); }],
          [2200, function () { m.add('.m-btn', 'ready'); }], [800, function () { m.add('.m-btn', 'press'); m.add('.m-sign', 'on'); m.pill('Issued', 'ok'); }]];
      }
    },
    site: {
      nav: 'Site', url: 'site/sheet-8', root: true,
      html: function (R) {
        return '<div class="m-head"><div><small>Area 200 &rsaquo; Site</small><h5>Crew view</h5></div><span class="m-pill" data-pill>Syncing</span></div>' +
          '<div class="m-split m-split--site"><div class="m-cad m-ken"><img src="' + R + 'assets/viewer-3d.png" alt=""></div>' +
          '<div class="m-card"><h6>Sheets at workface</h6><ul class="m-list m-sheets"><li class="m-row"><span>ISO-8</span><em class="ok">Rev C, current</em></li><li class="m-row m-old"><span>ISO-8</span><em class="bad">Rev B, superseded</em></li><li class="m-row"><span>ISO-9</span><em class="ok">Rev B, current</em></li><li class="m-row"><span>ISO-10</span><em class="ok">Rev A, current</em></li></ul>' +
          '<div class="m-kv"><span>Crew devices</span><b data-num="38">0</b><span>CAD licences</span><b data-num="0">0</b></div></div></div>';
      },
      steps: function (m) {
        return [[300, function () { m.add('.m-ken', 'run'); m.nums(); m.seq('.m-row', 420); }], [2100, function () { m.pill('All crews current', 'ok'); }]];
      }
    }
  };

  function Mock(host) {
    var clip = CLIPS[host.dataset.mock], R = host.dataset.root || '';
    if (!clip) return;
    host.classList.add('mock-wrap');
    var inner = document.createElement('div');
    host.innerHTML = '';
    host.appendChild(inner);
    var timers = [], onScreen = false, running = false;
    function $(s) { return inner.querySelector(s); }
    function all(s) { return Array.prototype.slice.call(inner.querySelectorAll(s)); }
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    var api = {
      add: function (s, c) { all(s).forEach(function (e) { e.classList.add(c); }); },
      seq: function (s, gap) { all(s).forEach(function (e, i) { later(i * gap, function () { e.classList.add('on'); }); }); },
      pill: function (t, c) { var p = $('[data-pill]'); p.textContent = t; p.classList.add(c); },
      nums: function (dur) { all('[data-num]').forEach(function (b) { CadCount(b, +b.dataset.num, { dur: dur || 1500 }); }); }
    };
    function draw() {
      inner.className = 'mock';
      inner.innerHTML = '<div class="m-bar-top"><span class="m-dots"><i></i><i></i><i></i></span><span class="m-url">app.cadmium-ai.com/' + clip.url + '</span></div>' +
        '<div class="m-app"><aside><b class="m-logo">Cd</b>' + NAV.map(function (n) { return '<span class="' + (n === clip.nav ? 'on' : '') + '">' + n.replace('&', '&amp;') + '</span>'; }).join('') + '</aside><section class="m-main">' + clip.html(R) + '</section></div>';
      fit();
    }
    function fit() { var w = host.clientWidth; if (w) { inner.style.setProperty('--s', Math.min(1, w / 980).toFixed(4)); host.style.height = 620 * Math.min(1, w / 980) + 'px'; } }
    function finish() {
      ['.m-row', '.m-tag', '.m-stages li'].forEach(function (s) { all(s).forEach(function (e) { e.classList.add('on'); }); });
      ['.m-scan', '.m-bar', '.m-wipe', '.m-revs', '.m-ken'].forEach(function (s) { api.add(s, 'run'); });
      api.add('.m-btn', 'ready'); api.add('.m-sign', 'on');
      api.nums(1);
      inner.classList.add('done');
    }
    function play() {
      if (running || !onScreen) return;
      running = true;
      draw();
      var at = 0;
      clip.steps(api).forEach(function (s) { at += s[0]; later(at, s[1]); });
      later(at + 3800, function () { running = false; timers = []; if (onScreen) play(); });
    }
    function stop() { timers.forEach(clearTimeout); timers = []; running = false; }
    draw();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    if (RM) { finish(); return; }
    new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting;
      if (onScreen) play(); else stop();
    }, { threshold: .25 }).observe(host);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-mock]'), Mock);
})();
