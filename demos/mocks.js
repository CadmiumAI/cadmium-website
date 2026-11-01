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
          center: '<div class="pane on" data-pane="model">' + model(R) + '</div><div class="pane sheet" data-pane="sheet">' + ruler() + '<div class="slot layers" data-svg="sheet.svg"></div></div>',
          bottomTabs: ['Output', 'Issues (0)', 'Bill of Materials', 'Find Results'], bottom: mono(),
          props: [['Sheet', [['Number', 'ISO-008'], ['Revision', 'B'], ['Template', 'A2 Client Title Block'], ['View', 'Top south-west'], ['Status', 'Draft', 'data-st']]], ['Line', [['Line no.', '28-CW-008'], ['Size', '700 NB'], ['Spec', '150# CS'], ['Parts', '71']]], ['Annotation', [['Dimensions', '<i data-k="dim">&ndash;</i>'], ['Elevations', '<i data-k="elev">&ndash;</i>'], ['Balloons', '<i data-k="bal">&ndash;</i>'], ['Collisions', '<i data-k="col">&ndash;</i>']]]]
        };
      },
      steps: function (m) {
        return [[600, function () { m.point('[data-menu]'); }], [150, function () { m.click('[data-menu]'); m.add('[data-menu]', 'on'); m.add('[data-drop]', 'on'); }],
          [280, function () { m.point('[data-mi]'); m.add('[data-mi]', 'hover'); }],
          [120, function () { m.click('[data-mi]'); m.rm('[data-drop]', 'on'); m.rm('[data-menu]', 'on'); m.status('Generating isometric...'); m.busy(true); m.prog(6); m.log('Generating ISO-008 from Unit 210.dwg, line 28-CW-008'); m.point('.d-r'); }],
          [650, function () { m.log('Read model: 71 components on line 28-CW-008'); m.prog(24); }],
          [380, function () { m.log('Line traced end to end; 0 open ends'); m.prog(33); }],
          [170, function () { m.log('Applying isometric conventions...'); m.prog(38); }],
          [240, function () { m.log('Laying out not to scale...'); m.prog(45); m.tab('sheet'); m.reveal('frame', 120); }],
          [200, function () { m.reveal('pipe', 520); m.status('Drawing pipe runs...'); }],
          [620, function () { m.reveal('fit', 760); m.prog(58); m.status('Placing fittings...'); m.log('Annotating...'); }],
          [880, function () { m.reveal('dim', 1250); m.prog(71); m.status('Placing dimensions...'); m.point('.canvas'); }],
          [1320, function () { m.val('dim', '24'); m.reveal('elev', 160); m.prog(79); m.log('Placed 24 dimensions, 4 elevations'); }],
          [200, function () { m.val('elev', '4'); m.reveal('text', 340); m.prog(85); }],
          [420, function () { m.val('bal', '15'); m.val('col', '0'); m.reveal('bom', 200); m.prog(92); m.log('BOM: 15 items'); m.status('Writing BOM...'); }],
          [240, function () { m.reveal('bomtext', 300); }],
          [420, function () { m.log('Writing ISO-008.dwg'); m.prog(98); m.status('Writing ISO-008.dwg...'); }],
          [460, function () { m.prog(100); m.busy(false); m.log('<g>Done in 6.6 s. 0 errors, 0 warnings.</g>'); m.status('Ready'); m.text('[data-st]', 'Ready for review'); m.idle('.canvas'); }],
          [1300, function () { m.point('.t-btn.wide'); }], [120, function () { m.click('.t-btn.wide'); }]];
      }
    },
    gad: {
      label: 'Screen recording of Cadmium Studio cleaning up a general arrangement drawing: overlapping labels are placed clear of the piping and dimensions are chained.',
      build: function (R) {
        return {
          file: 'GA-410-2108.dgn', area: 'Area 400 &middot; Unit 410', std: 'Client drafting', rev: 'P2', coord: 'X 412.880&ensp;Y 96.214&ensp;Level ANNOTATION',
          tools: tool('play', 'Clean Up', 'data-go') + tool('export', 'Export DGN') + tool('sheet', 'Print PDF'),
          tree: [[0, 'folder', 'Area 400'], [1, 'folder', 'General Arrangements'], [2, 'sheet', 'GA-410-2106', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'GA-410-2107', { leaf: 1, b: 'IFC', bc: 'ok' }], [2, 'sheet', 'GA-410-2108', { leaf: 1, on: 1, b: 'P2', bc: 'wip' }], [2, 'sheet', 'GA-410-2109', { leaf: 1, b: 'P1' }], [2, 'sheet', 'GA-410-2110', { leaf: 1, b: 'P1' }], [1, 'folder', 'Levels'], [2, 'layers', 'PIPE', { leaf: 1 }], [2, 'layers', 'EQUIP', { leaf: 1 }], [2, 'layers', 'STEEL', { leaf: 1 }], [2, 'layers', 'SUPPORT', { leaf: 1 }], [2, 'layers', 'INSTRUMENT', { leaf: 1 }], [2, 'layers', 'ANNOTATION', { leaf: 1, b: 'notes' }], [1, 'folder', 'Rules', { shut: 1 }]],
          tabs: [['GA-410-2108.dgn', 1, 'sheet']],
          center: '<div class="pane on sheet">' + ruler() + '<div class="slot layers show-base" data-svg="gad.svg"></div></div>',
          bottomTabs: ['Output', 'Issues', 'Label Report'], bottom: mono(),
          props: [['Drawing', [['Format', 'DGN V8'], ['Model', 'Default, 2D'], ['Sheet', 'A0']]], ['Annotation', [['Overlaps', '<i data-k="over">64</i>'], ['On piping', '<i data-k="onp">38</i>'], ['Duplicates', '<i data-k="dup">21</i>'], ['Margin notes', '<i data-k="mar">0</i>'], ['Chain dims', '<i data-k="chn">0</i>']]], ['Output', [['Native DGN', 'Yes'], ['PDF, 1:1', 'Yes']]]]
        };
      },
      steps: function (m) {
        return [[700, function () { m.point('[data-go]'); }], [130, function () {
            m.click('[data-go]'); m.status('Reading DGN...'); m.busy(true); m.prog(8); m.log('Cleaning up GA-410-2108.dgn'); m.point('.d-r'); }],
          [520, function () { m.log('Read drawing: DGN V8, 2D plan'); m.prog(19); }],
          [340, function () { m.unreveal('dupe', 420); m.status('Removing duplicates...'); m.log('Removed 21 duplicate notes'); m.val('dup', '0'); m.prog(30); }],
          [520, function () { m.log('Finding clear space for labels...'); m.prog(38); m.status('Placing labels...'); m.unreveal('raw', 500); }],
          [560, function () { m.log('Placing labels clear of piping and dimensions'); m.prog(52); m.reveal('label', 980); m.point('.canvas'); }],
          [1060, function () { m.val('over', '0'); m.val('onp', '0'); m.prog(71); m.reveal('chain', 460); m.status('Chaining dimensions...'); m.log('Chained 11 dimensions at the matchline'); }],
          [520, function () { m.val('chn', '11'); m.prog(84); m.reveal('margin', 460); m.status('Writing margin entries...'); m.log('Moved 22 entries to the margin'); }],
          [540, function () { m.val('mar', '22'); m.prog(95); m.log('Saved GA-410-2108.dgn'); m.status('Saving...'); }],
          [420, function () { m.prog(100); m.busy(false); m.log('<g>Done in 9.8 s. DGN and PDF written.</g>'); m.status('Ready'); m.idle('.canvas'); }]];
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
          center: '<div class="pane on sheet">' + ruler() + '<img class="fill cad" src="' + R + 'assets/screens/pid-clean.png" alt=""><div class="slot layers" data-svg="pid-read.svg"></div></div>',
          bottomTabs: ['Line List', 'Valve List', 'Instrument Index', 'Output', 'Issues (0)'],
          bottom: grid(['Line No.', 'NB', 'From', 'Through / To'], LINES.map(function (l) { return { v: l }; })),
          props: [['Sheet', [['Number', 'PID-200-001'], ['Title', 'Feed pump skid'], ['Source', 'Scanned PDF'], ['Read', '<i data-k="st">Not read</i>']]], ['Found', [['Lines', '<i data-k="lines">&ndash;</i>'], ['Symbols', '<i data-k="sym">&ndash;</i>'], ['Tags', '<i data-k="tags">&ndash;</i>'], ['Connections', '<i data-k="con">&ndash;</i>'], ['Dangling ends', '<i data-k="dang">&ndash;</i>']]], ['Selected', [['Line', '<i data-k="s1">&ndash;</i>'], ['Size', '<i data-k="s2">&ndash;</i>'], ['From', '<i data-k="s3">&ndash;</i>'], ['Through', '<i data-k="s4">&ndash;</i>'], ['To', '<i data-k="s5">&ndash;</i>']]]]
        };
      },
      steps: function (m) {
        return [[600, function () { m.point('[data-go]'); }], [130, function () { m.click('[data-go]'); m.status('Preparing scan...'); m.busy(true); m.prog(12); m.val('st', 'Reading'); m.point('.d-r'); }],
          [620, function () { m.status('Tracing lines...'); m.prog(30); m.reveal('pipe', 720); m.point('.canvas'); }],
          [780, function () { m.val('lines', '7'); m.prog(52); m.status('Finding equipment...'); m.reveal('equip', 240); }],
          [300, function () { m.status('Matching symbols...'); m.prog(64); m.reveal('sym', 520); }],
          [580, function () { m.val('sym', '21'); m.status('Reading tags...'); m.prog(78); m.reveal('tag', 860); m.seq('.row', 115); }],
          [920, function () { m.val('tags', '28'); m.val('con', '26'); m.val('dang', '0'); m.prog(100); m.busy(false); m.val('st', 'Read'); m.status('Ready. Sheet read; 0 items for review.'); }],
          [800, function () { m.point('.row:nth-child(3)'); }], [160, function () { m.click('.row:nth-child(3)'); m.add('.row:nth-child(3)', 'sel'); m.val('s1', '4-PW-103'); m.val('s2', '4 NB'); m.val('s3', 'P-101A/B'); m.val('s4', 'CK-101, HV-103'); m.val('s5', 'FV-101'); }]];
      }
    },
    mto: {
      label: 'Screen recording of Cadmium Studio comparing two material take-off revisions and sending the changes to procurement.',
      build: function () {
        var R = [['101', 'Pipe, 8 in, Sch 40, A106 Gr.B', 'm', '124.0', '131.5', '+7.5', 'up'], ['102', 'Pipe, 6 in, Sch 40, A106 Gr.B', 'm', '86.0', '86.0', '0', ''], ['118', 'Elbow 90 LR, 8 in, BW', 'ea', '18', '21', '+3', 'up'], ['119', 'Elbow 90 LR, 6 in, BW', 'ea', '12', '12', '0', ''], ['124', 'Tee, 8 &times; 6 in, BW', 'ea', '4', '4', '0', ''], ['131', 'Gate valve, 8 in, 300#, RF', 'ea', '6', '6', '0', ''], ['132', 'Check valve, 8 in, 300#, RF', 'ea', '2', '3', '+1', 'up'], ['140', 'Flange WN, 8 in, 300#, RF', 'ea', '24', '22', '-2', 'dn'], ['141', 'Flange WN, 6 in, 300#, RF', 'ea', '10', '10', '0', ''], ['152', 'Reducer conc, 8 &times; 6 in', 'ea', '4', '5', '+1', 'up'], ['160', 'Gasket SWG, 8 in, 300#', 'ea', '24', '22', '-2', 'dn'], ['170', 'Stud bolt set, 8 in, 300#', 'set', '24', '22', '-2', 'dn'], ['181', 'Pipe support, shoe, 8 in', 'ea', '32', '34', '+2', 'up']];
        return {
          file: 'MTO-200 Rev B', rev: 'B', coord: 'MTO-200&ensp;Rev A / Rev B',
          tools: tool('filter', 'Changed Only') + tool('send', 'Send to Procurement', 'data-go'),
          tree: [[0, 'folder', 'Area 200'], [1, 'folder', 'Material Take-off'], [2, 'list', 'MTO-200 Rev A', { leaf: 1, b: 'issued', bc: 'ok' }], [2, 'list', 'MTO-200 Rev B', { leaf: 1, on: 1, b: 'new', bc: 'wip' }], [1, 'folder', 'By Line'], [2, 'pipe', '4-PW-103', { leaf: 1, b: '+6' }], [2, 'pipe', '4-PW-104', { leaf: 1, b: '-4' }], [2, 'pipe', '6-PW-101', { leaf: 1 }], [2, 'pipe', '8-CW-202', { leaf: 1, b: '+11' }], [2, 'pipe', '8-CW-204', { leaf: 1, b: '+2' }], [1, 'folder', 'By Commodity', { shut: 1 }], [1, 'folder', 'Purchase Requisitions', { shut: 1 }]],
          tabs: [['MTO-200: Rev A vs Rev B', 1, 'x', 'list']],
          center: '<div class="pane on tablepane">' + grid(['Item', 'Description', 'Unit', 'Rev A', 'Rev B', 'Change'], R.map(function (r) { return { v: r.slice(0, 6), c: r[6] }; }), 'wide pend') + '</div>',
          bottomTabs: ['Output', 'Requisitions', 'History'], bottom: mono(),
          props: [['Comparison', [['From', 'Rev A, 12 Oct'], ['To', 'Rev B, 26 Oct'], ['Items', '<i data-k="items">&ndash;</i>'], ['Changed', '<i data-k="chg">&ndash;</i>'], ['Lines touched', '<i data-k="ltc">&ndash;</i>']]], ['Impact', [['Added', '<i data-k="add">&ndash;</i>'], ['Reduced', '<i data-k="red">&ndash;</i>'], ['Open POs affected', '<i data-k="po">&ndash;</i>']]], ['Selected', [['Item', '<i data-k="s1">&ndash;</i>'], ['Commodity', '<i data-k="s2">&ndash;</i>'], ['Lines', '<i data-k="s3">&ndash;</i>']]]]
        };
      },
      steps: function (m) {
        return [[500, function () { m.log('Comparing MTO-200 Rev A with Rev B...'); m.busy(true); m.status('Comparing revisions...'); m.prog(20); m.add('.dg.wide .row', 'on'); m.val('items', '642'); m.point('.dg.wide'); }],
          [700, function () { m.log('Matched 642 items by commodity code and line'); m.prog(58); m.add('.dg.wide', 'b'); }],
          [620, function () { m.add('.dg.wide', 'c'); m.prog(100); m.busy(false); m.val('chg', '37'); m.val('ltc', '9'); m.val('add', '24'); m.val('red', '13'); m.val('po', '3'); m.log('<g>37 items changed across 9 lines.</g>'); m.status('Ready'); }],
          [800, function () { m.point('.row:nth-child(3)'); }], [150, function () { m.click('.row:nth-child(3)'); m.add('.row:nth-child(3)', 'sel'); m.val('s1', '118'); m.val('s2', 'Elbow 90 LR'); m.val('s3', '4-PW-103, 8-CW-202'); }], [850, function () { m.point('[data-go]'); }],
          [140, function () { m.click('[data-go]'); m.status('Requisition PR-2204 created.'); m.log('Created requisition PR-2204 with 37 changed items'); }], [280, function () { m.log('<g>Sent to procurement.</g>'); m.idle('.dg.wide'); }]];
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
        return [[500, function () { m.status('Comparing revisions...'); m.busy(true); m.point('.revs'); }], [620, function () { m.add('.revs', 'run'); m.busy(false); m.status('2 changes found.'); m.seq('.row', 150); }], [1500, function () { m.point('[data-go]'); }],
          [140, function () { m.click('[data-go]'); m.add('[data-dlg]', 'on'); }], [420, function () { m.point('[data-ok]'); }],
          [150, function () { m.click('[data-ok]'); m.rm('[data-dlg]', 'on'); m.text('[data-st]', 'Issued, IFC'); m.text('[data-ap]', 'R. Engineer'); m.status('ISO-008 Rev B issued.'); m.idle('.canvas'); }]];
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
          center: '<div class="pane on ken"><div class="v-load" data-load><span>Loading Unit 210...</span><i><u data-loadbar></u></i></div><img class="fill stage-a" src="' + R + 'assets/screens/model-skel.jpg" alt=""><img class="fill stage-b" src="' + R + 'assets/screens/model.jpg" alt=""><div class="vcube"><b>TOP</b></div><div class="vaxis"><i>X</i><i>Y</i><i>Z</i></div></div>',
          bottomTabs: ['Sheet Register', 'Test Packs', 'Site Queries (3)'],
          bottom: grid(['Sheet', 'Rev', 'Status', 'Line', 'Issued'], [{ v: ['ISO-008', 'C', 'Current', '28-CW-008', '26 Oct'], c: 'g' }, { v: ['ISO-008', 'B', 'Superseded', '28-CW-008', '12 Oct'], c: 'old' }, { v: ['ISO-009', 'B', 'Current', '28-CW-009', '26 Oct'], c: 'g' }, { v: ['ISO-010', 'A', 'Current', '32-CW-001', '12 Oct'], c: 'g' }]),
          props: [['Selected', [['Type', 'Butterfly valve'], ['Size', '28 in ND'], ['Rating', '150 LB, lug, RF'], ['Standard', 'ASME B16.10'], ['Line', '28-CW-008']]], ['Sheet', [['Current', 'ISO-008 Rev C'], ['Issued', '26 Oct'], ['Test pack', 'TP-210-04']]], ['Access', [['Crew devices', '38'], ['CAD licences', '0']]]]
        };
      },
      steps: function (m) {
        return [[300, function () { m.add('.row', 'on'); m.busy(true); m.bar('[data-loadbar]', 35); m.point('.canvas'); }], [520, function () { m.bar('[data-loadbar]', 70); m.add('.stage-a', 'on'); m.add('[data-load]', 'small'); m.status('Loading geometry...'); }],
          [700, function () { m.bar('[data-loadbar]', 100); }], [420, function () { m.add('.stage-b', 'on'); m.add('[data-load]', 'gone'); m.busy(false); m.status('Ready'); }],
          [1200, function () { m.add('.ken', 'run'); m.idle('.canvas'); }], [900, function () { m.point('.row.old'); }], [180, function () { m.add('.row.old', 'sel'); m.status('ISO-008 Rev B is superseded. Open Rev C.'); }], [1300, function () { m.point('.row:nth-child(1)'); }]];
      }
    }
  };

  var SVG = {};
  function loadSvg(url) {
    if (!SVG[url]) SVG[url] = fetch(url).then(function (r) { return r.text(); });
    return SVG[url];
  }

  /* A hand on a mouse: curved paths, fast in the middle and slow on arrival, sometimes
     overshooting and correcting; never quite the same spot twice, and never perfectly still. */
  function Hand(el) {
    var x = 1290, y = 815, raf = 0, moving = false, drift = 0, waiters = [];
    function put() { el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function settle() { moving = false; waiters.splice(0).forEach(function (f) { f(); }); }
    function ease(t) { var s = Math.pow(t, .86); return s * s * s * (s * (6 * s - 15) + 10); }
    function leg(tx, ty, dur, bow, then) {
      var x0 = x, y0 = y, dx = tx - x0, dy = ty - y0, cx = x0 + dx * .5 - dy * bow, cy = y0 + dy * .5 + dx * bow, t0 = performance.now(), ph = rnd(0, 6);
      cancelAnimationFrame(raf);
      (function f(now) {
        var t = Math.min(1, (now - t0) / dur), e = ease(t), u = 1 - e, wob = Math.sin(t * Math.PI);
        x = u * u * x0 + 2 * u * e * cx + e * e * tx + Math.sin(ph + t * 19) * .9 * wob;
        y = u * u * y0 + 2 * u * e * cy + e * e * ty + Math.cos(ph + t * 23) * .9 * wob;
        put();
        if (t < 1) raf = requestAnimationFrame(f); else { x = tx; y = ty; put(); then(); }
      })(t0);
    }
    this.to = function (tx, ty) {
      moving = true; clearTimeout(drift);
      var d = Math.hypot(tx - x, ty - y), dur = Math.min(980, 230 + 135 * Math.log2(d / 22 + 1)) * rnd(.86, 1.16), bow = rnd(.05, .17) * (Math.random() < .5 ? -1 : 1);
      if (d > 170 && Math.random() < .55) {
        var over = rnd(5, 13), ox = tx + (tx - x) / d * over + rnd(-3, 3), oy = ty + (ty - y) / d * over + rnd(-3, 3);
        leg(ox, oy, dur, bow, function () { setTimeout(function () { leg(tx, ty, rnd(110, 190), 0, settle); }, rnd(25, 70)); });
      } else leg(tx, ty, dur, bow, settle);
    };
    this.arrived = function (f) { if (moving) waiters.push(f); else f(); };
    /* Resting: the hand keeps shifting slightly. */
    this.rest = function () {
      clearTimeout(drift);
      (function next() {
        drift = setTimeout(function () { if (moving) return; leg(x + rnd(-7, 7), y + rnd(-5, 5), rnd(240, 520), rnd(-.1, .1), next); }, rnd(650, 1900));
      })();
    };
    this.stop = function () { cancelAnimationFrame(raf); clearTimeout(drift); moving = false; waiters.length = 0; };
    put();
  }

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
    var timers = [], onScreen = false, running = false, instant = false, hand = null, run = 0;
    function $(s) { return inner.querySelector(s); }
    function all(s) { return Array.prototype.slice.call(inner.querySelectorAll(s)); }
    function later(ms, fn) { if (instant) fn(); else timers.push(setTimeout(fn, ms)); }
    /* Draw a pass entity by entity, in uneven batches, as a regen does. */
    function batch(items, ms, fn) {
      if (instant || !items.length) { items.forEach(fn); return; }
      var i = 0, step = 28, per = Math.max(1, items.length / (ms / step));
      (function tick() {
        var n = Math.ceil(per * (.45 + Math.random() * 1.1));
        for (var k = 0; k < n && i < items.length; k++, i++) fn(items[i]);
        if (i < items.length) later(step, tick);
      })();
    }
    var api = {
      add: function (s, c) { all(s).forEach(function (e) { e.classList.add(c); }); },
      rm: function (s, c) { all(s).forEach(function (e) { e.classList.remove(c); }); },
      seq: function (s, gap) { all(s).forEach(function (e, i) { later(i * gap, function () { e.classList.add('on'); }); }); },
      text: function (s, t) { var e = $(s); if (e) e.textContent = t; },
      val: function (k, v) { var e = $('[data-k="' + k + '"]'); if (e) e.textContent = v; },
      status: function (t) { var e = $('[data-status]'); if (e) e.textContent = t; },
      prog: function (pct) { var e = $('[data-prog]'); if (!e) return; e.parentNode.classList.add('on'); e.style.width = pct + '%'; if (pct >= 100) later(350, function () { e.parentNode.classList.remove('on'); }); },
      bar: function (s, pct) { var e = $(s); if (e) e.style.width = pct + '%'; },
      busy: function (on) { var c = $('.m-cursor'); if (c) c.classList.toggle('busy', on); },
      log: function (l) { var e = $('[data-log]'); if (!e) return; e.innerHTML += l.replace(/<g>(.*)<\/g>/, '<span class="g">$1</span>') + '\n'; e.scrollTop = e.scrollHeight; },
      tab: function (id) { all('[data-tab]').forEach(function (t) { t.classList.toggle('on', t.dataset.tab === id); }); all('[data-pane]').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === id); }); },
      reveal: function (layer, ms) { batch(all('.slot [data-l="' + layer + '"]'), ms, function (e) { e.classList.add('v'); }); },
      unreveal: function (layer, ms) { batch(all('.slot [data-l="' + layer + '"]'), ms, function (e) { e.classList.add('x'); }); },
      /* Aim somewhere inside the target, as a person does; never dead centre. */
      point: function (s) {
        var el = $(s), f, r, k;
        if (!el || !hand) return;
        f = inner.getBoundingClientRect(); r = el.getBoundingClientRect(); k = f.width / W;
        var big = r.width > 300, ax = big ? .25 + Math.random() * .5 : .32 + Math.random() * .36, ay = big ? .25 + Math.random() * .5 : .3 + Math.random() * .42;
        hand.to((r.left - f.left + Math.min(r.width * ax, big ? r.width : 90)) / k, (r.top - f.top + r.height * ay) / k);
      },
      idle: function (s) { if (hand) { api.point(s); hand.arrived(function () { if (hand) hand.rest(); }); } },
      click: function (s) {
        var cur = $('.m-cursor'), el = $(s);
        if (cur) { cur.classList.add('press'); later(95, function () { cur.classList.remove('press'); }); }
        if (el) { el.classList.add('down'); later(120, function () { el.classList.remove('down'); }); }
      }
    };
    function finishLayers(s) { Array.prototype.forEach.call(s.querySelectorAll('[data-l]'), function (e) { e.classList.add(e.dataset.l === 'raw' || e.dataset.l === 'dupe' ? 'x' : 'v'); }); }
    function fill() {
      var id = ++run;
      all('.slot').forEach(function (s) {
        loadSvg(R + 'assets/screens/' + s.dataset.svg).then(function (t) { if (id === run) { s.innerHTML = t; if (instant) finishLayers(s); } });
      });
    }
    function draw() {
      inner.className = 'mock';
      inner.innerHTML = shell(clip.build(R), R) + '<i class="m-cursor"><svg viewBox="0 0 20 22"><path d="M1 1v16.2l4.4-4 2.9 6.8 3.1-1.4L8.6 12l6-.6Z" fill="#fff" stroke="#111" stroke-width="1.3"/></svg><b></b></i>';
      fit();
      fill();
      if (hand) hand.stop();
      hand = instant ? null : new Hand($('.m-cursor'));
    }
    function fit() { var w = host.clientWidth; if (w) inner.style.setProperty('--s', (w / W).toFixed(5)); }
    function play() {
      if (running || !onScreen) return;
      running = true;
      draw();
      var steps = clip.steps(api), i = 0;
      /* Each step waits its turn, and for the hand to arrive: nothing is clicked from a distance. */
      (function next() {
        if (i >= steps.length) {
          later(3400, function () { inner.classList.add('out'); });
          later(3800, function () { running = false; timers = []; if (onScreen) play(); });
          return;
        }
        var s = steps[i++];
        later(s[0], function () { hand.arrived(function () { s[1](); next(); }); });
      })();
    }
    function stop() { timers.forEach(clearTimeout); timers = []; running = false; if (hand) hand.stop(); }
    if (RM) instant = true;
    draw();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    if (RM) { api.add('.m-cursor', 'off'); clip.steps(api).forEach(function (s) { s[1](); }); inner.classList.add('done'); return; }
    new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting;
      if (onScreen) play(); else stop();
    }, { threshold: .25 }).observe(host);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-mock]'), Mock);
})();
