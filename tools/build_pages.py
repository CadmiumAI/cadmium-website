#!/usr/bin/env python3
"""Generates the company pages and keeps the nav and footer the same on every page.
Run from the repo root: python3 tools/build_pages.py"""
import json, os, re

PHASES = {
  'feed': dict(
    n='FEED', title='Front-end engineering', short='Turn licensor packages into live data',
    h1='Start FEED with data, not a stack of PDFs.',
    lead='Licensor packages and vendor P&IDs arrive as drawings. Cadmium reads them into tagged, connected data on day one, so estimates and line lists start from something you can query.',
    outcomes=[('Days, not weeks', 'to a first line list from a licensor P&ID package'), ('98%', 'tag accuracy on clean P&IDs, reviewed by your engineers'), ('±10%', 'early MTO estimates from reconciled line data')],
    rows=[('Line list', 'Typed by hand from drawings', 'Generated from the P&ID graph'), ('Valve and instrument index', 'Counted and re-counted', 'Extracted with a source link to every tag'), ('Early MTO', 'Factored from similar jobs', 'Built up from real line and fitting data'), ('Plot plan studies', 'Modelled from scratch', 'Started from 3D recovered from 2D layouts')],
    module=('P&amp;ID intelligence', 'pid/', 'pid.png'), module2=('3D from 2D', '3d-from-2d/'),
    lost='Retyping licensor packages, and re-checking counts every time a revision lands.'),
  'detailed': dict(
    n='Detailed engineering', title='Detailed engineering', short='Issue isometrics and MTOs in minutes',
    h1='Issue-ready isometrics and annotated GADs, in minutes.',
    lead='Isometrics and GA annotation take up more drafting hours than almost anything else on a project. Cadmium takes your 3D model to a finished, annotated isometric, and annotates the GAs you extract so you can issue them.',
    outcomes=[('95%', 'less manual rework per isometric'), ('10 min', 'per sheet, including engineer review'), ('Every revision', 'compared automatically, sheet by sheet')],
    rows=[('Equipment models', 'Modelled by hand from vendor PDFs', 'Built from the vendor drawing, nozzles included'), ('Piping isometrics', 'Hours of clean-up per sheet', 'Finished sheet, native DWG and DXF'), ('GAD annotation', 'Labels and dimensions moved by hand', 'Your GA annotated, as DGN and PDF, in seconds'), ('Bill of materials', 'Rebuilt after each change', 'Generated from the model with every run'), ('Revision control', 'Manual clouding and comparison', 'Changes detected and clouded automatically'), ('Model and P&amp;ID checks', 'Sampled at review', 'Every line reconciled before issue')],
    module=('Isometrics', 'isometrics/', '../screens/sheet.svg'), module2=('GAD annotation', 'gad/'),
    lost='Cleaning up generated isometrics, and doing it again after every model change.'),
  'procurement': dict(
    n='Procurement', title='Procurement and fabrication', short='MTOs and spools your shop can trust',
    h1='MTOs that keep up with the model.',
    lead='Late changes reach procurement as surprises. Cadmium keeps material take-offs tied to the model, shows exactly what changed between revisions, and issues spool drawings fabrication can build from.',
    outcomes=[('Live', 'MTOs that update with every model revision'), ('Line by line', 'difference reports between MTO revisions'), ('Fewer', 'surplus and short-shipped items at site')],
    rows=[('Material take-off', 'Exported, then corrected in Excel', 'Generated from the model, tied to each line'), ('MTO revisions', 'Compared by hand', 'Automatic differences by item and line'), ('Spool drawings', 'Drafted one at a time', 'Generated with weld and cut data'), ('Weld maps', 'Marked up by hand', 'Numbered from the model')],
    module=('Isometrics', 'isometrics/', '../screens/sheet.svg'), module2=('3D from 2D', '3d-from-2d/'),
    lost='Reconciling take-offs with the latest model, and chasing items that changed after the order went out.'),
  'construction': dict(
    n='Construction', title='Construction', short='The current drawing and model, at the workface',
    h1='The right drawing and model, at the workface.',
    lead='Site crews lose time finding out what is current. Cadmium puts every sheet and its 3D model on any device with no CAD licence, and works out test-pack boundaries from the P&IDs.',
    outcomes=[('Any device', 'isometric and 3D model, no CAD licence needed'), ('Always current', 'superseded sheets clearly flagged'), ('Hours, not days', 'to mark up test-pack boundaries')],
    rows=[('Erection isometrics', 'Printed, then superseded', 'Current revision on any device'), ('3D model access', 'Limited to CAD seats', 'Browser viewer for the whole crew'), ('Test packs', 'Boundaries marked up by hand', 'Generated from the P&amp;ID graph'), ('Site queries', 'Raised, then searched for', 'Answered with a link to the source')],
    module=('Isometrics', 'isometrics/#viewer', '../screens/sheet.svg'), module2=('P&amp;ID intelligence', 'pid/'),
    lost='Finding the current revision, and marking up test-pack boundaries by hand.'),
  'handover': dict(
    n='Handover', title='Commissioning and handover', short='As-builts and data your client will accept',
    h1='Hand over data the owner can actually use.',
    lead='Handover is where missing tags and stale drawings become your problem. Cadmium reconciles as-built drawings against the model and produces clean, connected registers in the structure your client specifies.',
    outcomes=[('Every tag', 'traced to the document it came from'), ('CFIHOS-ready', 'registers in the structure your client specifies'), ('Weeks', 'taken out of final document close-out')],
    rows=[('Tag registers', 'Compiled from many spreadsheets', 'Generated and cross-checked from documents'), ('As-built drawings', 'Redlines updated by hand', 'Reconciled and redrawn from markups'), ('Data handover', 'Rejected, corrected, resubmitted', 'Validated against the client spec first'), ('Isolation lists', 'Built per procedure', 'Generated from the connected P&amp;IDs')],
    module=('P&amp;ID intelligence', 'pid/', 'pid.png'), module2=('Isometrics', 'isometrics/'),
    lost='Reconciling tags across thousands of documents in the last, most expensive weeks of the job.'),
  'brownfield': dict(
    n='Brownfield', title='Brownfield and revamps', short='Bring legacy plants back into data',
    h1='Your plant has drawings. Now give it a model.',
    lead='Revamps start from scanned drawings that nobody trusts. Cadmium reads legacy P&IDs into connected data, rebuilds 3D from 2D general arrangements, and shows where the documents contradict each other.',
    outcomes=[('Scanned to structured', 'P&amp;IDs read from image files'), ('Plan + elevation', 'to a 3D piping route'), ('Conflicts flagged', 'between drawings before they reach site')],
    rows=[('Legacy P&amp;IDs', 'Redrawn by hand in CAD', 'Read into a connected, tagged graph'), ('3D of existing plant', 'Modelled from scratch', 'Recovered from 2D drawings'), ('Tie-in isolation', 'Traced by hand with highlighters', 'Worked out from the graph, then reviewed'), ('Document conflicts', 'Found on site', 'Flagged before issue')],
    module=('3D from 2D', '3d-from-2d/', '3d-from-2d.png'), module2=('P&amp;ID intelligence', 'pid/'),
    lost='Redrawing legacy documents before the revamp engineering can even begin.'),
}

STAGES_ONLY = {k: p for k, p in PHASES.items() if k != 'brownfield'}
PHOTO_OF = dict(feed='plant-stacks', detailed='welder-mask', procurement='pipeline-joints', construction='insulation-crew', handover='valve-work', brownfield='refinery-dusk')

def drop(label, root, items, key, cur):
    def row(k, h, t, d):
        if k is None:
            return f'<em class="nav-sub">{t}</em>'
        cur_attr = ' class="is-current" aria-current="page"' if k == cur else ''
        return f'<a href="{root}{h}"{cur_attr}><b>{t}</b><span>{d}</span></a>'
    links = ''.join(row(*i) for i in items)
    on = ' is-current' if key in (cur or '') or any(k == cur for k, *_ in items) else ''
    return f'''<div class="nav-drop"><button class="nav-drop-btn{on}" type="button" aria-expanded="false">{label}</button><div class="nav-panel">{links}</div></div>'''

def nav(root, cur):
    home = root or './'
    plat = [('iso', 'isometrics/', 'Isometrics', 'Model to finished sheet'), ('gad', 'gad/', 'GAD annotation', 'Your GAs, annotated and ready to issue'), ('pid', 'pid/', 'P&amp;ID intelligence', 'Drawings into connected data'), ('equip', 'equipment/', 'Equipment 3D modelling', 'Vendor drawings to plant-ready models'), ('carve', '3d-from-2d/', '3D from 2D', 'Models from drawings')]
    sol = [(k, f'phases/{k}/', p['title'], p['short']) for k, p in STAGES_ONLY.items()]
    sol += [(None, '', 'Project type', ''), ('brownfield', 'phases/brownfield/', PHASES['brownfield']['title'], PHASES['brownfield']['short'])]
    def link(h, t, k):
        c = ' class="is-current" aria-current="page"' if k == cur else ''
        return f'<a href="{root}{h}"{c}>{t}</a>'
    return f'''<header class="nav" id="nav">
  <div class="nav-inner wrap">
    <a class="nav-brand" href="{home}" aria-label="Cadmium — home">
      <img src="{root}cadmium-brand/icon/cadmium-icon.svg" alt="" width="30" height="30" />
      <b>Cadmium</b>
    </a>
    <nav class="nav-links" id="navLinks" aria-label="Main">
      {drop('Solutions', root, plat, 'x', cur)}
      {drop('Project phases', root, sol, 'x', cur)}
      {link('teams/', 'Teams', 'teams')}
      {link('security/', 'Security', 'security')}
      {link('company/', 'Company', 'company')}
    </nav>
    <div class="nav-actions">
      <button class="icon-btn nav-burger" id="navToggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <a class="btn btn--primary btn--sm" href="#contact">Start a pilot</a>
    </div>
  </div>
</header>'''

def footer(root):
    home = root or './'
    sol = ''.join(f'<a href="{root}phases/{k}/">{p["title"]}</a>' for k, p in PHASES.items())
    return f'''<footer class="footer footer--full">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a href="{home}" class="footer-brand" aria-label="Cadmium — home">
          <img src="{root}cadmium-brand/icon/cadmium-icon.svg" alt="" width="30" height="30" /><b>Cadmium</b>
        </a>
        <p>AI for engineering.</p>
      </div>
      <div><h4>Solutions</h4><a href="{root}isometrics/">Isometrics</a><a href="{root}gad/">GAD annotation</a><a href="{root}pid/">P&amp;ID intelligence</a><a href="{root}equipment/">Equipment 3D modelling</a><a href="{root}3d-from-2d/">3D from 2D</a></div>
      <div><h4>Project phases</h4>{sol}</div>
      <div><h4>Company</h4><a href="{root}platform/">Platform</a><a href="{root}teams/">Teams</a><a href="{root}security/">Security</a><a href="{root}company/">About</a><a href="mailto:hello@cadmium-ai.com">hello@cadmium-ai.com</a><a href="{root}credits/">Photo credits</a></div>
    </div>
    <p class="footer-legal">&copy; <span id="year">2026</span> Cadmium &middot; cadmium-ai.com</p>
  </div>
</footer>'''

def head(title, desc, root, url):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{desc}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700;800&family=Fira+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="{root}styles.css" />
<link rel="stylesheet" href="{root}site.css" />
<link rel="icon" href="{root}cadmium-brand/favicon/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="{root}cadmium-brand/favicon/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="{root}cadmium-brand/favicon/favicon-180.png" sizes="180x180" />
<meta name="color-scheme" content="light" />
<meta name="theme-color" content="#E9F1FB" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://cadmium-ai.com/{url}" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:image" content="https://cadmium-ai.com/cadmium-brand/icon/cadmium-icon-1024.png" />
<meta name="twitter:card" content="summary" />
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
'''

def pilot(h2='Start with one line, one sheet or one area.', lead='Bring real project data under NDA. We run it with your team, on your templates, so your engineers can judge the output against their own work.'):
    return f'''<section class="band band--cta" id="contact">
  <div class="wrap">
    <div class="cta-grid">
      <div class="stack">
        <p class="eyebrow">Pilot</p>
        <h2>{h2}</h2>
        <p class="lead">{lead}</p>
        <ol class="pilot-steps">
          <li><b>Scope</b><span>Pick a representative sample with your lead engineer.</span></li>
          <li><b>Run</b><span>We run it on your template and standards.</span></li>
          <li><b>Compare</b><span>Your team checks the output against the manual result.</span></li>
        </ol>
      </div>
      <form class="cta-form" id="contactForm" novalidate data-subject="Pilot request" data-default="" data-attach="">
        <div class="field"><label for="fName">Name</label><input id="fName" name="name" type="text" required placeholder="Jane Okoye" /></div>
        <div class="field"><label for="fCompany">Company</label><input id="fCompany" name="company" type="text" placeholder="Acme Engineering" /></div>
        <div class="field"><label for="fEmail">Work email</label><input id="fEmail" name="email" type="email" required placeholder="you@company.com" /></div>
        <div class="field"><label for="fTrack">Where would you start?</label>
          <select id="fTrack" name="track"><option>Isometrics from a 3D model</option><option>P&amp;IDs into line and valve lists</option><option>Equipment models from vendor drawings</option><option>3D from legacy drawings</option><option>Not sure yet</option></select></div>
        <div class="field"><label for="fNotes">About the project</label><textarea id="fNotes" name="notes" rows="3" placeholder="Refinery revamp, around 2,400 isometrics, modelled in Plant 3D."></textarea></div>
        <button class="btn btn--primary" type="submit">Request a pilot</button>
        <p class="form-note" id="formNote">Opens your mail client addressed to <a href="mailto:hello@cadmium-ai.com" id="formMailLink">hello@cadmium-ai.com</a>.</p>
      </form>
    </div>
  </div>
</section>'''

def page(path, title, desc, cur, body, scripts=''):
    root = '../' * (path.count('/') + 1) if path else ''
    url = path
    html = head(title, desc, root, url) + nav(root, cur) + '\n<main id="main">\n' + body.replace('{R}', root) + '\n' + pilot() + '\n</main>\n' + footer(root) + f'\n<script src="{root}script.js"></script>\n<script src="{root}demos/motion.js"></script>\n<script src="{root}demos/mocks.js"></script>\n' + scripts.replace('{R}', root) + '\n</body>\n</html>\n'
    os.makedirs(path or '.', exist_ok=True)
    open(os.path.join(path, 'index.html'), 'w').write(html)

# A small animated picture of each phase's work.
VIG = {
 # A process flow diagram being sketched, then flow through it.
 'feed': """<svg viewBox="0 0 180 96"><g class="d l">
   <rect style="--d:0s" pathLength="1" x="12" y="36" width="22" height="42" rx="10"/>
   <circle style="--d:.9s" pathLength="1" cx="62" cy="60" r="8"/>
   <circle style="--d:1.5s" pathLength="1" cx="98" cy="60" r="10"/>
   <path style="--d:1.7s" pathLength="1" d="M88 60l5-6 5 12 5-12 5 6"/>
   <rect style="--d:2.2s" pathLength="1" x="130" y="12" width="18" height="72" rx="9"/>
   <path style="--d:2.6s" pathLength="1" d="M130 28h18M130 40h18M130 52h18M130 64h18"/></g>
   <g class="d s"><path style="--d:.6s" pathLength="1" d="M34 60h20"/><path style="--d:1.2s" pathLength="1" d="M70 60h18"/><path style="--d:1.9s" pathLength="1" d="M108 60h22"/><path style="--d:2.9s" pathLength="1" d="M148 22h24M166 17l6 5-6 5"/><path style="--d:3s" pathLength="1" d="M148 74h24M166 69l6 5-6 5"/></g></svg>""",
 # An isometric sheet drawing itself: frame, line, dimensions, callouts, title block.
 'detailed': """<svg viewBox="0 0 180 96"><g class="d l"><rect style="--d:0s" pathLength="1" x="8" y="6" width="164" height="84"/><path style="--d:.3s" pathLength="1" d="M120 90V70h52M120 78h52M146 70v20"/></g>
   <g class="d s"><path style="--d:.7s;--t:1s" pathLength="1" d="M20 72 56 52V26l36 21 26-15"/></g>
   <g class="d r"><path style="--d:1.8s" pathLength="1" d="M14 64 50 44M50 40l4 3M12 61l4 3"/><path style="--d:2.2s" pathLength="1" d="M62 18l30 17M60 21l3-5M90 38l3-5"/></g>
   <g class="p"><circle style="--d:2.7s" cx="30" cy="48" r="5"/><circle style="--d:2.9s" cx="44" cy="30" r="5"/><circle style="--d:3.1s" cx="106" cy="52" r="5"/></g></svg>""",
 # A purchase order is ticked off, and the truck leaves with the pipe.
 'procurement': """<svg viewBox="0 0 180 96"><path class="road" d="M0 88H180"/>
   <g class="truck"><rect class="bed" x="62" y="56" width="66" height="8"/><rect class="pipe" x="64" y="48" width="62" height="7" rx="3.5"/><rect class="pipe" x="66" y="41" width="58" height="7" rx="3.5"/><path class="cab" d="M130 64V44h16l10 11v9z"/><path class="glass" d="M135 48h9l6 7h-15z"/><circle class="wh" cx="76" cy="72" r="7"/><circle class="wh" cx="116" cy="72" r="7"/><circle class="wh" cx="146" cy="72" r="7"/></g>
   <g class="l solid"><rect x="8" y="8" width="44" height="66" rx="2"/></g>
   <g class="rows"><rect style="--d:.2s" x="14" y="17" width="32" height="4"/><rect style="--d:.6s" x="14" y="28" width="32" height="4"/><rect style="--d:1s" x="14" y="39" width="32" height="4"/><rect style="--d:1.4s" x="14" y="50" width="32" height="4"/></g>
   <text class="po" x="30" y="68" text-anchor="middle">PO</text>
</svg>""",
 # A tower crane sets a pipe spool on the rack.
 'construction': """<svg viewBox="0 0 180 96"><g class="rack"><path d="M104 92V62M172 92V62M100 62h76M100 74h76M126 92V62M150 92V62"/></g>
   <g class="crane"><path d="M34 92V10M26 92h16M12 14h156M12 14v6M34 6l-20 8M34 6l60 8"/><rect x="8" y="20" width="12" height="9"/></g>
   <g class="tr"><rect class="trolley" x="54" y="13" width="12" height="4"/><rect class="cable" x="59.4" y="17" width="1.2" height="20"/>
   <g class="load"><path d="M46 44h28v10"/><path class="hook" d="M60 37l-10 7M60 37l10 7"/></g></g></svg>""",
 # Every document checked, then accepted.
 'handover': """<svg viewBox="0 0 180 96"><g class="l solid"><rect x="30" y="16" width="76" height="74" rx="3" transform="translate(10 -8)" opacity=".45"/><rect x="30" y="16" width="76" height="74" rx="3"/></g><rect class="clip" x="56" y="11" width="24" height="9" rx="2"/>
   <g class="chk"><rect x="52" y="30" width="44" height="4"/><rect x="52" y="46" width="44" height="4"/><rect x="52" y="62" width="44" height="4"/><rect x="52" y="78" width="30" height="4"/></g>
   <g class="d s"><path style="--d:.3s;--t:.3s" pathLength="1" d="M36 31l3 3 6-7"/><path style="--d:.8s;--t:.3s" pathLength="1" d="M36 47l3 3 6-7"/><path style="--d:1.3s;--t:.3s" pathLength="1" d="M36 63l3 3 6-7"/><path style="--d:1.8s;--t:.3s" pathLength="1" d="M36 79l3 3 6-7"/></g>
   <g class="stamp"><rect x="104" y="36" width="68" height="24" rx="3"/><text x="138" y="52" text-anchor="middle">ACCEPTED</text></g></svg>""",
}

def lifecycle():
    btns = ''.join(f'''<button type="button" class="lc-node" role="tab" data-phase="{k}" id="lc-{k}" aria-selected="false" aria-controls="lcPanel">
          <span class="lc-vig" aria-hidden="true">{VIG[k]}</span><i>{i+1:02d}</i><b>{p["n"]}</b></button>''' for i, (k, p) in enumerate(STAGES_ONLY.items()))
    panels = ''
    for k, p in STAGES_ONLY.items():
        m = p['module']; m2 = p['module2']
        rows = ''.join(f'<li>{r[0]}</li>' for r in p['rows'])
        out = ''.join(f'<div class="lc-out"><b>{a}</b><span>{b}</span></div>' for a, b in p['outcomes'])
        panels += f'''<div class="lc-panel" data-panel="{k}" hidden>
          <div class="lc-col"><img class="lc-photo" src="assets/photos/{PHOTO_OF[k]}.jpg" alt="" loading="lazy" /><h3>{p["title"]}</h3><p>{p["lost"]}</p><a class="btn btn--primary btn--sm" href="phases/{k}/">See this phase</a></div>
          <div class="lc-col"><h4>Deliverables</h4><ul>{rows}</ul></div>
          <div class="lc-col"><h4>Results</h4>{out}</div>
          <div class="lc-col"><h4>Solutions used</h4><a class="lc-shot" href="{m[1]}"><img src="assets/posters/{m[2]}" alt="" loading="lazy" /><span>{m[0]} &rarr;</span></a><a class="lc-more" href="{m2[1]}">{m2[0]} &rarr;</a></div>
        </div>'''
    return f'''<section class="band" id="lifecycle">
  <div class="wrap">
    <p class="eyebrow">Across the project</p>
    <h2>One platform, from FEED to handover.</h2>
    <p class="lead lead--wide">Pick a phase to see the deliverables, where the hours go, and what Cadmium takes off your team.</p>
    <div class="lc" id="lc" data-inview>
      <div class="lc-line" role="tablist" aria-label="Project phases">{btns}</div>
      <div id="lcPanel" class="lc-panels" role="tabpanel">{panels}</div>
    </div>
    <p class="lc-note">Revamping an existing plant? <a href="phases/brownfield/">See brownfield and revamps &rarr;</a></p>
  </div>
</section>'''

WALK_STEPS = [
 ('pid', 'Read', 'Turn a stack of P&amp;IDs into data by lunchtime', 'Open native files or scans. Every symbol, tag and line is read, linked back to where it sits on the sheet, and joined into a graph of the plant. Anything uncertain goes to an engineer, not into your line list.', ['Line, valve and instrument lists, ready on day one', 'Every tag traced back to its place on the sheet', 'Dangling lines and missing tags flagged for review'], 'pid/', 'See it read a P&amp;ID'),
 ('equip', 'Model', 'Equipment models from vendor drawings', 'Vendor drawings arrive as PDFs, and someone has to model every vessel and exchanger by hand. Cadmium reads the drawing and builds the 3D equipment, with nozzles where the vendor put them, ready to place in your plant model.', ['Vessels, exchangers, pumps and more', 'Nozzles with size, rating and orientation', 'Checked against the vendor drawing'], 'equipment/', 'See equipment modelling'),
 ('iso', 'Generate', 'From the model to a finished sheet', 'Point Cadmium at the 3D model. You get a finished isometric on your template, with every dimension, elevation and balloon in place, in native CAD.', ['Hours of clean-up per sheet become minutes of review', 'Your title block and your drafting standards', 'Native DWG and DXF, editable by your team'], 'isometrics/', 'Watch the pipeline run'),
 ('gad', 'Annotate', 'Your GAs, annotated and ready to issue', 'GAs extracted from your design tool arrive with notes piled on top of each other. Cadmium annotates the drawing in the DGN itself: labels placed clear of piping and dimensions, chained dimensions at the matchlines, and margin entries in your drafter&rsquo;s style.', ['A clean sheet in about ten seconds', 'Still your native DGN, plus a 1:1 PDF', 'Every label clear of piping and of other labels'], 'gad/', 'See GAD annotation'),
 ('mto', 'Take off', 'MTOs that keep up with the model', 'Quantities come straight from the model, line by line. When the model changes, you see exactly which items moved, before a purchase order goes out on stale numbers.', ['Differences by item and by line, per revision', 'Late changes visible the day they happen', 'Fewer surplus and short-shipped items at site'], 'phases/procurement/', 'See procurement'),
 ('review', 'Check', 'Engineers review changes, not whole sheets', 'Each revision is compared with the last and the changes are clouded for you. Sheets are checked against the model and P&amp;ID, then a qualified engineer signs them off.', ['Automatic clouding at every revision', 'Model, P&amp;ID and BOM checked against each other', 'A full record of who approved what, and when'], 'phases/detailed/', 'See detailed engineering'),
 ('site', 'Build', 'The current drawing, at the workface', 'Every sheet and its 3D model open on any device, with no CAD licence. Superseded revisions are flagged, so nobody builds from an old print.', ['Isometric and 3D model on any phone or tablet', 'Superseded revisions clearly flagged', 'Test-pack boundaries worked out from the P&amp;IDs'], 'phases/construction/', 'See construction'),
]
def walkthrough():
    bar = ''.join(f'<a href="#w-{k}"><i>{i+1:02d}</i>{t}</a>' for i, (k, t, *_) in enumerate(WALK_STEPS))
    steps = ''
    for i, (k, t, h, p, pts, href, cta) in enumerate(WALK_STEPS):
        lis = ''.join(f'<li>{x}</li>' for x in pts)
        steps += f'''<article class="walk-step{' flip' if i % 2 else ''}" id="w-{k}">
        <div class="walk-copy"><span class="walk-k">{i+1:02d} &middot; {t}</span><h3>{h}</h3><p>{p}</p><ul>{lis}</ul><a href="{href}">{cta} &rarr;</a></div>
        <div data-mock="{k}" data-root=""></div>
      </article>'''
    return f'''<section class="walk" id="walk">
  <div class="wrap"><p class="eyebrow">Walkthrough</p><h2>A line, from first P&amp;ID to the workface.</h2></div>
  <nav class="walk-bar" aria-label="Walkthrough steps"><div class="wrap">{bar}</div></nav>
  <div class="wrap">{steps}</div>
</section>'''

THREAD = '''<section class="band band--alt" id="thread">
  <div class="wrap">
    <p class="eyebrow">Connected data</p>
    <h2>One revision. Every document.</h2>
    <p class="lead lead--wide">P&amp;IDs, models, isometrics and MTOs describe the same plant, so Cadmium treats them as one dataset. Select a part to find it everywhere, or revise the line and watch the change carry through. <a href="platform/">How the platform fits together &rarr;</a></p>
    <div class="thread" id="thread-demo" data-rev="A" data-inview>
      <div class="thread-bar">
        <div class="chips" data-parts></div>
        <button type="button" class="btn btn--primary btn--sm" data-revise>Upsize line to 8 in</button>
        <span class="thread-rev">Revision <b data-revtext>A</b></span>
      </div>
      <div class="thread-grid">
        <figure><figcaption>P&amp;ID</figcaption><svg viewBox="0 0 320 170" class="t-pid">
          <path class="t-l" d="M58 90H104M136 90H176M204 90H258"/>
          <g data-part="pump"><circle class="t-s" cx="40" cy="90" r="18"/><text x="40" y="128" text-anchor="middle">P-101</text></g>
          <g data-part="valve"><path class="t-s" d="M104 79l32 22V79l-32 22z"/><text x="120" y="68" text-anchor="middle">HV-101</text></g>
          <g data-part="reducer"><path class="t-s" d="M176 76l28 8v12l-28 8z"/><text x="190" y="124" text-anchor="middle">R-1</text></g>
          <g data-part="pipe"><text x="222" y="80" text-anchor="middle" data-linetag>6-PW-101</text></g>
          <g data-part="elbow"><rect class="t-s" x="258" y="34" width="44" height="112" rx="20"/><text x="280" y="160" text-anchor="middle">D-101</text></g>
        </svg></figure>
        <figure><figcaption>3D model</figcaption><svg viewBox="0 0 320 170" class="t-3d">
          <g data-part="pump"><ellipse class="t-v" cx="50" cy="128" rx="24" ry="18"/></g>
          <g data-part="pipe"><path class="t-p" d="M68 118L132 82M172 60L226 30"/></g>
          <g data-part="valve"><path class="t-p" d="M132 82L152 71"/><path class="t-h" d="M142 76V52M130 52h24"/></g>
          <g data-part="reducer"><path class="t-p t-r" d="M152 71L172 60"/></g>
          <g data-part="elbow"><path class="t-p" d="M226 30Q246 20 262 34L284 56"/></g>
        </svg></figure>
        <figure><figcaption>Isometric</figcaption><svg viewBox="0 0 320 170" class="t-iso">
          <g data-part="pipe"><path class="t-g" d="M50 134L136 84M176 62L238 26"/><text class="t-d" x="84" y="86" transform="rotate(-30 84 86)">2400</text><text class="t-d" x="192" y="28" transform="rotate(-30 192 28)">3100</text></g>
          <g data-part="pump"><circle class="t-b" cx="30" cy="150" r="9"/><text x="30" y="154" text-anchor="middle">1</text></g>
          <g data-part="valve"><path class="t-q" d="M136 84l18-3-5 13-13-10z"/><circle class="t-b" cx="124" cy="116" r="9"/><text x="124" y="120" text-anchor="middle">2</text></g>
          <g data-part="reducer"><path class="t-g" d="M154 74L176 62"/><circle class="t-b" cx="176" cy="94" r="9"/><text x="176" y="98" text-anchor="middle">3</text></g>
          <g data-part="elbow"><path class="t-g" d="M238 26L280 62"/><circle class="t-b" cx="284" cy="30" r="9"/><text x="284" y="34" text-anchor="middle">4</text></g>
          <text class="t-size" x="226" y="150" data-sizeflag>6 NB &middot; Rev A</text>
        </svg></figure>
        <figure class="t-bomf"><figcaption>Bill of materials</figcaption>
          <table class="t-bom"><thead><tr><th>#</th><th>Item</th><th>Size</th></tr></thead><tbody>
            <tr data-part="pump"><td>1</td><td>Pump flange</td><td data-a="6 in" data-b="8 in">6 in</td></tr>
            <tr data-part="valve"><td>2</td><td>Gate valve</td><td data-a="6 in" data-b="8 in">6 in</td></tr>
            <tr data-part="reducer"><td>3</td><td>Reducer</td><td data-a="6 &times; 4" data-b="8 &times; 6">6 &times; 4</td></tr>
            <tr data-part="elbow"><td>4</td><td>Elbow, 90 LR</td><td data-a="4 in" data-b="6 in">4 in</td></tr>
            <tr data-part="pipe"><td>5</td><td>Pipe, 5.5 m</td><td data-a="6 in" data-b="8 in">6 in</td></tr>
          </tbody></table>
        </figure>
      </div>
    </div>
  </div>
</section>'''

INTEG = '''<section class="band" id="integrations">
  <div class="wrap">
    <p class="eyebrow">Fits your workflow</p>
    <h2>Keep the tools you already use.</h2>
    <p class="lead lead--wide">Nothing changes about how your designers model. Cadmium reads what they produce and writes native files.</p>
    <div class="flowmap" data-inview>
      <div class="integ-col"><h3>Reads</h3><p>AutoCAD Plant 3D</p><p>MicroStation DGN</p><p>AVEVA E3D and Hexagon S3D</p><p>SmartPlant and AVEVA P&amp;ID</p><p>Vendor drawings and datasheets</p><p>Scanned PDFs and images</p></div>
      <svg class="flow-pipes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10H50V50H100"/><path d="M0 30H40V50H100"/><path d="M0 50H100"/><path d="M0 70H40V50H100"/><path d="M0 90H50V50H100"/></svg>
      <div class="flow-mid"><img src="{R}cadmium-brand/icon/cadmium-icon.svg" alt="" width="64" height="64" /><b>One dataset</b><span>Tags, lines and geometry, linked across documents and revisions</span></div>
      <svg class="flow-pipes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50H50V10H100"/><path d="M0 50H60V30H100"/><path d="M0 50H100"/><path d="M0 50H60V70H100"/><path d="M0 50H50V90H100"/></svg>
      <div class="integ-col"><h3>Writes</h3><p>DWG, DXF and DGN, as native entities</p><p>Your title block and standards</p><p>PCF for spool fabrication</p><p>Plant 3D, E3D and S3D equipment; STEP and IGES</p><p>Excel and CSV registers</p><p>CFIHOS-structured handover data</p></div>
    </div>
    <p class="connects"><b>Connects to</b> SharePoint &middot; Aconex &middot; ProjectWise &middot; SAP &middot; Oracle &middot; REST API</p>
  </div>
</section>'''

FIELD = '''<section class="band" id="field">
  <div class="wrap">
    <p class="eyebrow">At the workface</p>
    <h2>Every sheet ends up in someone&rsquo;s hands.</h2>
    <p class="lead lead--wide">Crews cut, fit and weld from what engineering issues. When a drawing is wrong or late, this is where it costs you.</p>
    <div class="field-grid">
      <figure class="fg-a"><img src="assets/photos/insulation-crew.jpg" alt="Two workers in hard hats fabricating pipe insulation on a table at a process plant, pipework and steel behind them." loading="lazy" /></figure>
      <figure class="fg-b"><img src="assets/photos/welder-mask.jpg" alt="A welder in a mask running a TIG weld on a small-bore pipe spool." loading="lazy" /></figure>
      <figure class="fg-c"><img src="assets/photos/pipeline-trench.jpg" alt="Large-diameter coated pipeline strung along an open trench through woodland." loading="lazy" /></figure>
      <figure class="fg-d"><img src="assets/photos/flange-weld.jpg" alt="A welder in a mask working on a large flanged nozzle, with sparks at the joint." loading="lazy" /></figure>
    </div>
  </div>
</section>'''

SEC_BAND = '''<section class="band band--dark has-flow" id="trust" data-flow>
  <div class="wrap">
    <p class="eyebrow">Security</p>
    <h2>Built for client-confidential drawings.</h2>
    <div class="trust-grid">
      <div><b>Encrypted throughout</b><span>at rest and in transit</span></div>
      <div><b>Your cloud or on-premises</b><span>including air-gapped sites</span></div>
      <div><b>Never used for training</b><span>your data stays yours</span></div>
      <div><b>SSO, roles and audit logs</b><span>project by project</span></div>
    </div>
    <a class="btn btn--line-dark btn--sm" href="security/" style="margin-top:22px">Read about security</a>
  </div>
</section>'''

COST = '''<section class="band band--alt" id="cost">
  <div class="wrap">
    <div class="cost-grid">
      <div>
        <p class="eyebrow">The cost of redrawing</p>
        <h2>What isometrics cost you today.</h2>
        <p class="lead">Every revision sends the same sheets back to the same drafters. Put in your own numbers.</p>
      </div>
      <form class="cost-calc" id="costCalc"  autocomplete="off" onsubmit="return false">
        <div class="field"><label for="cIso">Isometrics on the project</label><input id="cIso" type="number" min="0" value="2400" /></div>
        <div class="field"><label for="cHrs">Hours per isometric today</label><input id="cHrs" type="number" min="0" step="0.25" value="2" /></div>
        <div class="field"><label for="cRev">Average revisions per sheet</label><input id="cRev" type="number" min="0" step="0.5" value="2" /></div>
        <div class="field"><label for="cRate">Loaded rate, USD per hour</label><input id="cRate" type="number" min="0" value="35" /></div>
        <div class="cost-out">
          <div><span>Hours returned to the project</span><b id="cHours">0</b></div>
          <div><span>Saved at your rate</span><b id="cSaved">0</b></div>
          <div class="cost-bars"><em>Today</em><i><u id="cBarA"></u></i><b id="cA"></b><em>With Cadmium</em><i><u id="cBarB" class="good"></u></i><b id="cB"></b></div>
          <p>Assumes 10 minutes per sheet with Cadmium, including review, and half the original effort for each manual revision.</p>
        </div>
      </form>
    </div>
  </div>
</section>'''

home = f'''<section class="hq hq--photo" id="top">
  <div class="hq-photo" aria-hidden="true"></div>
  <div class="wrap hq-copy">
    <div>
      <p class="eyebrow">AI for engineering</p>
      <h1>Engineering deliverables, without the rework.</h1>
      <p class="lead">Cadmium connects P&amp;IDs, 3D models, isometrics and MTOs, so your engineers review finished work instead of redrawing it.</p>
      <div class="hq-actions">
        <a class="btn btn--on-dark" href="#contact">Start a pilot</a>
        <a class="btn btn--line-dark" href="#lifecycle">See it across the project</a>
      </div>
    </div>
  </div>
<div class="proof proof--over" aria-label="Results"><div class="wrap proof-row">
  <div class="pf"><b><span class="count" data-to="95">95</span>%</b><span>less manual rework per isometric</span><div class="pf-viz"><em>Manual</em><i><u style="--w:100%" class="slow"></u></i><em>Cadmium</em><i><u style="--w:5%"></u></i></div></div>
  <div class="pf"><b><span class="count" data-to="10">10</span> min</b><span>per sheet, including engineer review</span><div class="pf-viz"><em>Today</em><i><u style="--w:100%" class="slow"></u></i><em>Cadmium</em><i><u style="--w:8%"></u></i></div></div>
  <div class="pf"><b><span class="count" data-to="98">98</span>%</b><span>tag accuracy reading clean P&amp;IDs</span><div class="pf-viz pf-dots">'''+'<s></s>'*49+'<s class="miss"></s>'+f'''</div></div>
  <div class="pf"><b>Native</b><span>DWG and DXF, editable in your CAD tools</span><div class="pf-viz pf-file"><code>ISO-008_RevB.dwg</code><code>MTO_Area200.xlsx</code></div></div>
</div></div>
</section>


{lifecycle()}
{walkthrough()}
{FIELD}
{COST}
{THREAD}
{INTEG}
{SEC_BAND}'''
page('', 'Cadmium — AI for engineering',
     'Cadmium connects P&amp;IDs, 3D models, isometrics and MTOs for EPC contractors, so engineers review finished work instead of redrawing it.', 'home', home,
     '''<script>
  (function () { var h = location.hash.slice(1);
    if (['problem', 'compare', 'product', 'viewer', 'savings'].indexOf(h) >= 0) location.replace('isometrics/#' + h); })();
</script>
<script src="demos/home.js"></script>''')

MOCK_OF = dict(feed='pid', detailed='iso', procurement='mto', construction='site', handover='review', brownfield='pid')
# Solutions
for k, p in PHASES.items():
    m, m2 = p['module'], p['module2']
    outs = ''.join(f'<div class="pf"><b>{a}</b><span>{b}</span></div>' for a, b in p['outcomes'])
    rows = ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>' for a, b, c in p['rows'])
    others = ''.join(f'<a href="{{R}}phases/{o}/" class="{"on" if o == k else ""}">{q["n"]}</a>' for o, q in STAGES_ONLY.items())
    body = f'''<section class="sub-hero has-photo" style="background-image:url('{{R}}assets/photos/{PHOTO_OF[k]}.jpg')"><div class="wrap">
    {f'<nav class="phase-rail" aria-label="Project phases">{others}</nav>' if k != 'brownfield' else ''}
    <div class="sub-grid">
      <div>
        <p class="eyebrow">{'Project type' if k == 'brownfield' else p["title"]}</p>
        <h1>{p["h1"]}</h1>
        <p class="lead">{p["lead"]}</p>
        <div class="hq-actions"><a class="btn btn--on-dark" href="#contact">Start a pilot</a><a class="btn btn--line-dark" href="{{R}}{m[1]}">See {m[0]} live</a></div>
      </div>
      <div data-mock="{MOCK_OF[k]}" data-root="{{R}}"></div>
    </div>
  </div></section>
  <section class="proof proof--light"><div class="wrap proof-row proof-row--3">{outs}</div></section>
  <section class="band"><div class="wrap">
    <p class="eyebrow">Deliverables</p>
    <h2>What changes on the job.</h2>
    <div class="table-wrap"><table class="ltable"><thead><tr><th>Deliverable</th><th>Today</th><th>With Cadmium</th></tr></thead><tbody>{rows}</tbody></table></div>
    <p class="also">Solutions used in this phase: <a href="{{R}}{m[1]}">{m[0]} &rarr;</a> &ensp; <a href="{{R}}{m2[1]}">{m2[0]} &rarr;</a></p>
  </div></section>'''
    title = re.sub('<[^>]+>', '', p['title'])
    page(f'phases/{k}', f'{title} — Cadmium', re.sub('&amp;', '&amp;', p['lead']), k, body)

# Platform
platform = '''<section class="sub-hero has-photo" style="background-image:url('{R}assets/photos/pipeline-joints.jpg')"><div class="wrap">
    <p class="eyebrow">Platform</p>
    <h1>Every engineering document, as one dataset.</h1>
    <p class="lead lead--wide">Cadmium reads the documents your project already produces, links them through the tags, lines and geometry they share, and writes finished deliverables back out.</p>
  </div></section>
  <section class="band band--alt"><div class="wrap">
    <p class="eyebrow">How it fits together</p>
    <h2>Read, connect, generate, check.</h2>
    <div class="steps">
      <div class="step"><h3>Read</h3><p>3D models, P&amp;IDs and scanned drawings become structured data, with a link back to the source.</p></div>
      <div class="step"><h3>Connect</h3><p>Tags, lines and geometry join into one graph of the plant, across documents and revisions.</p></div>
      <div class="step"><h3>Generate</h3><p>Isometrics, MTOs, registers and models are produced on your templates and standards.</p></div>
      <div class="step"><h3>Check</h3><p>Every output is verified against its sources, and conflicts go to an engineer for review.</p></div>
    </div>
  </div></section>
  <section class="band"><div class="wrap">
    <p class="eyebrow">Solutions</p>
    <h2>Start with one. They share the same data.</h2>
    <article class="prod"><div><h3>Isometrics</h3><p>A 3D model to a finished, annotated isometric on your template, with bill of materials, spool data and automatic revision comparison.</p><div class="prod-actions"><a class="btn btn--primary btn--sm" href="{R}isometrics/">Watch the pipeline run</a></div></div><div data-mock="iso" data-root="{R}"></div></article>
    <article class="prod"><div><h3>GAD annotation</h3><p>Annotates the GAs you extract from your design tool: labels clear of piping, chained dimensions, margin entries, in your native DGN with a 1:1 PDF.</p><div class="prod-actions"><a class="btn btn--primary btn--sm" href="{R}gad/">See GAD annotation</a></div></div><div data-mock="gad" data-root="{R}"></div></article>
    <article class="prod"><div><h3>Equipment 3D modelling</h3><p>Vendor drawings and datasheets become accurate 3D equipment with nozzles, ready to place in Plant 3D, E3D or S3D, or as neutral STEP and IGES.</p><div class="prod-actions"><a class="btn btn--primary btn--sm" href="{R}equipment/">See equipment modelling</a></div></div><div data-mock="equip" data-root="{R}"></div></article>
    <article class="prod"><div><h3>P&amp;ID intelligence</h3><p>Scanned or native P&amp;IDs into symbols, tags and connectivity, with line lists, valve lists and isolation answers on tap.</p><div class="prod-actions"><a class="btn btn--primary btn--sm" href="{R}pid/">Try the live demo</a></div></div><div data-mock="pid" data-root="{R}"></div></article>
    <article class="prod"><div><h3>3D from 2D</h3><p>General arrangements and legacy drawings into 3D models and pipe routes, with conflicts between drawings marked before they reach site.</p><div class="prod-actions"><a class="btn btn--primary btn--sm" href="{R}3d-from-2d/">Try the live demo</a></div></div><a class="prod-shot" href="{R}3d-from-2d/" aria-label="3D from 2D"><img src="{R}assets/posters/3d-from-2d.png" alt="" loading="lazy" /></a></article>
  </div></section>
  ''' + INTEG.replace('band"', 'band band--alt"', 1)
page('platform', 'Platform — Cadmium', 'Cadmium reads, connects, generates and checks engineering documents as one dataset, across P&amp;IDs, 3D models, isometrics and MTOs.', 'platform', platform)

# Teams
ROLES = [
 ('Piping leads', 'Your designers stop cleaning up drawings.', ['Finished isometrics on your drafting standard', 'Native files your team can still edit', 'Review time spent on engineering, not layout'], 'detailed'),
 ('Engineering managers', 'More deliverables from the team you have.', ['Man-hours per sheet you can plan around', 'Revision turnaround measured in minutes', 'A consistent standard across offices and subcontractors'], 'detailed'),
 ('Project directors', 'Fewer late surprises on cost and schedule.', ['Isometric issue dates that hold', 'MTO changes visible the day they happen', 'Less rework reaching fabrication and site'], 'procurement'),
 ('Digital and IT', 'Something you can actually approve.', ['Deploy in your cloud or on-premises', 'SSO, roles and full audit logs', 'A documented API into your existing systems'], 'security'),
]
cards = ''
ROLE_PHOTO = {'Piping leads': 'welder-mask', 'Engineering managers': 'pipefitters', 'Project directors': 'pipeline-trench', 'Digital and IT': 'plant-stacks'}
for t, h, pts, link in ROLES:
    href = 'security/' if link == 'security' else f'phases/{link}/'
    lis = ''.join(f'<li>{x}</li>' for x in pts)
    cards += f'<article class="role"><img src="{{R}}assets/photos/{ROLE_PHOTO[t]}.jpg" alt="" loading="lazy" /><p class="eyebrow">{t}</p><h3>{h}</h3><ul>{lis}</ul><a href="{{R}}{href}">Read more &rarr;</a></article>'
page('teams', 'Teams — Cadmium', 'What Cadmium changes for piping leads, engineering managers, project directors and digital teams at EPC contractors.', 'teams',
 f'''<section class="sub-hero has-photo" style="background-image:url('{{R}}assets/photos/pipefitters.jpg')"><div class="wrap">
    <p class="eyebrow">Teams</p>
    <h1>The same platform, a different day for each team.</h1>
    <p class="lead lead--wide">Designers, managers, directors and IT each need something different from it.</p>
  </div></section>
  <section class="band band--alt"><div class="wrap"><div class="roles">{cards}</div></div></section>''')

# Security
FAQ = [
 ('Is our data used to train models?', 'No. Customer drawings and models are never used to train models shared with other customers.'),
 ('Where is our data stored?', 'In the region you choose, or entirely inside your own environment. Data never leaves it without your approval.'),
 ('Can it run without internet access?', 'Yes. The on-premises edition runs on air-gapped networks, with updates delivered as signed packages.'),
 ('How do we delete a project?', 'Project owners can delete a project at any time. Data is purged from storage and backups within 30 days.'),
 ('Can we restrict access by project?', 'Yes. Access is role-based and set per project, including for joint-venture partners and subcontractors.'),
 ('Will you complete our security questionnaire?', 'Yes. We respond to vendor security reviews and can walk your team through our controls under NDA.'),
]
faq = ''.join(f'<details class="faq"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)
page('security', 'Security — Cadmium', 'Deployable in your cloud or on-premises, encrypted at rest and in transit, with customer data never used for model training.', 'security',
 f'''<section class="sub-hero has-flow" data-flow><div class="wrap">
    <p class="eyebrow">Security</p>
    <h1>Your client&rsquo;s drawings stay under your control.</h1>
    <p class="lead lead--wide">EPC projects run under strict confidentiality terms. Cadmium is built to meet them, wherever you need it to run.</p>
  </div></section>
  <section class="band band--dark"><div class="wrap">
    <div class="trust-grid">
      <div><b>Your environment</b><span>cloud, your tenancy or on-premises</span></div>
      <div><b>Project-level access</b><span>roles, SSO and audit logs</span></div>
      <div><b>AES-256 and TLS 1.2+</b><span>encrypted at rest and in transit</span></div>
      <div><b>No model training</b><span>on your data, ever</span></div>
    </div>
  </div></section>
  <section class="band"><div class="wrap">
    <p class="eyebrow">Deployment</p>
    <h2>Run it where your contract says it must run.</h2>
    <div class="boundary" data-inview aria-hidden="true"><svg viewBox="0 0 1000 170">
      <rect class="b-zone" x="210" y="14" width="580" height="142" rx="10"/><text x="228" y="38">Your environment</text>
      <g class="b-box"><rect x="256" y="66" width="130" height="58" rx="6"/><text x="321" y="100" text-anchor="middle">Drawings</text></g>
      <g class="b-box b-core"><rect x="436" y="66" width="130" height="58" rx="6"/><text x="501" y="100" text-anchor="middle">Cadmium</text></g>
      <g class="b-box"><rect x="616" y="66" width="130" height="58" rx="6"/><text x="681" y="100" text-anchor="middle">Deliverables</text></g>
      <path class="b-flow" d="M386 95H436M566 95H616"/>
      <path class="b-block" d="M790 95H880"/><path class="b-x" d="M806 83l24 24M830 83l-24 24"/><text x="890" y="100">Nothing leaves</text>
    </svg></div>
    <div class="table-wrap"><table class="ltable"><thead><tr><th>Option</th><th>Where it runs</th><th>Best for</th></tr></thead><tbody>
      <tr><td>Cadmium Cloud</td><td>Single-tenant, in your chosen region</td><td>Fast starts and pilots</td></tr>
      <tr><td>Your cloud</td><td>Your AWS, Azure or GCP account</td><td>Keeping data in your own tenancy</td></tr>
      <tr><td>On-premises</td><td>Your data centre, including air-gapped</td><td>Restricted and government projects</td></tr>
    </tbody></table></div>
  </div></section>
  <section class="band band--alt"><div class="wrap">
    <p class="eyebrow">Access and control</p>
    <h2>Who saw what, and when.</h2>
    <div class="tenets">
      <div class="tenet"><h3>Single sign-on</h3><p>SAML and OIDC with your identity provider, with SCIM provisioning and enforced multi-factor authentication.</p></div>
      <div class="tenet"><h3>Project-level roles</h3><p>Separate access for each project, discipline and partner, with least privilege by default.</p></div>
      <div class="tenet"><h3>Full audit trail</h3><p>Every view, download, run and change is logged and can be exported to your SIEM.</p></div>
    </div>
  </div></section>
  <section class="band"><div class="wrap">
    <p class="eyebrow">Questions security teams ask</p>
    <h2>Common questions.</h2>
    <div class="faqs">{faq}</div>
  </div></section>''')

# Company
page('company', 'Company — Cadmium', 'Cadmium builds AI for engineering, so engineers spend their time on engineering.', 'company',
 '''<section class="sub-hero has-photo" style="background-image:url('{R}assets/photos/flange-weld.jpg')"><div class="wrap">
    <p class="eyebrow">Company</p>
    <h1>Engineers should spend their time on engineering.</h1>
    <p class="lead lead--wide">A plant is designed, bought and built from documents that are still redrawn and retyped by hand. We started Cadmium to take that work away, beginning with the piping isometric.</p>
  </div></section>
  <section class="band band--alt"><div class="wrap">
    <p class="eyebrow">How we build</p>
    <h2>Engineers have to be able to trust it.</h2>
    <div class="tenets">
      <div class="tenet"><h3>Output you can edit</h3><p>Deliverables are native CAD entities and structured data that fit how your team works, never flattened images you have to redraw.</p></div>
      <div class="tenet"><h3>Answers you can check</h3><p>Everything links back to its source, so an engineer can see where each tag, dimension and quantity came from.</p></div>
      <div class="tenet"><h3>The engineer signs off</h3><p>Cadmium does the production work. Responsibility for what is issued stays with a qualified engineer, and our tools are built around that review.</p></div>
    </div>
  </div></section>''')

# Equipment 3D modelling
eq_rows = ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>' for a, b, c in [
 ('Vessels and drums', 'Modelled by hand from vendor PDFs', 'Built from the vendor GA'),
 ('Exchangers, pumps and packages', 'Placeholder blocks until late in the job', 'Accurate envelopes from the first vendor issue'),
 ('Nozzles', 'Typed in from the schedule, then checked', 'Size, rating and orientation read from the drawing'),
 ('Vendor revisions', 'Compared and remodelled by hand', 'Differences found, model updated'),
 ('Delivery', 'Rebuilt for each design tool', 'Plant 3D, E3D, S3D, STEP or IGES')])
page('equipment', 'Equipment 3D modelling — Cadmium', 'Cadmium turns vendor drawings and datasheets into accurate 3D equipment models with nozzles, for AutoCAD Plant 3D, AVEVA E3D, Hexagon S3D, STEP and IGES.', 'equip',
 '''<section class="sub-hero has-photo" style="background-image:url('{R}assets/photos/plant-stacks.jpg')"><div class="wrap">
    <div class="sub-grid">
      <div>
        <p class="eyebrow">Equipment 3D modelling</p>
        <h1>From vendor drawing to plant-ready model.</h1>
        <p class="lead">Every vessel, exchanger and pump arrives as a vendor PDF, and someone has to model it. Cadmium reads the drawing and builds the 3D equipment, with nozzles where the vendor put them.</p>
        <div class="hq-actions"><a class="btn btn--on-dark" href="#contact">Start a pilot</a></div>
      </div>
      <div data-mock="equip" data-root="{R}"></div>
    </div>
  </div></section>
  <section class="proof proof--light"><div class="wrap proof-row proof-row--3"><div class="pf"><b>Vendor GA in</b><span>drawings and datasheets, native or scanned</span></div><div class="pf"><b>Connectable nozzles</b><span>with size, rating and orientation, ready for piping</span></div><div class="pf"><b>Your design tool</b><span>Plant 3D, E3D, S3D, or neutral STEP and IGES</span></div></div></section>
  <section class="band"><div class="wrap">
    <p class="eyebrow">Deliverables</p>
    <h2>What changes on the job.</h2>
    <div class="table-wrap"><table class="ltable"><thead><tr><th>Task</th><th>Today</th><th>With Cadmium</th></tr></thead><tbody>'''+eq_rows+'''</tbody></table></div>
  </div></section>''')

# GAD annotation
gad_rows = [('Label placement', 'Dragged clear one at a time', 'Solved across the whole sheet, clear of piping and dimensions'), ('Duplicate notes', 'Found and deleted by eye', 'Removed automatically'), ('Matchline dimensions', 'Rebuilt by the drafter', 'Chained in your drafter&rsquo;s style'), ('Margin entries', 'Typed up the sheet edge', 'Moved and aligned for you'), ('Issue set', 'Exported and checked by hand', 'Native DGN and a 1:1 PDF')]
page('gad', 'GAD annotation — Cadmium', 'Cadmium annotates the general arrangement drawings you extract from your design tool: labels placed clear of piping, chained dimensions and margin entries, in native DGN with a 1:1 PDF.', 'gad',
 f'''<section class="sub-hero has-photo" style="background-image:url('{{{{R}}}}assets/photos/insulation-crew.jpg')"><div class="wrap">
    <div class="sub-grid">
      <div>
        <p class="eyebrow">GAD annotation</p>
        <h1>Your GAs, annotated and ready to issue.</h1>
        <p class="lead">A GA extracted from your design tool arrives unreadable, with hundreds of notes piled on top of each other and on the piping. Cadmium annotates it in about ten seconds, in your native DGN.</p>
        <div class="hq-actions"><a class="btn btn--on-dark" href="#contact">Start a pilot</a></div>
      </div>
      <div data-mock="gad" data-root="{{{{R}}}}"></div>
    </div>
  </div></section>
  <section class="proof proof--light"><div class="wrap proof-row proof-row--3"><div class="pf"><b>~10 s</b><span>per sheet, including preview</span></div><div class="pf"><b>DGN in, DGN out</b><span>your file stays your file, with nothing but annotation changed</span></div><div class="pf"><b>1:1 PDF</b><span>with your line weights and line styles</span></div></div></section>
  <section class="band"><div class="wrap">
    <p class="eyebrow">Deliverables</p>
    <h2>What changes on the job.</h2>
    <div class="table-wrap"><table class="ltable"><thead><tr><th>Task</th><th>Today</th><th>With Cadmium</th></tr></thead><tbody>{{''.join(f'<tr><td>{{a}}</td><td>{{b}}</td><td>{{c}}</td></tr>' for a, b, c in gad_rows)}}</tbody></table></div>
  </div></section>'''.replace('{{R}}', '{R}'))

# Credits
CREDITS = json.load(open('tools/photo_credits.json'))
rows = ''.join(f'<tr><td><img src="{{R}}assets/photos/{c["file"]}" alt="" loading="lazy" /></td><td><a href="{c["page"]}" rel="noopener">{c["title"]}</a></td><td>{c["author"]}</td><td>{c["license"]}{", cropped" if c["cropped"] else ""}, resized</td></tr>' for c in CREDITS)
page('credits', 'Photo credits — Cadmium', 'Sources and licences for the photographs on this site.', 'credits',
 f'''<section class="band"><div class="wrap">
    <p class="eyebrow">Photo credits</p>
    <h2>Photographs on this site.</h2>
    <p class="lead lead--wide">From Wikimedia Commons. The people and places shown are not customers of Cadmium and do not endorse it.</p>
    <div class="table-wrap"><table class="ltable credits"><thead><tr><th></th><th>Title and source</th><th>Author</th><th>Licence</th></tr></thead><tbody>{{rows}}</tbody></table></div>
  </div></section>'''.replace('{rows}', rows))

# Shared chrome on the three product pages.
for path, cur in (('isometrics', 'iso'), ('3d-from-2d', 'carve'), ('pid', 'pid')):
    f = os.path.join(path, 'index.html')
    s = open(f).read()
    s = re.sub(r'<header class="nav" id="nav">.*?</header>', lambda m: nav('../', cur), s, flags=re.S)
    s = re.sub(r'<footer class="footer.*?</footer>', lambda m: footer('../'), s, flags=re.S)
    # Every page closes with the same pilot section.
    closing = {'isometrics': dict(h2='See it on your own line.'),
               '3d-from-2d': dict(h2='Have drawings with no model?', lead='Bring real drawings under NDA. We run them with your team, so your engineers can judge the model against what they know of the plant.'),
               'pid': dict(h2='Sitting on a stack of P&amp;IDs?', lead='Bring real sheets under NDA. We read them with your team, so your engineers can judge the lists against their own.')}[path]
    s = re.sub(r'<section class="band band--cta" id="contact">.*?</section>', lambda m: pilot(**closing), s, flags=re.S)
    if path == 'isometrics' and 'class="subnav"' not in s:
        s = s.replace('<main id="main">', '''<nav class="subnav" aria-label="On this page"><div class="wrap"><b>Isometrics</b><a href="#compare">Comparison</a><a href="#product">How it works</a><a href="#viewer">3D model</a><a href="#savings">Savings</a></div></nav>
<main id="main">''', 1)
    s = re.sub(r"<script>\s*(/\*.*?\*/\s*)?\(function\(\)\{try\{var t=localStorage.*?</script>\s*", "", s, flags=re.S)
    if 'name="color-scheme"' not in s:
        s = s.replace('<meta name="theme-color"', '<meta name="color-scheme" content="light" />\n<meta name="theme-color"', 1)
    s = re.sub(r'<meta name="theme-color" content="[^"]*"', '<meta name="theme-color" content="#E9F1FB"', s)
    if 'demos/motion.js' not in s:
        s = s.replace('<script src="../script.js"></script>', '<script src="../script.js"></script>\n<script src="../demos/motion.js"></script>')
    open(f, 'w').write(s)
# The phase pages used to live under /solutions/.
for k in PHASES:
    os.makedirs(f'solutions/{k}', exist_ok=True)
    open(f'solutions/{k}/index.html', 'w').write(f'<!DOCTYPE html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="/phases/{k}/"><meta http-equiv="refresh" content="0; url=../../phases/{k}/"><a href="../../phases/{k}/">This page has moved.</a>\n')

# Version the stylesheets so a push reaches browsers straight away.
import glob, hashlib
tags = {n: hashlib.md5(open(n, 'rb').read()).hexdigest()[:8] for n in ('styles.css', 'site.css')}
for f in glob.glob('**/index.html', recursive=True):
    s = open(f).read()
    for n, v in tags.items():
        s = re.sub(r'(href="(?:\.\./)*)' + re.escape(n) + r'(\?v=\w+)?"', lambda m: f'{m.group(1)}{n}?v={v}"', s)
    open(f, 'w').write(s)
print('ok')
