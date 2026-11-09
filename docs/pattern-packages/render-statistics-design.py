"""Render seven design and diagnostic teaching figures and their compact companions.

Requires ReportLab. Inputs are the fictional statistics-design-examples.json.
Run from any directory; assets and dimensions are written relative to this file.
"""
import json
import re
from math import ceil, sqrt
from itertools import product
from collections import Counter
from random import Random
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.graphics import renderSVG
from reportlab.graphics.shapes import Drawing, Line, String, Rect, Circle, PolyLine
from reportlab.lib.colors import toColor
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/assets/statistics'
DATA = json.loads(Path(__file__).with_name('statistics-design-examples.json').read_text())
INK, GREEN, PURPLE, GRAY, PAPER = '#181814', '#007a4d', '#7259b8', '#66665e', '#fafaf6'
DIMENSIONS = {}
OUT.mkdir(parents=True, exist_ok=True)


def text(d, x, y, value, size=15, color=INK, anchor='start', bold=False):
    d.add(String(x, y, str(value), fontName='Helvetica-Bold' if bold else 'Helvetica',
                 fontSize=size, fillColor=toColor(color), textAnchor=anchor))


def wrapped(d, x, y, value, width, size=14, color=INK, bold=False):
    words, current = value.split(), ''
    font = 'Helvetica-Bold' if bold else 'Helvetica'
    for word in words:
        candidate = (current + ' ' + word).strip()
        if current and stringWidth(candidate, font, size) > width:
            text(d, x, y, current, size, color, bold=bold)
            y -= size * 1.4
            current = word
        else:
            current = candidate
    if current:
        text(d, x, y, current, size, color, bold=bold)
    return y - size * 1.4


def line(d, x1, y1, x2, y2, color=INK, width=1.5, dash=None):
    d.add(Line(x1, y1, x2, y2, strokeColor=toColor(color), strokeWidth=width, strokeDashArray=dash))


def rect(d, x, y, w, h, color, stroke=None):
    d.add(Rect(x, y, w, h, fillColor=toColor(color), strokeColor=toColor(stroke) if stroke else None))


def point(d, x, y, color=INK, radius=3.5):
    d.add(Circle(x, y, radius, fillColor=toColor(color), strokeColor=None))


def frame(w, h, title, subtitle):
    d = Drawing(w, h)
    rect(d, 0, 0, w, h, PAPER)
    y = wrapped(d, 20 if w == 360 else 30, h-35, title, w-50, 22 if w == 360 else 25, bold=True)
    wrapped(d, 20 if w == 360 else 30, y-8, subtitle, w-50, 13 if w == 360 else 15, GRAY)
    return d


def axes(d, area, xr, yr, xticks, yticks):
    x0, y0, w, h = area
    xx = lambda v: x0 + (v-xr[0]) / (xr[1]-xr[0]) * w
    yy = lambda v: y0 + (v-yr[0]) / (yr[1]-yr[0]) * h
    for v in yticks:
        line(d, x0, yy(v), x0+w, yy(v), '#deded5', .7)
        text(d, x0-10, yy(v)-4, f'{v:g}', 13, GRAY, 'end')
    line(d, x0, y0, x0+w, y0, GRAY, 1)
    for v in xticks:
        text(d, xx(v), y0-22, f'{v:g}', 13, GRAY, 'middle')
    return xx, yy


def path(d, points, color=GREEN, width=2):
    d.add(PolyLine([coordinate for pair in points for coordinate in pair],
                  strokeColor=toColor(color), strokeWidth=width))


def save(d, name, title, desc, compact):
    # Catch clipped labels at authoring time, including the compact layouts.
    for item in d.contents:
        if isinstance(item, String):
            width = stringWidth(item.text, item.fontName, item.fontSize)
            start = item.x - (width if item.textAnchor == 'end' else width/2 if item.textAnchor == 'middle' else 0)
            if start < -1 or start+width > d.width+1 or item.y < 0 or item.y+item.fontSize > d.height:
                raise ValueError(f'Clipped text in {name}: {item.text!r}')
    svg = renderSVG.drawToString(d)
    # Keep two-point strokes open: closing retraces dashes and can erase their gaps.
    svg = re.sub(r'(<path d="M [^"ML]* L [^"ML]*) Z"', r'\1"', svg)
    svg = svg[svg.index('<svg'):]
    i = svg.index('>')+1
    svg = svg[:i]+'<title>'+escape(title)+'</title><desc>'+escape(desc)+'</desc>'+svg[i:]
    filename = name + ('-mobile' if compact else '') + '.svg'
    (OUT/filename).write_text(svg)
    DIMENSIONS['statistics/'+filename] = {'width': int(d.width), 'height': int(d.height)}


def validity(compact):
    p=DATA['validity'];w=360 if compact else 720;h=750 if compact else 530
    d=frame(w,h,'Does the score support the claim?','Same learners, different assessment blueprints. Scores out of 100.')
    left=110 if compact else 160;scale=(w-left-45)/100
    for i,label in enumerate(['Recall','Application']):
        y=(550-i*155) if compact else (350-i*105)
        text(d,20 if compact else 30,y+13,label,15,bold=True)
        for j,(values,color) in enumerate([(p['before'],GRAY),(p['after'],GREEN)]):
            yy=y-j*30;rect(d,left,yy,values[i]*scale,20,color)
            text(d,left+values[i]*scale+6,yy+4,str(values[i]),14,color)
    x=20 if compact else 30;y=205 if compact else 170
    rect(d,x,y,15,12,GRAY);text(d,x+22,y,'Before',14)
    rect(d,x+115,y,15,12,GREEN);text(d,x+137,y,'After',14)
    for weight,title in [(.8,'80% recall / 20% application'),(.5,'50% recall / 50% application')]:
        before=weight*p['before'][0]+(1-weight)*p['before'][1]
        after=weight*p['after'][0]+(1-weight)*p['after'][1]
        y-=48 if compact else 44
        text(d,x,y,title,14,bold=True)
        text(d,x,y-22,f'{before:g} -> {after:g}     Change: +{after-before:g} points',15,GREEN)
    wrapped(d,x,40,'Transfer to unfamiliar work still needs relevant evidence.',w-50,14)
    save(d,'measure-claim','Measure and intended claim','Recall scores 60 to 90, application scores 50 to 55. The 80/20 composite rises from 58 to 83; equal weighting gives 55 to 72.5. Neither alone establishes transfer.',compact)


def resampling(compact):
    p=DATA['resampling'];means=[sum(v)/len(v) for v in p['units'].values()]
    distribution=Counter(round(sum(v)/3,8) for v in product(means,repeat=3))
    se=sqrt(sum((v-21)**2*n for v,n in distribution.items())/27)
    rows=[x for values in p['units'].values() for x in values]
    row_se=sqrt(sum((x-21)**2 for x in rows)/len(rows)/6)
    w=360 if compact else 720;h=840 if compact else 670
    d=frame(w,h,'Draw workers, keep their readings','Three independent workers, two related readings each.')
    y=620 if compact else 510;cell=100 if compact else 210;x0=20 if compact else 35
    text(d,x0,y+40,'One whole-worker replicate',17,bold=True)
    for i,label in enumerate(p['replicate']):
        x=x0+i*cell;rect(d,x,y-35,cell-12,55,'#e0eee5')
        text(d,x+10,y-3,f"{label}: {', '.join(map(str,p['units'][label]))}",14,GREEN,bold=True)
    text(d,x0,y-66,'A, A, C -> mean 17.67',16,GREEN,bold=True)
    area=(55,215,w-85,215 if compact else 180)
    xx,yy=axes(d,area,(9,33),(0,8),[11,21,31],[0,2,4,6,8])
    for v,n in sorted(distribution.items()):rect(d,xx(v)-10,yy(0),20,yy(n)-yy(0),GREEN)
    text(d,area[0],area[1]+area[3]+24,'All 27 ordered worker samples',16,bold=True)
    text(d,area[0],area[1]+area[3]+5,'Count',13,GRAY)
    text(d,w/2,170,'Bootstrap mean',13,GRAY,'middle')
    text(d,x0,123,f'Whole-worker bootstrap SD: {se:.2f}',16,GREEN,bold=True)
    text(d,x0,95,f'Independent-row bootstrap SD: {row_se:.2f}',15,GRAY)
    wrapped(d,x0,57,'More bootstrap draws cannot create more independent workers.',w-50,14)
    save(d,'resample-units','Whole-unit resampling and its distribution','A sample A A C retains both readings from every selected worker. All 27 ordered worker samples have exact conditional standard deviation 4.71, compared with 3.36 for independent-row resampling. Three clusters are inadequate for a reliable general interval.',compact)


def monitoring(compact):
    p=DATA['monitoring'];w=360 if compact else 720;h=570 if compact else 520
    se=p['individual_sigma']/sqrt(p['subgroup_n']);lo=p['baseline_mean']-3*se;hi=p['baseline_mean']+3*se
    d=frame(w,h,'Watch a fixed reference','Known baseline: mean 100 g; individual sigma 4 g; n = 4 per subgroup.')
    area=(55,185,w-85,235 if compact else 215)
    xx,yy=axes(d,area,(.7,12.3),(92,110),[1,4,8,12],[94,100,106,110])
    for value,color in [(lo,PURPLE),(100,GRAY),(hi,PURPLE)]:line(d,xx(.7),yy(value),xx(12.3),yy(value),color,1.5,[4,4])
    path(d,[(xx(i+1),yy(v)) for i,v in enumerate(p['means'])],GRAY,1.5)
    for i,v in enumerate(p['means']):point(d,xx(i+1),yy(v),PURPLE if v>hi or v<lo else GREEN,4)
    text(d,area[0],area[1]+area[3]+20,'Subgroup mean, grams',14,GRAY)
    text(d,w/2,140,'Prospective subgroup number',13,GRAY,'middle')
    text(d,20 if compact else 30,102,f'Mean limits: {lo:g} to {hi:g} grams',16,bold=True)
    text(d,20 if compact else 30,76,'11 and 12 signal: investigate the cause.',15,PURPLE)
    wrapped(d,20 if compact else 30,44,'Control limits describe variation; specifications describe requirements.',w-50,14)
    save(d,'stable-baseline','Prospective subgroup means against fixed limits','Twelve subgroup means follow a separately established baseline. Known independent Normal readings imply mean standard deviation two and three-sigma limits 94 and 106. Subgroups 11 and 12 exceed the upper limit.',compact)


def assignment(compact):
    p=DATA['assignment'];w=360 if compact else 720;h=850 if compact else 650
    d=frame(w,h,'Assign branches, observe employees','500 employees; 20 independent branch assignments, ten per arm.')
    columns=5 if compact else 10;cell=64 if compact else 66;left=20 if compact else 30;top=625 if compact else 485
    for i in range(p['clusters']):
        x=left+(i%columns)*cell;y=top-(i//columns)*61;color=GREEN if i<10 else PURPLE
        rect(d,x,y,54,49,'#e0eee5' if i<10 else '#eee8f6')
        for a in range(5):
            for b in range(5):point(d,x+11+a*8,y+9+b*6,color,1.6)
    text(d,left,top+64,'Each box: 1 branch / 25 employees',15,bold=True)
    text(d,left,400 if compact else 380,'Green: arm A    Purple: arm B',14)
    base=340 if compact else 310
    text(d,left,base,'Same total enrollment, different designs',16,bold=True)
    # Approximate independent-person equivalents, not randomized-unit counts.
    cases=[(10,50),(20,25),(40,12.5)]
    for i,(k,m) in enumerate(cases):
        y=base-65-i*69;de=1+(m-1)*p['icc'];effective=500/de
        text(d,left,y+24,f'{k} branches x {m:g} people',14,bold=True)
        rect(d,left,y, effective/300*(w-2*left-50),13,GREEN if k==20 else GRAY)
        text(d,left+effective/300*(w-2*left-50)+8,y+1,f'{effective:.0f}',14)
    wrapped(d,left,70,'ICC = 0.08. Bars: approximate independent-person equivalents for variance.',w-50,14)
    save(d,'assignment-units','Assignment boundaries and precision','Twenty branches each contain twenty-five employees and are assigned ten per arm. Design effect 2.92 gives approximately 171 independent-person equivalents. Ten branches of 50 give 102, forty branches averaging 12.5 give 260 under equal-size planning assumptions. Assignment counts remain 10, 20, 40.',compact)


def missingness(compact):
    p=DATA['missingness'];w=360 if compact else 720;h=610 if compact else 520
    missing=p['enrolled']-p['observed'];cohort=lambda m:(p['observed']*p['observed_mean']+missing*m)/p['enrolled']
    d=frame(w,h,'Which unseen outcomes change the claim?','60 scores observed at mean 80; 40 scores missing. All scores: 0 to 100.')
    area=(60,180,w-90,240 if compact else 215)
    xx,yy=axes(d,area,(0,100),(40,90),[0,25,55,80,100],[40,50,60,70,80,90])
    path(d,[(xx(0),yy(cohort(0))),(xx(100),yy(cohort(100)))],GREEN,2.5)
    line(d,xx(0),yy(p['benchmark']),xx(100),yy(p['benchmark']),PURPLE,1.5,[4,4])
    line(d,xx(55),yy(40),xx(55),yy(70),PURPLE,1,[3,3]);point(d,xx(55),yy(70),PURPLE,5)
    text(d,area[0],area[1]+area[3]+20,'Full-cohort mean',14,GRAY)
    text(d,w/2,135,'Assumed mean among missing students',13,GRAY,'middle')
    text(d,20 if compact else 30,96,'Missing mean 55 -> cohort mean 70',16,PURPLE,bold=True)
    text(d,20 if compact else 30,69,'Extreme bounds: 48 to 88',15)
    wrapped(d,20 if compact else 30,42,'Scenario arithmetic; no uncertainty band or estimate of missing outcomes.',w-50,14)
    save(d,'missingness-sensitivity','Missing-outcome sensitivity and tipping point','The full cohort mean is 48 plus 0.4 times the unobserved mean. Missing-group means 80,65,55,40 imply full means 80,74,70,64. Crossing 55 changes the comparison with 70. Extreme bounds are 48 to 88.',compact)


def structure(compact):
    w=360 if compact else 720;h=650 if compact else 510
    p=DATA['structure'];mean=lambda a:sum(a)/len(a)
    variances=[sum((v-mean(p[key]))**2 for v in p[key])/3 for key in ['x','y']]
    fraction=variances[0]/sum(variances)
    d=frame(w,h,'A dominant component can come from scale','Four observations; zero covariance. Same data, two variance criteria.')
    left=20 if compact else 30;barw=w-2*left
    for i,(title,f,label) in enumerate([('Centered raw variables',fraction,'PC1: 99.99%'),('Unit-variance standardization',.5,'PC1: 50% / PC2: 50%')]):
        yy=(430-i*155) if compact else (325-i*125)
        text(d,left,yy+40,title,16,bold=True)
        rect(d,left,yy,barw*f,25,GREEN);rect(d,left+barw*f,yy,barw*(1-f),25,PURPLE)
        text(d,left,yy-28,label,16,GREEN,bold=True)
        if i==0:text(d,left,yy-52,'PC2: 0.01%',14,PURPLE)
    text(d,left,150 if compact else 105,'Green: PC1    Purple: PC2',14)
    wrapped(d,left,105 if compact else 70,'After standardization the eigenvalues tie: no unique first direction.',w-50,15,bold=True)
    save(d,'structure-scaling','PCA variance shares depend on measurement scale','Four points at plus or minus 100 for x and plus or minus one for y have zero covariance. Raw variance ratio is 10000 to one, so PC1 explains 99.99 percent. Standardization gives the identity covariance matrix, eigenvalues one and one, and tied 50 percent shares.',compact)


def simulation(compact):
    p=DATA['simulation'];rng=Random(p['seed']);estimates=[sum(rng.gauss(p['true_mean'],p['sigma']) for _ in range(p['n']))/p['n'] for _ in range(p['replications'])]
    se=p['sigma']/sqrt(p['n'])
    for name,factor in [('Correct SE',1),('Half SE',p['narrow_factor'])]:
        actual=sum(abs(v-p['true_mean'])<=p['z95']*se*factor for v in estimates)
        if actual!=p['results'][name]['covered']:raise ValueError('Simulation fixture differs from seeded computation')
    w=360 if compact else 720;h=610 if compact else 530
    d=frame(w,h,'Check coverage against a known answer','2,000 Normal datasets; n = 16; true mean 10; known sigma 4.')
    area=(55,190,w-85,230 if compact else 210)
    xx=lambda v:area[0]+(v-.6)/.4*area[2]
    for v in [.6,.7,.8,.9,1]:
        line(d,xx(v),area[1],xx(v),area[1]+area[3],'#deded5',.7)
        text(d,xx(v),area[1]-23,f'{100*v:.0f}',13,GRAY,'middle')
    line(d,xx(.95),area[1],xx(.95),area[1]+area[3],PURPLE,1.5,[4,4])
    for i,(name,r) in enumerate(p['results'].items()):
        y=area[1]+area[3]-55-i*115;value=r['coverage'];half=p['z95']*r['mcse']
        text(d,area[0],y+32,f"{name}: {100*value:.2f}%",15,bold=True)
        line(d,xx(value-half),y,xx(value+half),y,GREEN if i==0 else GRAY,3)
        point(d,xx(value),y,GREEN if i==0 else GRAY,5)
    text(d,w/2,139,'Coverage, percent',13,GRAY,'middle')
    text(d,20 if compact else 30,96,'Dashed: nominal 95% coverage',15,PURPLE)
    wrapped(d,20 if compact else 30,65,'Bars: approximate 95% Monte Carlo ranges. More replications refine the check, not the dataset.',w-50,14)
    save(d,'simulation-coverage','Coverage with Monte Carlo uncertainty','The correct known-SE interval covers 1892 of 2000 datasets, 94.60 percent, MCSE 0.51 percentage points. Halving SE covers 1347, 67.35 percent, MCSE 1.05 points. Bars show approximate Monte Carlo 95 percent ranges. Seed 20261025.',compact)


if __name__ == '__main__':
    for compact in [False,True]:
        for draw in [validity,resampling,monitoring,assignment,missingness,structure,simulation]:draw(compact)
    manifest=ROOT/'content/assets/manifest.json'
    dimensions=json.loads(manifest.read_text());dimensions.update(DIMENSIONS)
    manifest.write_text(json.dumps(dimensions,indent=2)+'\n')
    print(f'Rendered {len(DIMENSIONS)} assets; simulation fixture verified.')
