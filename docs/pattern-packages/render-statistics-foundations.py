"""Render seven original teaching figures and their compact companions.

Requires ReportLab. Inputs are the fictional statistics-foundations-examples.json.
Run from any directory; assets and dimensions are written relative to this file.
"""
import json
import re
from math import ceil, exp, lgamma, log, log1p, sqrt
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.graphics import renderSVG
from reportlab.graphics.shapes import Drawing, Line, String, Rect, Circle, PolyLine
from reportlab.lib.colors import toColor
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/assets/statistics'
DATA = json.loads(Path(__file__).with_name('statistics-foundations-examples.json').read_text())
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


def beta_density(p, a, b):
    if p == 0 or p == 1:
        return 0.0  # All the priors/posteriors used here have a,b > 1.
    return exp((a-1)*log(p)+(b-1)*log1p(-p)+lgamma(a+b)-lgamma(a)-lgamma(b))


def beliefs(compact):
    u=DATA['updating'];w=360 if compact else 720;h=780 if compact else 460
    d=frame(w,h,'Same data, explicit priors','Eight completions and two failures; curves are densities.')
    for stage in range(2):
        area=(55,435 if stage==0 else 130,280,195) if compact else (65+stage*335,140,270,195)
        xx,yy=axes(d,area,(0,1),(0,5),[0,.5,1],[0,2,4])
        text(d,area[0],area[1]+area[3]+25,'Before observing' if stage==0 else 'After 8 / 10',17,bold=True)
        for prior,color in zip(u['priors'],[GREEN,PURPLE]):
            a,b=prior
            if stage:a+=u['successes'];b+=u['trials']-u['successes']
            path(d,[(xx(i/200),yy(beta_density(i/200,a,b))) for i in range(201)],color)
        text(d,area[0]+area[2]/2,area[1]-45,'Completion probability p',13,GRAY,'middle')
    footer=67 if compact else 65
    text(d,20 if compact else 30,footer,'Green: Beta(2,2) -> Beta(10,4)',14,GREEN)
    text(d,20 if compact else 30,footer-(18 if compact else 21),'Posterior mean 71.4%',14,GREEN)
    x0=20 if compact else 375;y0=footer-36 if compact else footer
    text(d,x0,y0,'Purple: Beta(8,8) -> Beta(16,10)',14,PURPLE)
    text(d,x0,y0-(18 if compact else 21),'Posterior mean 61.5%',14,PURPLE)
    save(d,'belief-update','Prior and posterior sensitivity','Two priors centered at 50 percent update under the same eight successes in ten trials. Posterior means are 71.4 and 61.5 percent.',compact)


def precision(compact):
    p=DATA['precision'];w=360 if compact else 720;d=frame(w,530,'Plan the precision you need','Known sigma = 12 points; two-sided 95% interval for one mean.')
    area=(60,150,w-90,235)
    xx,yy=axes(d,area,(0,260),(0,8),[0,64,128,192,256],[0,2,4,6,8])
    path(d,[(xx(n),yy(p['z95']*p['sigma']/sqrt(n))) for n in range(9,257)],GREEN)
    line(d,xx(0),yy(3),xx(260),yy(3),PURPLE,1.5,[4,4])
    n=ceil((p['z95']*p['sigma']/p['half_width'])**2)
    point(d,xx(n),yy(p['z95']*p['sigma']/sqrt(n)),PURPLE,4.5)
    text(d,xx(n)+10,yy(3)+12,'n = 62',14,PURPLE)
    text(d,area[0],408,'Interval half-width, points',14,GRAY)
    text(d,w/2,104,'Complete independent observations',13,GRAY,'middle')
    wrapped(d,20 if compact else 30,65,'Target +/-3 points: 62 complete; 78 recruited at 80% expected retention.',w-50,15,bold=True)
    save(d,'precision-plan','Precision versus sample size','Half-width is 1.960 times 12 divided by square root of n. At n 16, 64, 256, the half-widths are 5.88, 2.94, 1.47. The three-point target requires 62.',compact)


def mismatch(compact):
    p=DATA['model_check'];w=360 if compact else 720;h=800 if compact else 480
    d=frame(w,h,'The average residual can hide a curve','A constructed dataset: y = 1 + x squared.')
    for stage in range(2):
        area=(55,440 if stage==0 else 140,280,180) if compact else (65+stage*335,150,270,200)
        xx,yy=axes(d,area,(-3.2,3.2),(0,11) if stage==0 else (-5,6),[-3,0,3],[0,5,10] if stage==0 else [-4,0,4])
        text(d,area[0],area[1]+area[3]+25,'Observed and fitted' if stage==0 else 'Residuals of the straight line',16,bold=True)
        if stage==0:
            line(d,xx(-3),yy(5),xx(3),yy(5),GREEN,2)
            path(d,[(xx(i/30),yy(1+(i/30)**2)) for i in range(-90,91)],PURPLE,1.5)
        else:
            path(d,[(xx(x),yy(y-5)) for x,y in zip(p['x'],p['y'])],GRAY,1)
            line(d,xx(-3.2),yy(0),xx(3.2),yy(0),GREEN,1.5,[4,4])
        for x,y in zip(p['x'],p['y']):point(d,xx(x),yy(y if stage==0 else y-5))
        text(d,area[0]+area[2]/2,area[1]-43,'Predictor x',13,GRAY,'middle')
    y0=66 if compact else 80
    text(d,20 if compact else 30,y0,'Green: straight fit; purple: quadratic',14)
    wrapped(d,20 if compact else 30,y0-25,'Training RMSE of straight line: 3.46. Fresh MAE: straight 2.45; quadratic 0.20.',w-50,14)
    save(d,'model-mismatch','Observed fit and structured residuals','The straight fit predicts five. Residuals 5, 0, -3, -4, -3, 0, 5 have mean zero but show missing curvature. A quadratic reproduces the constructed training data.',compact)


def equivalence(compact):
    p=DATA['equivalence'];w=360 if compact else 720;h=530
    d=frame(w,h,'Equivalence needs meaningful bounds','Prespecified range: -2 to +2 points. All bars are 90% intervals.')
    x0=118 if compact else 230;right=w-25;xx=lambda v:x0+(v+4)/9*(right-x0)
    rect(d,xx(-2),143,xx(2)-xx(-2),255,'#e0eee5')
    for v in [-2,2]:line(d,xx(v),143,xx(v),398,PURPLE,1.3,[4,4])
    line(d,xx(0),143,xx(0),398,GRAY,1,[2,3])
    for i,c in enumerate(p['cases']):
        yy=355-i*88;color=GREEN if i==0 else GRAY if i==1 else PURPLE
        low=c['estimate']-p['z90']*c['se'];high=c['estimate']+p['z90']*c['se']
        wrapped(d,20,yy+8,'Beyond margin' if i==2 else c['label'],88 if compact else 190,13 if compact else 16,bold=True)
        text(d,20,yy-30,f"SE {c['se']:g}",13,GRAY)
        line(d,xx(low),yy,xx(high),yy,color,2.5);point(d,xx(c['estimate']),yy,color,4)
        if not compact:
            text(d,xx(low),yy+17,f'{low:.2f}',13,color,'middle');text(d,xx(high),yy+17,f'{high:.2f}',13,color,'middle')
    for v in [-4,-2,0,2,4]:text(d,xx(v),112,str(v),13,GRAY,'middle')
    text(d,(x0+right)/2,85,'New minus old, points',13,GRAY,'middle')
    wrapped(d,20 if compact else 30,49,'Same estimate, different precision: only the first interval lies wholly inside the bounds.',w-50,14,bold=True)
    save(d,'equivalence-bounds','Equivalent, inconclusive, and beyond the margin','Three known-SE Normal examples use 90 percent intervals and bounds minus 2 to plus 2. Intervals are -0.42 to 1.22; -2.89 to 3.69; 2.18 to 3.82.',compact)


def validation_error(indices):
    v=DATA['validation'];means={}
    for worker in set(v['worker']):
        ys=[v['outcome'][i] for i in indices if v['worker'][i]==worker]
        if ys:means[worker]=sum(ys)/len(ys)
    fallback=sum(v['outcome'][i] for i in indices)/len(indices)
    errors=[abs(v['outcome'][i]-means.get(v['worker'][i],fallback)) for i in range(8) if i not in indices]
    return sum(errors)/len(errors)


def validation(compact):
    p=DATA['validation'];w=360 if compact else 720;h=930 if compact else 790
    d=frame(w,h,'Keep the information boundary','The same eight records; one training-only prediction rule.')
    for j,(name,indices) in enumerate(p['train'].items()):
        base=(705-j*245) if compact else (575-j*210)
        text(d,20 if compact else 30,base+70,name,19,bold=True)
        text(d,20 if compact else 30,base+43,f'Mean absolute error: {validation_error(indices):.1f}',14,GRAY)
        left=73 if compact else 205;cell=65 if compact else 112
        for month in range(4):text(d,left+month*cell+cell/2-4,base+14,str(month+1) if compact else f'Month {month+1}',13,GRAY,'middle')
        for row,worker in enumerate(['A','B']):
            yy=base-25-row*38;text(d,25 if compact else 150,yy+10,worker,15,bold=True)
            for month in range(4):
                i=row*4+month;color=GREEN if i in indices else PURPLE
                rect(d,left+month*cell,yy,cell-8,30,color)
                text(d,left+month*cell+(cell-8)/2,yy+9,str(p['outcome'][i]),14,'#ffffff','middle')
        if compact:text(d,190,base-90,'Month of observation',13,GRAY,'middle')
    rect(d,20 if compact else 30,40,18,13,GREEN);text(d,46 if compact else 56,40,'Training',14)
    rect(d,185 if compact else 260,40,18,13,PURPLE);text(d,211 if compact else 286,40,'Held out',14)
    save(d,'validation-boundaries','Random, future, and new-worker partitions','Training partitions preserve eight worker-month records. Random-row MAE is 1, future-month MAE 2, and held-out-worker MAE 20. Each split evaluates a different information boundary.',compact)


def measurement(compact):
    p=DATA['measurement'];w=360 if compact else 720;h=1140 if compact else 720
    d=frame(w,h,'Repeatability is not calibration','Four readings per process; identical scales and a 100 g reference.')
    for j,(name,values) in enumerate(p['readings'].items()):
        area=(60,820-j*230,265,135) if compact else (65+(j%2)*335,405-(j//2)*245,265,135)
        xx,yy=axes(d,area,(1,4),(97.5,103),[1,2,3,4],[98,100,102])
        text(d,area[0],area[1]+area[3]+25,name,16,bold=True)
        line(d,xx(1),yy(100),xx(4),yy(100),GRAY,1,[4,4])
        color=PURPLE if j==1 else GREEN
        path(d,[(xx(i+1),yy(v)) for i,v in enumerate(values)],color)
        for i,v in enumerate(values):point(d,xx(i+1),yy(v),color)
        text(d,area[0]+area[2]/2,area[1]-43,'Reading order',13,GRAY,'middle')
    wrapped(d,20 if compact else 30,57,'Biased mean 102.0 g -> calibrated mean 100.0 g. Combined standard uncertainty: 0.31 g.',w-50,14,bold=True)
    save(d,'measurement-processes','Stable, biased, noisy, and drifting measurements','The same 100 g reference and vertical scale distinguish repeatability, offset, scatter, and drift. An independent 2 g correction gives a corrected mean of 100 g with combined standard uncertainty about 0.31 g.',compact)


def sampling(compact):
    p=DATA['sampling'];w=360 if compact else 720;h=630
    d=frame(w,h,'Trace who reaches the average','Green: new customers. Purple: established customers.')
    for j,(label,values) in enumerate([('Population',p['population']),('Invited',p['invited']),('Responded',p['responded'])]):
        yy=440-j*100
        left=20 if compact else 240;totalwidth=w-40 if compact else 440
        text(d,20 if compact else 30,yy+43 if compact else yy+12,f'{label}: {sum(values):,}',16,bold=True)
        fraction=values[0]/sum(values);split=totalwidth*fraction
        rect(d,left,yy,split,30,GREEN);rect(d,left+split,yy,totalwidth-split,30,PURPLE)
        text(d,left+split/2,yy+9,f'{100*fraction:.0f}%',14,'#ffffff','middle')
        text(d,left+split+(totalwidth-split)/2,yy+9,f'{100*(1-fraction):.0f}%',14,'#ffffff','middle')
    observed=sum(n*m for n,m in zip(p['responded'],p['rating_mean']))/sum(p['responded'])
    weighted=sum(n*m for n,m in zip(p['population'],p['rating_mean']))/sum(p['population'])
    text(d,20 if compact else 30,155,f'Respondent mean: {observed:.1f}',21,bold=True)
    text(d,20 if compact else 30,117,f'Population-weighted mean: {weighted:.1f}',21,bold=True)
    wrapped(d,20 if compact else 30,68,'Weighting assumes respondents represent their population group. Missing experiences remain an assumption.',w-50,14)
    save(d,'sampling-composition','Population composition, responses, and weighted means','New customers are 20 percent of the population, 50 percent of invitations, and 80 percent of responses. Respondent average 4.2; population-standardized average 3.3 under within-group assumptions.',compact)


for compact in [False, True]:
    for draw in [beliefs, precision, mismatch, equivalence, validation, measurement, sampling]:
        draw(compact)
manifest=ROOT/'content/assets/manifest.json'
entries=json.loads(manifest.read_text());entries.update(DIMENSIONS)
manifest.write_text(json.dumps(entries,indent=2)+'\n')
print(f'Rendered {len(DIMENSIONS)} SVGs for seven illustrated cases.')
