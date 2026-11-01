/* Product recordings: Cadmium Studio, the desktop application, doing a job. Each recording is one
   fixed 1280 x 800 frame that only ever scales as a whole, like video: its layout never reflows,
   its text cannot be selected and it takes no input. The drawings shown are real output (the
   isometric, 3D model and P&ID read); the GA is synthetic, because customer drawings stay private.
   Recordings run only while on screen, and hold their finished state when motion is reduced. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var W = 1280;

  var P = {
    open: 'M2 5h4l2 2h6v7H2z', save: 'M3 2h8l2 2v10H3zM5 2v4h5V2M5 14V9h6v5', undo: 'M5 3 2 6l3 3M2 6h7a4 4 0 0 1 0 8H6', redo: 'M11 3l3 3-3 3M14 6H7a4 4 0 0 0 0 8h3',
    play: 'M4 2l10 6-10 6z', zoom: 'M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2zM11 11l4 4', pan: 'M8 1v14M1 8h14M5 4l3-3 3 3M5 12l3 3 3-3M4 5 1 8l3 3M12 5l3 3-3 3',
    measure: 'M1 11 11 1l4 4L5 15zM4 8l2 2M7 5l2 2M10 2l2 2', layers: 'M8 2 1 6l7 4 7-4zM1 10l7 4 7-4', grid: 'M2 2h12v12H2zM2 6.5h12M2 10.5h12M6.5 2v12M10.5 2v12',
    cloud: 'M4 12a3 3 0 0 1 0-6 4 4 0 0 1 8 0 3 3 0 0 1 0 6z', export: 'M8 10V2M5 5l3-3 3 3M2 10v4h12v-4', check: 'M2 8l4 4 8-8', warn: 'M8 2l7 12H1zM8 6v4M8 12v.5',
    folder: 'M1 4h5l1.5 2H15v8H1z', sheet: 'M3 1h7l3 3v11H3zM10 1v3h3M5 8h6M5 11h6', cube: 'M8 1l6 3.5v7L8 15l-6-3.5v-7zM2 4.5 8 8l6-3.5M8 8v7', pipe: 'M1 6h9a3 3 0 0 1 3 3v6M1 10h7a1 1 0 0 1 1 1v4',
    list: 'M2 3h12M2 8h12M2 13h12', caret: 'M5 3l5 5-5 5', caretd: 'M3 5l5 5 5-5', x: 'M4 4l8 8M12 4l-8 8', search: 'M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2zM11 11l4 4', filter: 'M1 2h14L9 9v5l-2 1V9z', pin: 'M6 1h4l1 6 2 2H3l2-2zM8 9v6',
    label: 'M1 4h9l5 4-5 4H1zM4 8h.5', send: 'M1 8l14-6-5 13-2-6z'
  };
  function ic(n, c) { return '<svg class="ic ' + (c || '') + '" viewBox="0 0 16 16" aria-hidden="true"><path d="' + P[n] + '"/></svg>'; }
  var MENUS = ['File', 'Edit', 'View', 'Project', 'Model', 'Drawing', 'Review', 'Tools', 'Window', 'Help'];

  function tool(i, label, attr) { return '<span class="t-btn' + (label ? ' wide' : '') + '" ' + (attr || '') + '>' + ic(i) + (label ? '<em>' + label + '</em>' : '') + '</span>'; }
  function tree(rows) {
    return rows.map(function (r) {
      return '<div class="tr' + (r[3] && r[3].on ? ' on' : '') + '" style="padding-left:' + (6 + r[0] * 14) + 'px"' + (r[3] && r[3].id ? ' data-t="' + r[3].id + '"' : '') + '>' +
        (r[3] && r[3].leaf ? '<i class="sp"></i>' : ic(r[3] && r[3].shut ? 'caret' : 'caretd', 'car')) + ic(r[1], 'k-' + r[1]) + '<span>' + r[2] + '</span>' +
        (r[3] && r[3].b ? '<b class="tb ' + (r[3].bc || '') + '">' + r[3].b + '</b>' : '') + '</div>';
    }).join('');
  }
  function props(groups) {
    return groups.map(function (g) {
      return '<div class="pg">' + ic('caretd', 'car') + g[0] + '</div>' + g[1].map(function (r) {
        return '<div class="pr"><span>' + r[0] + '</span><b' + (r[2] ? ' ' + r[2] : '') + '>' + r[1] + '</b></div>';
      }).join('');
    }).join('');
  }
  function grid(cols, rows, cls) {
    return '<table class="dg ' + (cls || '') + '"><thead><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="row ' + (r.c || '') + '">' + r.v.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function shell(c, R) {
    return '<div class="w-title"><img src="' + R + 'cadmium-brand/favicon/favicon.svg" alt=""><span>' + c.file + ' &mdash; Cadmium Studio</span><span class="w-ctl"><i>&#8211;</i><i>&#9633;</i><i class="cl">&#10005;</i></span></div>' +
      '<div class="w-menu">' + MENUS.map(function (m) { return '<span' + (c.menu && c.menu.at === m ? ' data-menu' : '') + '>' + m + '</span>'; }).join('') + '<em>' + (c.area || 'Area 200 &middot; Unit 210') + '</em></div>' +
      (c.menu ? '<div class="w-drop" data-drop>' + c.menu.items.map(function (i) { return i === '-' ? '<hr>' : '<div' + (i[2] ? ' data-mi' : '') + '><span>' + i[0] + '</span><em>' + (i[1] || '') + '</em></div>'; }).join('') + '</div>' : '') +
      '<div class="w-tools">' + tool('open') + tool('save') + '<u></u>' + tool('undo') + tool('redo') + '<u></u>' + tool('pan') + tool('zoom') + tool('measure') + '<u></u>' + tool('layers') + tool('grid') + tool('cloud') + '<u></u>' + (c.tools || '') +
      '<span class="t-sel">Standard: <b>' + (c.std || 'ASME B31.3') + '</b>' + ic('caretd', 'car') + '</span><span class="t-sel">Rev: <b>' + (c.rev || 'B') + '</b>' + ic('caretd', 'car') + '</span></div>' +
      '<div class="w-body"><aside class="dock d-l"><div class="dh">' + (c.treeTitle || 'Project Explorer') + ic('pin', 'pn') + '</div><div class="ds">' + ic('search') + '<span>Search</span></div><div class="dc">' + tree(c.tree) + '</div></aside>' +
      '<main class="w-mid"><div class="w-doc"><div class="tabs">' + c.tabs.map(function (t) { return '<span class="tab' + (t[1] ? ' on' : '') + '"' + (t[2] ? ' data-tab="' + t[2] + '"' : '') + '>' + ic(t[3] || 'sheet') + t[0] + ic('x', 'tx') + '</span>'; }).join('') + '</div><div class="canvas">' + c.center + '</div></div>' +
      '<div class="w-bot"><div class="tabs b">' + c.bottomTabs.map(function (t, i) { return '<span class="tab' + (i === 0 ? ' on' : '') + '">' + t + '</span>'; }).join('') + '</div><div class="b-c">' + c.bottom + '</div></div></main>' +
      '<aside class="dock d-r"><div class="dh">' + (c.propTitle || 'Properties') + ic('pin', 'pn') + '</div><div class="dc">' + props(c.props) + (c.propExtra || '') + '</div></aside></div>' +
      '<div class="w-stat"><span data-status>Ready</span><i class="prog"><u data-prog></u></i><span class="sp2"></span><span>' + (c.coord || 'X 21,977.33&ensp;Y 5,201.70&ensp;Z -1,522.00') + '</span><span>SNAP</span><span>ORTHO</span><span class="on">MODEL</span><span>R. Engineer</span></div>' + (c.after || '');
  }
  function model(R) { return '<img class="fill" src="' + R + 'assets/screens/model.jpg" alt=""><div class="vcube"><b>TOP</b></div><div class="vaxis"><i>X</i><i>Y</i><i>Z</i></div>'; }
  function ruler() { return '<div class="rul-h"></div><div class="rul-v"></div>'; }
  function mono(lines) { return '<pre class="log" data-log>' + (lines || '') + '</pre>'; }

  var CLIPS = {
    iso: {
      label: 'Screen recording of Cadmium Studio generating an annotated isometric from a 3D model, in a desktop engineering application.',
      build: function (R) {
        return {
          file: 'ISO-008.dwg', menu: { at: 'Drawing', items: [['New Sheet', 'Ctrl+N'], ['Open Template...', ''], '-', ['Generate Isometric', 'F5', 1], ['Generate All in Area', 'Shift+F5'], '-', ['Export DWG...', 'Ctrl+E'], ['Export DXF...', ''], ['Print to PDF...', 'Ctrl+P']] },
          tools: tool('export', 'Export DWG'),
          tree: [[0, 'folder', 'Area 200'], [1, 'folder', 'Models'], [2, 'cube', 'Unit 210.dwg', { leaf: 1 }], [1, 'folder', 'Isometrics'], [2, 'sheet', 'ISO-005', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'ISO-006', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'ISO-007', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'ISO-008', { leaf: 1, on: 1, b: 'B', bc: 'wip' }], [2, 'sheet', 'ISO-009', { leaf: 1, b: 'A' }], [2, 'sheet', 'ISO-010', { leaf: 1, b: 'A' }], [1, 'folder', 'P&amp;IDs', { shut: 1 }], [1, 'folder', 'Material Take-off', { shut: 1 }], [1, 'folder', 'Templates'], [2, 'sheet', 'A2 Client Title Block', { leaf: 1 }], [1, 'folder', 'Reviews', { shut: 1 }]],
          tabs: [['Unit 210.dwg', 1, 'model', 'cube'], ['ISO-008.dwg', 0, 'sheet', 'sheet']],
          center: '<div class="pane on" data-pane="model">' + model(R) + '</div><div class="pane sheet" data-pane="sheet">' + ruler() + '<img class="fill cad wipe" src="' + R + 'assets/screens/sheet.svg" alt=""></div>',
          bottomTabs: ['Output', 'Issues (0)', 'Bill of Materials', 'Find Results'], bottom: mono(),
          props: [['Sheet', [['Number', 'ISO-008'], ['Revision', 'B'], ['Template', 'A2 Client Title Block'], ['View', 'Top south-west'], ['Status', 'Draft', 'data-st']]], ['Line', [['Line no.', '28-CW-008'], ['Size', '700 NB'], ['Spec', '150# CS'], ['Parts', '71']]], ['Annotation', [['Dimensions', '<i data-num="24">0</i>'], ['Elevations', '<i data-num="4">0</i>'], ['Balloons', '<i data-num="15">0</i>'], ['Collisions', '0']]]]
        };
      },
      steps: function (m) {
        return [[500, function () { m.point('[data-menu]'); }], [800, function () { m.click('[data-menu]'); m.add('[data-menu]', 'on'); m.add('[data-drop]', 'on'); }],
          [650, function () { m.point('[data-mi]'); m.add('[data-mi]', 'hover'); }], [750, function () {
            m.click('[data-mi]'); m.rm('[data-drop]', 'on'); m.rm('[data-menu]', 'on'); m.status('Generating isometric...'); m.prog(4000); m.point('.canvas');
            m.log(['&gt; cadmium iso "Unit 210.dwg" --line 28-CW-008 --sheet ISO-008', 'Loaded 351 entities (71 solids, 280 metadata)', 'Skeleton built; 62 nodes, 61 edges', 'Compacting runs...', 'Expanding for symbols...', 'Solving annotation layout; 24 dimensions, 4 elevations', 'BOM: 15 items', 'Writing ISO-008.dwg', '<g>Done in 6.6 s. 0 errors, 0 warnings.</g>'], 460);
          }], [1900, function () { m.tab('sheet'); m.add('.wipe', 'run'); m.nums(2200); }], [2400, function () { m.status('Ready'); m.text('[data-st]', 'Ready for review'); m.point('.t-btn.wide'); }], [1000, function () { m.click('.t-btn.wide'); }]];
      }
    },
    gad: {
      label: 'Screen recording of Cadmium Studio cleaning up a general arrangement drawing: overlapping labels are placed clear of the piping and dimensions are chained.',
      build: function (R) {
        return {
          file: 'GA-410-2108.dgn', area: 'Area 400 &middot; Unit 410', std: 'Client drafting', rev: 'P2', coord: 'X 412.880&ensp;Y 96.214&ensp;Level _Auto',
          tools: tool('play', 'Clean Up', 'data-go') + tool('export', 'Export DGN') + tool('sheet', 'Print PDF'),
          tree: [[0, 'folder', 'Area 400'], [1, 'folder', 'General Arrangements'], [2, 'sheet', 'GA-410-2106', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'GA-410-2107', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'GA-410-2108', { leaf: 1, on: 1, b: 'P2', bc: 'wip' }], [2, 'sheet', 'GA-410-2109', { leaf: 1, b: 'P1' }], [2, 'sheet', 'GA-410-2110', { leaf: 1, b: 'P1' }], [1, 'folder', 'Levels'], [2, 'layers', 'PIPE', { leaf: 1 }], [2, 'layers', 'EQUIP', { leaf: 1 }], [2, 'layers', 'STEEL', { leaf: 1 }], [2, 'layers', 'SUPPORT', { leaf: 1 }], [2, 'layers', 'INSTRUMENT', { leaf: 1 }], [2, 'layers', '_Auto', { leaf: 1, b: 'notes' }], [1, 'folder', 'Rules', { shut: 1 }]],
          tabs: [['GA-410-2108.dgn', 1, 'sheet']],
          center: '<div class="pane on sheet">' + ruler() + '<img class="fill cad" src="' + R + 'assets/screens/gad-before.svg" alt=""><img class="fill cad wipe over" src="' + R + 'assets/screens/gad-after.svg" alt=""><i class="sweep"></i></div>',
          bottomTabs: ['Output', 'Issues', 'Label Report'], bottom: mono(),
          props: [['Drawing', [['Format', 'DGN V8'], ['Model', 'Default, 2D'], ['Sheet', 'A0']]], ['Annotation', [['Overlaps', '<i data-from="64" data-to="0">64</i>'], ['On piping', '<i data-from="38" data-to="0">38</i>'], ['Duplicates', '<i data-from="21" data-to="0">21</i>'], ['Margin notes', '<i data-from="0" data-to="22">0</i>'], ['Chain dims', '<i data-from="0" data-to="11">0</i>']]], ['Output', [['Native DGN', 'Yes'], ['PDF, 1:1', 'Yes']]]]
        };
      },
      steps: function (m) {
        return [[700, function () { m.point('[data-go]'); }], [900, function () {
            m.click('[data-go]'); m.status('Cleaning up annotation...'); m.prog(3400); m.point('.canvas');
            m.log(['&gt; cadmium gad "GA-410-2108.dgn"', 'Read DGN V8, 2D, level _Auto holds annotation', 'Removed 21 duplicate notes', 'Enumerating label slots...', 'Solving placement; labels clear of piping and dimensions', 'Chained 11 dimensions at the matchline', 'Moved 22 entries to the margin', 'Patched GA-410-2108.dgn in place', '<g>Done in 9.8 s. DGN and PDF written.</g>'], 380);
          }], [500, function () { m.add('.wipe', 'run'); m.add('.sweep', 'run'); m.morph(2600); }], [3200, function () { m.status('Ready'); m.point('.canvas'); }]];
      }
    },
    pid: {
      label: 'Screen recording of Cadmium Studio reading a P&ID into tagged, connected data and filling a line list.',
      build: function (R) {
        var LINES = [['6-PW-101', '6', 'T-101', 'HV-101, P-101A'], ['6-PW-102', '6', 'T-101', 'HV-102, P-101B'], ['4-PW-103', '4', 'P-101A/B', 'CK-101, CK-102, HV-103, HV-104'], ['4-PW-104', '4', 'FV-101', 'HV-105, D-101'], ['3-VP-105', '3', 'D-101', 'HV-106, E-101'], ['3-VP-106', '3', 'E-101', 'HV-107, V-201'], ['2-DR-107', '2', 'D-101', 'HV-108, LV-101']];
        return {
          file: 'PID-200-001.pdf', std: 'ISA 5.1', coord: 'Sheet 1 of 48&ensp;Zoom 62%',
          tools: tool('play', 'Read Sheet', 'data-go') + tool('export', 'Export Lists'),
          tree: [[0, 'folder', 'Area 200'], [1, 'folder', 'P&amp;IDs'], [2, 'sheet', 'PID-200-001', { leaf: 1, on: 1, b: 'read', bc: 'wip' }], [2, 'sheet', 'PID-200-002', { leaf: 1, b: '&#10003;', bc: 'ok' }], [2, 'sheet', 'PID-200-003', { leaf: 1, b: '&#10003;', bc: 'ok' }], [2, 'sheet', 'PID-200-004', { leaf: 1, b: '&#10003;', bc: 'ok' }], [2, 'sheet', 'PID-200-005', { leaf: 1, b: '2', bc: 'warn' }], [2, 'sheet', 'PID-200-006', { leaf: 1, b: '&#10003;', bc: 'ok' }], [1, 'folder', 'Registers'], [2, 'list', 'Line List', { leaf: 1 }], [2, 'list', 'Valve List', { leaf: 1 }], [2, 'list', 'Instrument Index', { leaf: 1 }], [2, 'list', 'Equipment List', { leaf: 1 }], [1, 'folder', 'Symbol Legend', { shut: 1 }]],
          tabs: [['PID-200-001.pdf', 1, 'sheet']],
          center: '<div class="pane on sheet">' + ruler() + '<img class="fill cad" src="' + R + 'assets/screens/pid-clean.png" alt=""><img class="fill cad wipe over" src="' + R + 'assets/screens/pid-graph.png" alt=""><i class="sweep"></i></div>',
          bottomTabs: ['Line List', 'Valve List', 'Instrument Index', 'Output', 'Issues (0)'],
          bottom: grid(['Line No.', 'NB', 'From', 'Through / To'], LINES.map(function (l) { return { v: l }; })),
          props: [['Sheet', [['Number', 'PID-200-001'], ['Title', 'Feed pump skid'], ['Source', 'Scanned PDF'], ['Read', '<i data-num="100">0</i>%']]], ['Found', [['Tags', '<i data-num="28">0</i>'], ['Connections', '<i data-num="26">0</i>'], ['Lines', '<i data-num="7">0</i>'], ['Dangling ends', '0']]], ['Selected', [['Tag', 'HV-103'], ['Type', 'Isolation valve'], ['Line', '4-PW-103'], ['Upstream', 'CK-101'], ['Downstream', 'FV-101, HV-104']]]]
        };
      },
      steps: function (m) {
        return [[500, function () { m.point('[data-go]'); }], [850, function () { m.click('[data-go]'); m.status('Reading sheet...'); m.prog(2700); m.nums(2700); m.add('.wipe', 'run'); m.add('.sweep', 'run'); m.point('.canvas'); }],
          [1900, function () { m.seq('.row', 210); }], [1500, function () { m.status('Ready. Sheet read; 0 items for review.'); m.point('.row:nth-child(3)'); m.add('.row:nth-child(3)', 'sel'); }]];
      }
    },
    mto: {
      label: 'Screen recording of Cadmium Studio comparing two material take-off revisions and sending the changes to procurement.',
      build: function () {
        var R = [['101', 'Pipe, 8 in, Sch 40, A106 Gr.B', 'm', '124.0', '131.5', '+7.5', 'up'], ['102', 'Pipe, 6 in, Sch 40, A106 Gr.B', 'm', '86.0', '86.0', '0', ''], ['118', 'Elbow 90 LR, 8 in, BW', 'ea', '18', '21', '+3', 'up'], ['119', 'Elbow 90 LR, 6 in, BW', 'ea', '12', '12', '0', ''], ['124', 'Tee, 8 &times; 6 in, BW', 'ea', '4', '4', '0', ''], ['131', 'Gate valve, 8 in, 300#, RF', 'ea', '6', '6', '0', ''], ['132', 'Check valve, 8 in, 300#, RF', 'ea', '2', '3', '+1', 'up'], ['140', 'Flange WN, 8 in, 300#, RF', 'ea', '24', '22', '-2', 'dn'], ['141', 'Flange WN, 6 in, 300#, RF', 'ea', '10', '10', '0', ''], ['152', 'Reducer conc, 8 &times; 6 in', 'ea', '4', '5', '+1', 'up'], ['160', 'Gasket SWG, 8 in, 300#', 'ea', '24', '22', '-2', 'dn'], ['170', 'Stud bolt set, 8 in, 300#', 'set', '24', '22', '-2', 'dn'], ['181', 'Pipe support, shoe, 8 in', 'ea', '32', '34', '+2', 'up']];
        return {
          file: 'MTO-200 Rev B', rev: 'B', coord: '642 items&ensp;37 changed',
          tools: tool('filter', 'Changed Only') + tool('send', 'Send to Procurement', 'data-go'),
          tree: [[0, 'folder', 'Area 200'], [1, 'folder', 'Material Take-off'], [2, 'list', 'MTO-200 Rev A', { leaf: 1, b: 'issued', bc: 'ok' }], [2, 'list', 'MTO-200 Rev B', { leaf: 1, on: 1, b: 'new', bc: 'wip' }], [1, 'folder', 'By Line'], [2, 'pipe', '4-PW-103', { leaf: 1, b: '+6' }], [2, 'pipe', '4-PW-104', { leaf: 1, b: '-4' }], [2, 'pipe', '6-PW-101', { leaf: 1 }], [2, 'pipe', '8-CW-202', { leaf: 1, b: '+11' }], [2, 'pipe', '8-CW-204', { leaf: 1, b: '+2' }], [1, 'folder', 'By Commodity', { shut: 1 }], [1, 'folder', 'Purchase Requisitions', { shut: 1 }]],
          tabs: [['MTO-200: Rev A vs Rev B', 1, 'x', 'list']],
          center: '<div class="pane on tablepane">' + grid(['Item', 'Description', 'Unit', 'Rev A', 'Rev B', 'Change'], R.map(function (r) { return { v: r.slice(0, 6), c: r[6] }; }), 'wide') + '</div>',
          bottomTabs: ['Output', 'Requisitions', 'History'], bottom: mono(),
          props: [['Comparison', [['From', 'Rev A, 12 Oct'], ['To', 'Rev B, 26 Oct'], ['Items', '<i data-num="642">0</i>'], ['Changed', '<i data-num="37">0</i>'], ['Lines touched', '<i data-num="9">0</i>']]], ['Impact', [['Added', '<i data-num="24">0</i>'], ['Reduced', '<i data-num="13">0</i>'], ['Open POs affected', '<i data-num="3">0</i>']]], ['Selected', [['Item', '118'], ['Commodity', 'Elbow 90 LR'], ['Lines', '4-PW-103, 8-CW-202']]]]
        };
      },
      steps: function (m) {
        return [[400, function () { m.nums(); m.seq('.row', 170); m.point('.dg.wide'); m.log(['Comparing MTO-200 Rev A with Rev B...', 'Matched 642 items by commodity code and line', '<g>37 items changed across 9 lines.</g>'], 600); }],
          [2500, function () { m.point('.row:nth-child(3)'); m.add('.row:nth-child(3)', 'sel'); }], [1100, function () { m.point('[data-go]'); }], [850, function () { m.click('[data-go]'); m.status('Requisition PR-2204 created.'); m.log(['Created requisition PR-2204 with 37 changed items', '<g>Sent to procurement.</g>'], 300); }]];
      }
    },
    review: {
      label: 'Screen recording of Cadmium Studio showing clouded revision changes on an isometric, which an engineer approves and issues.',
      build: function (R) {
        return {
          file: 'ISO-008.dwg [Review]', menu: null, coord: 'Comparing Rev A with Rev B',
          tools: tool('cloud', 'Compare') + tool('check', 'Approve and Issue', 'data-go'),
          tree: [[0, 'folder', 'Reviews'], [1, 'folder', 'Awaiting Me'], [2, 'sheet', 'ISO-008 Rev B', { leaf: 1, on: 1, b: '2', bc: 'warn' }], [2, 'sheet', 'ISO-009 Rev B', { leaf: 1, b: '1', bc: 'warn' }], [2, 'sheet', 'ISO-012 Rev C', { leaf: 1, b: '4', bc: 'warn' }], [1, 'folder', 'Issued Today'], [2, 'sheet', 'ISO-005 Rev B', { leaf: 1, b: '&#10003;', bc: 'ok' }], [2, 'sheet', 'ISO-006 Rev C', { leaf: 1, b: '&#10003;', bc: 'ok' }], [2, 'sheet', 'ISO-007 Rev B', { leaf: 1, b: '&#10003;', bc: 'ok' }]],
          tabs: [['ISO-008 Rev A / Rev B', 1, 'sheet']],
          center: '<div class="pane on sheet revs">' + ruler() + '<img class="fill cad" src="' + R + 'assets/screens/sheet.svg" alt=""><svg class="clouds" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="41" cy="60" rx="10" ry="15"/><ellipse cx="11" cy="26" rx="8" ry="15"/></svg><b class="pin" style="left:50.5%;top:50%">1</b><b class="pin" style="left:18.5%;top:15%">2</b></div>',
          bottomTabs: ['Changes (2)', 'Checks (4)', 'Comments', 'History'],
          bottom: grid(['#', 'Change', 'Rev A', 'Rev B', 'Source'], [{ v: ['1', 'Line upsized', '6 in', '8 in', 'Model'] }, { v: ['2', 'HV-103 moved', 'EL +101.2', 'EL +101.6', 'Model'] }, { v: ['&#10003;', 'BOM matches model', '', '15 items', 'Check'], c: 'g' }, { v: ['&#10003;', 'P&amp;ID matches model', '', '4-PW-103', 'Check'], c: 'g' }]),
          props: [['Review', [['Sheet', 'ISO-008'], ['Revision', 'B'], ['Status', 'In review', 'data-st'], ['Prepared', 'Cadmium'], ['Checker', 'R. Engineer'], ['Approved', '<i data-ap>Pending</i>']]], ['Checks', [['Against model', 'Passed'], ['Against P&amp;ID', 'Passed'], ['Against BOM', 'Passed'], ['Collisions', '0']]]],
          after: '<div class="dlg" data-dlg><div class="dlg-t">Issue drawing<i>&#10005;</i></div><div class="dlg-b">' + ic('check') + '<p>Issue <b>ISO-008 Rev B</b> as IFC?<br>Rev A will be marked superseded.</p></div><div class="dlg-f"><span class="dbtn pri" data-ok>Issue</span><span class="dbtn">Cancel</span></div></div>'
        };
      },
      steps: function (m) {
        return [[400, function () { m.add('.revs', 'run'); m.point('.revs'); }], [900, function () { m.seq('.row', 330); }], [1600, function () { m.point('[data-go]'); }], [800, function () { m.click('[data-go]'); m.add('[data-dlg]', 'on'); }],
          [750, function () { m.point('[data-ok]'); }], [800, function () { m.click('[data-ok]'); m.rm('[data-dlg]', 'on'); m.text('[data-st]', 'Issued, IFC'); m.text('[data-ap]', 'R. Engineer'); m.status('ISO-008 Rev B issued.'); }]];
      }
    },
    site: {
      label: 'Screen recording of Cadmium Studio showing the 3D model next to the register of current and superseded sheets.',
      build: function (R) {
        return {
          file: 'Unit 210.dwg', std: 'Workface', rev: 'Current',
          tools: tool('cube', 'Isolate Line') + tool('sheet', 'Open Sheet'),
          tree: [[0, 'cube', 'Unit 210'], [1, 'folder', 'Piping'], [2, 'pipe', '28-CW-008', { leaf: 1, on: 1 }], [2, 'pipe', '28-CW-009', { leaf: 1 }], [2, 'pipe', '32-CW-001', { leaf: 1 }], [1, 'folder', 'Equipment', { shut: 1 }], [1, 'folder', 'Steel', { shut: 1 }], [1, 'folder', 'Supports', { shut: 1 }], [1, 'folder', 'Instruments', { shut: 1 }], [0, 'folder', 'Test Packs'], [1, 'list', 'TP-210-04', { leaf: 1, b: 'open', bc: 'wip' }], [1, 'list', 'TP-210-05', { leaf: 1, b: 'open', bc: 'wip' }]],
          tabs: [['Unit 210.dwg', 1, 'model', 'cube']],
          center: '<div class="pane on ken">' + model(R) + '</div>',
          bottomTabs: ['Sheet Register', 'Test Packs', 'Site Queries (3)'],
          bottom: grid(['Sheet', 'Rev', 'Status', 'Line', 'Issued'], [{ v: ['ISO-008', 'C', 'Current', '28-CW-008', '26 Oct'], c: 'g' }, { v: ['ISO-008', 'B', 'Superseded', '28-CW-008', '12 Oct'], c: 'old' }, { v: ['ISO-009', 'B', 'Current', '28-CW-009', '26 Oct'], c: 'g' }, { v: ['ISO-010', 'A', 'Current', '32-CW-001', '12 Oct'], c: 'g' }]),
          props: [['Selected', [['Type', 'Butterfly valve'], ['Size', '28 in ND'], ['Rating', '150 LB, lug, RF'], ['Standard', 'ASME B16.10'], ['Line', '28-CW-008']]], ['Sheet', [['Current', 'ISO-008 Rev C'], ['Issued', '26 Oct'], ['Test pack', 'TP-210-04']]], ['Access', [['Crew devices', '<i data-num="38">0</i>'], ['CAD licences', '0']]]]
        };
      },
      steps: function (m) {
        return [[400, function () { m.add('.ken', 'run'); m.nums(); m.seq('.row', 320); m.point('.canvas'); }], [1900, function () { m.point('.row.old'); m.add('.row.old', 'sel'); m.status('ISO-008 Rev B is superseded. Open Rev C.'); }], [1600, function () { m.point('.row:nth-child(1)'); }]];
      }
    }
  };

  function Mock(host) {
    var clip = CLIPS[host.dataset.mock], R = host.dataset.root || '';
    if (!clip) return;
    host.classList.add('mock-wrap');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', clip.label);
    var inner = document.createElement('div');
    inner.setAttribute('inert', '');
    inner.setAttribute('aria-hidden', 'true');
    host.innerHTML = '';
    host.appendChild(inner);
    var timers = [], onScreen = false, running = false, instant = false;
    function $(s) { return inner.querySelector(s); }
    function all(s) { return Array.prototype.slice.call(inner.querySelectorAll(s)); }
    function later(ms, fn) { if (instant) fn(); else timers.push(setTimeout(fn, ms)); }
    var api = {
      add: function (s, c) { all(s).forEach(function (e) { e.classList.add(c); }); },
      rm: function (s, c) { all(s).forEach(function (e) { e.classList.remove(c); }); },
      seq: function (s, gap) { all(s).forEach(function (e, i) { later(i * gap, function () { e.classList.add('on'); }); }); },
      text: function (s, t) { var e = $(s); if (e) e.textContent = t; },
      status: function (t) { var e = $('[data-status]'); if (e) e.textContent = t; },
      prog: function (ms) { var e = $('[data-prog]'); if (!e) return; e.parentNode.classList.add('on'); e.style.transition = 'width ' + ms + 'ms linear'; e.style.width = '100%'; later(ms + 200, function () { e.parentNode.classList.remove('on'); }); },
      log: function (lines, gap) { var e = $('[data-log]'); lines.forEach(function (l, i) { later(i * gap, function () { e.innerHTML += l.replace(/<g>(.*)<\/g>/, '<span class="g">$1</span>') + '\n'; e.scrollTop = e.scrollHeight; }); }); },
      tab: function (id) { all('[data-tab]').forEach(function (t) { t.classList.toggle('on', t.dataset.tab === id); }); all('[data-pane]').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === id); }); },
      nums: function (dur) { all('[data-num]').forEach(function (b) { if (window.CadCount) CadCount(b, +b.dataset.num, { dur: instant ? 1 : dur || 1500 }); else b.textContent = b.dataset.num; }); },
      morph: function (dur) { all('[data-from]').forEach(function (b) { if (window.CadCount) CadCount(b, +b.dataset.to, { from: +b.dataset.from, dur: instant ? 1 : dur }); else b.textContent = b.dataset.to; }); },
      /* Glide the recorded cursor to an element, measured in the frame's own coordinates. */
      point: function (s) {
        var el = $(s), cur = $('.m-cursor');
        if (!el || !cur) return;
        var f = inner.getBoundingClientRect(), r = el.getBoundingClientRect(), k = f.width / W;
        cur.style.transform = 'translate(' + (r.left - f.left + Math.min(r.width * .5, 60)) / k + 'px,' + (r.top - f.top + r.height * .55) / k + 'px)';
      },
      click: function (s) {
        var cur = $('.m-cursor'), el = $(s);
        if (cur) { cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); }
        if (el) { el.classList.add('down'); later(170, function () { el.classList.remove('down'); }); }
      }
    };
    function draw() {
      inner.className = 'mock';
      inner.innerHTML = shell(clip.build(R), R) + '<i class="m-cursor"><svg viewBox="0 0 20 22"><path d="M1 1v16.2l4.4-4 2.9 6.8 3.1-1.4L8.6 12l6-.6Z" fill="#fff" stroke="#111" stroke-width="1.3"/></svg></i>';
      fit();
    }
    function fit() { var w = host.clientWidth; if (w) inner.style.setProperty('--s', (w / W).toFixed(5)); }
    function play() {
      if (running || !onScreen) return;
      running = true;
      draw();
      var at = 0;
      clip.steps(api).forEach(function (s) { at += s[0]; later(at, s[1]); });
      later(at + 3600, function () { inner.classList.add('out'); });
      later(at + 4000, function () { running = false; timers = []; if (onScreen) play(); });
    }
    function stop() { timers.forEach(clearTimeout); timers = []; running = false; }
    draw();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    if (RM) { instant = true; clip.steps(api).forEach(function (s) { s[1](); }); api.add('.m-cursor', 'off'); inner.classList.add('done'); return; }
    new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting;
      if (onScreen) play(); else stop();
    }, { threshold: .25 }).observe(host);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-mock]'), Mock);
})();
