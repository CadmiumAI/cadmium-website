#!/usr/bin/env python3
"""Builds the vector content shown inside the product recordings.
gad.svg is a synthetic general arrangement drawn here: customer drawings must never be published.
Run from the repo root: python3 tools/build_screens.py"""
import random

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
base = '\n'.join(f'<g data-l="base">{x}</g>' for x in G)
SVC = ['CW', 'PA', 'RP', 'BD', 'UW', 'OWS']
def tag_(): return f'{random.randint(1,8)}"-{random.choice(SVC)}-{random.randint(20000,26000)}'
def pill(x, y, t, l, c='#ff7b6b'):
    w = len(t) * 6.4 + 12
    return f'<g data-l="{l}"><rect x="{x-w/2:.0f}" y="{y-8}" width="{w:.0f}" height="16" rx="8" fill="#14181f" stroke="{c}"/><text x="{x}" y="{y+3.5}" font-size="10.5" text-anchor="middle" fill="{c}">{t}</text></g>'
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="ui-monospace,Consolas,monospace"><rect data-l="base" x="8" y="8" width="{W-16}" height="{H-16}" fill="none" stroke="#5b6675" stroke-width="2"/>', base]
# As extracted from the model: every note piled on its pipe, many twice.
labels = [(random.randint(170, 900), y, tag_()) for (_, _, y) in RUNS for _ in range(2)]
dupes = []
for x, y, t in labels:
    out.append(pill(x + random.randint(-14, 14), y + random.randint(-7, 7), t, 'raw'))
    if random.random() < .55:
        dupes.append(pill(x + random.randint(10, 46), y + random.randint(-9, 9), t, 'dupe'))
out += dupes
for i in range(9):
    x = random.randint(1000, 1120); y = random.randint(60, 700)
    out.append(f'<text data-l="raw" x="{x}" y="{y}" font-size="11" fill="#ff7b6b" text-anchor="middle">BOP EL.{random.randint(100,104)}.{random.randint(100,999)}</text>')
# Finished: labels in clear slots, chain dimensions at the matchline, margin entries.
used = []
for x0, x1, y in RUNS:
    x = random.randint(x0 + 90, x1 - 110); lane = y - 11; tries = 0
    while any(abs(x - a) < 112 and abs(lane - b) < 18 for a, b in used) and tries < 40:
        x = random.randint(x0 + 70, x1 - 90); tries += 1
    used.append((x, lane))
    out.append(pill(x, lane, tag_(), 'label'))
ys = sorted(r[2] for r in RUNS)
out.append(f'<path data-l="chain" d="M1012 {ys[0]}V{ys[-1]}" stroke="#ff7b6b"/>')
for a_, b_ in zip(ys, ys[1:]):
    out.append(f'<g data-l="chain"><path d="M1006 {a_}h12" stroke="#ff7b6b"/><text x="1024" y="{(a_+b_)/2+3.5:.0f}" font-size="10" fill="#ff7b6b">{(b_-a_)*5}</text></g>')
out.append(f'<path data-l="chain" d="M1006 {ys[-1]}h12" stroke="#ff7b6b"/>')
for i in range(11):
    y = 70 + i * 62
    out.append(f'<g data-l="margin"><text x="1066" y="{y}" font-size="10" fill="#ff7b6b">{tag_()}</text><text x="1066" y="{y+13}" font-size="10" fill="#ff7b6b">BOP EL.{random.randint(100,104)}.{random.randint(100,999)}</text></g>')
out.append('</svg>')
open('assets/screens/gad.svg', 'w').write('\n'.join(out))
print('ok')

# ── a synthetic vendor drawing for the equipment recording ──
def text(x, y, t, size=11, anchor='start', fill='#cbd5e1'):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{fill}">{t}</text>'
L = '#cbd5e1'
E = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 640" font-family="ui-monospace,Consolas,monospace"><g data-l="base"><rect x="8" y="8" width="744" height="624" fill="none" stroke="#5b6675" stroke-width="2"/>']
E.append(f'<path d="M150 130H530Q590 130 590 200Q590 270 530 270H150Q90 270 90 200Q90 130 150 130Z" fill="none" stroke="{L}" stroke-width="2"/><path d="M150 130V270M530 130V270" stroke="{L}" stroke-dasharray="7 4"/><path d="M70 200H610" stroke="#5b6675" stroke-dasharray="22 5 4 5"/>')
NOZ = [('N1', 210, 130, -1), ('N2', 340, 130, -1), ('N3', 470, 130, -1), ('N4', 260, 270, 1), ('N5', 440, 270, 1)]
for n, x, y, d in NOZ:
    E.append(f'<path d="M{x-12} {y}V{y+d*30}H{x+12}V{y}M{x-18} {y+d*30}H{x+18}" fill="none" stroke="{L}" stroke-width="1.6"/>')
    E.append(text(x, y + d * 38 + (4 if d > 0 else 0) + (6 if d > 0 else 0), n, 11, 'middle'))
for x in (190, 490):
    E.append(f'<path d="M{x-44} 325H{x+44}M{x-34} 325L{x-24} 268M{x+34} 325L{x+24} 268" fill="none" stroke="{L}" stroke-width="1.6"/>')
E.append('<path d="M150 362V378M530 362V378M150 370H530" stroke="#ff7b6b"/>' + text(340, 364, '7200 T/T', 11, 'middle', '#ff7b6b'))
E.append('<path d="M618 130H634M618 270H634M626 130V270" stroke="#ff7b6b"/>' + text(642, 204, '2400 ID', 11, 'start', '#ff7b6b'))
E.append(text(30, 40, 'V-3104 KNOCK-OUT DRUM', 13))
E.append(text(30, 58, 'VENDOR GA  REV 2  NOT FOR CONSTRUCTION', 10, 'start', '#8a97ad'))
SCHED = [('N1', '8"', 'Inlet'), ('N2', '4"', 'Vent'), ('N3', '6"', 'Outlet'), ('N4', '3"', 'Drain'), ('N5', '2"', 'Level')]
E.append(f'<path d="M30 420H400M30 442H400M100 420V{442+len(SCHED)*22}M170 420V{442+len(SCHED)*22}M30 420V{442+len(SCHED)*22}M400 420V{442+len(SCHED)*22}" stroke="#5b6675" fill="none"/>')
E.append(text(42, 436, 'MARK', 10) + text(112, 436, 'SIZE', 10) + text(182, 436, 'SERVICE', 10))
for i, (m_, sz, sv) in enumerate(SCHED):
    y = 458 + i * 22
    E.append(text(42, y, m_, 10) + text(112, y, sz, 10) + text(182, y, sv, 10) + f'<path d="M30 {y+6}H400" stroke="#333b47"/>')
E.append('<path d="M480 540H730M480 570H730M480 600H730M480 540V620H730V540" stroke="#5b6675" fill="none"/>' + text(492, 560, 'V-3104', 11) + text(492, 590, 'DESIGN 150 PSIG, 300 F', 9) + '</g>')
BOX = '#ffcf5c'
for x, y, w, h in [(84, 124, 512, 152), (612, 122, 92, 158), (140, 352, 400, 32)]:
    E.append(f'<rect data-l="dims" x="{x}" y="{y}" width="{w}" height="{h}" fill="rgba(255,207,92,.05)" stroke="{BOX}" stroke-width="1.4"/>')
for n, x, y, d in NOZ:
    top = y - 40 if d < 0 else y
    E.append(f'<rect data-l="noz" x="{x-24}" y="{top}" width="48" height="52" fill="rgba(52,211,153,.08)" stroke="#34d399" stroke-width="1.4"/>')
for x in (190, 490):
    E.append(f'<rect data-l="sad" x="{x-50}" y="264" width="100" height="66" fill="rgba(127,150,255,.08)" stroke="#7f96ff" stroke-width="1.4"/>')
E.append(f'<rect data-l="noz" x="26" y="416" width="378" height="{30+len(SCHED)*22}" fill="rgba(52,211,153,.05)" stroke="#34d399" stroke-width="1.4"/></svg>')
open('assets/screens/equip-drawing.svg', 'w').write('\n'.join(E))
