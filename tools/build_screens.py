#!/usr/bin/env python3
"""Builds the vector content shown inside the product recordings.
sheet.svg is the real isometric from the recorded pipeline run. gad-*.svg is a synthetic general
arrangement drawn here: customer drawings must never be published.
Run from the repo root: python3 tools/build_screens.py"""
import json, random, re

d = json.load(open('demos/data/iso8.json'))
s = d['sheet']['svg'].replace('<rect width="100%" height="100%" fill="white"/>', '')
for a, b in {'#00aa00': '#42e08f', '#00aa55': '#9fb4d0', '#1565c0': '#9fb4d0', '#ff0000': '#ff7b6b', '#ff00ff': '#d6a2f5', '#333': '#e2e8f0', '#000000': '#e2e8f0', '#999999': '#8a97ad'}.items():
    s = s.replace(f'"{a}"', f'"{b}"')
s = s.replace('fill="white"', 'fill="#14181f"').replace('fill="#eeeeee"', 'fill="#232a35"')
W, H = d['sheet']['w'], d['sheet']['h']
vb = (-500, 100, W + 1000, 13300)
s = re.sub(r'<svg [^>]*>', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" font-family="ui-monospace,Consolas,monospace">'
           f'<rect x="{vb[0]+120}" y="{vb[1]+120}" width="{vb[2]-240}" height="{vb[3]-240}" fill="none" stroke="#5b6675" stroke-width="28"/>'
           f'<rect x="{vb[0]+240}" y="{vb[1]+240}" width="{vb[2]-480}" height="{vb[3]-480}" fill="none" stroke="#5b6675" stroke-width="10"/>', s, count=1)
open('assets/screens/sheet.svg', 'w').write(s)

# ── a synthetic piping GA ──
random.seed(48)
W, H = 1200, 780
G = []
for x in (150, 430, 710, 990):
    G.append(f'<path d="M{x} 40V{H-40}" stroke="#4a5462" stroke-dasharray="26 7 4 7"/><circle cx="{x}" cy="26" r="13" fill="none" stroke="#4a5462"/>')
for y in (160, 400, 640):
    G.append(f'<path d="M40 {y}H{W-210}" stroke="#4a5462" stroke-dasharray="26 7 4 7"/>')
for x in (150, 430, 710, 990):
    for y in (160, 400, 640):
        G.append(f'<rect x="{x-11}" y="{y-11}" width="22" height="22" fill="#232a35" stroke="#8a97ad"/>')
RUNS = []
for i, y in enumerate((210, 232, 254, 276, 330, 352, 450, 472, 494, 560, 582, 700)):
    x0, x1 = random.choice((60, 90, 130)), random.choice((940, 960, 985))
    w = random.choice((2.2, 3, 4))
    G.append(f'<path d="M{x0} {y}H{x1}" stroke="#cbd5e1" stroke-width="{w}"/>')
    RUNS.append((x0, x1, y))
for x, y0, y1 in ((300, 210, 472), (560, 254, 582), (820, 232, 700), (250, 330, 700)):
    G.append(f'<path d="M{x} {y0}V{y1}" stroke="#cbd5e1" stroke-width="3"/>')
G.append('<rect x="480" y="84" width="170" height="74" rx="36" fill="#14181f" stroke="#e2e8f0" stroke-width="2.4"/><circle cx="175" cy="620" r="44" fill="#14181f" stroke="#e2e8f0" stroke-width="2.4"/><rect x="760" y="600" width="130" height="84" fill="#14181f" stroke="#e2e8f0" stroke-width="2.4"/>')
for x, y in ((360, 232), (640, 276), (470, 352), (760, 472), (330, 582), (610, 700), (880, 210)):
    G.append(f'<path d="M{x-9} {y-6}l18 12v-12l-18 12z" fill="#14181f" stroke="#e2e8f0" stroke-width="1.6"/>')
base = '\n'.join(G)
SVC = ['CW', 'PA', 'RP', 'BD', 'UW', 'OWS']
labels = [(random.randint(170, 900), y, f'{random.randint(1,8)}"-{random.choice(SVC)}-{random.randint(20000,26000)}') for (_, _, y) in RUNS for _ in range(2)]
def pill(x, y, t, c='#ff7b6b'):
    w = len(t) * 6.4 + 12
    return f'<rect x="{x-w/2:.0f}" y="{y-8}" width="{w:.0f}" height="16" rx="8" fill="#14181f" stroke="{c}"/><text x="{x}" y="{y+3.5}" font-size="10.5" text-anchor="middle" fill="{c}">{t}</text>'
head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="ui-monospace,Consolas,monospace"><rect x="8" y="8" width="{W-16}" height="{H-16}" fill="none" stroke="#5b6675" stroke-width="2"/>'
# As extracted from the model: every note piled on its own pipe, some twice.
before = [head, base]
for x, y, t in labels:
    before.append(pill(x + random.randint(-14, 14), y + random.randint(-7, 7), t))
    if random.random() < .55:
        before.append(pill(x + random.randint(10, 46), y + random.randint(-9, 9), t))
for i in range(9):
    x = random.randint(1000, 1120); y = random.randint(60, 700)
    before.append(f'<text x="{x}" y="{y}" font-size="11" fill="#ff7b6b" text-anchor="middle">BOP EL.{random.randint(100,104)}.{random.randint(100,999)}</text>')
before.append('</svg>')
open('assets/screens/gad-before.svg', 'w').write('\n'.join(before))
# Finished: labels in clear slots with leaders, chain dimensions at the matchline, margin entries.
after = [head, base]
used = []
for x0, x1, y in RUNS:
    x = random.randint(x0 + 90, x1 - 110)
    t = f'{random.randint(1,8)}"-{random.choice(SVC)}-{random.randint(20000,26000)}'
    lane = y - 11
    tries = 0
    while any(abs(x - a) < 112 and abs(lane - b) < 18 for a, b in used) and tries < 40:
        x = random.randint(x0 + 70, x1 - 90); tries += 1
    used.append((x, lane))
    after.append(pill(x, lane, t))
ys = sorted(r[2] for r in RUNS)
after.append(f'<path d="M1012 {ys[0]}V{ys[-1]}" stroke="#ff7b6b"/>')
for a, b in zip(ys, ys[1:]):
    after.append(f'<path d="M1006 {a}h12" stroke="#ff7b6b"/><text x="1024" y="{(a+b)/2+3.5:.0f}" font-size="10" fill="#ff7b6b">{(b-a)*5}</text>')
after.append(f'<path d="M1006 {ys[-1]}h12" stroke="#ff7b6b"/>')
for i in range(11):
    y = 70 + i * 62
    after.append(f'<text x="1066" y="{y}" font-size="10" fill="#ff7b6b">{random.randint(1,8)}"-{random.choice(SVC)}-{random.randint(20000,26000)}</text><text x="1066" y="{y+13}" font-size="10" fill="#ff7b6b">BOP EL.{random.randint(100,104)}.{random.randint(100,999)}</text>')
after.append('</svg>')
open('assets/screens/gad-after.svg', 'w').write('\n'.join(after))
print('ok')
