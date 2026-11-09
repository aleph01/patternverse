"""Render four modeling and design teaching figures and their compact companions.

Requires ReportLab. Inputs are the fictional statistics-model-examples.json.
Run from any directory; assets and dimensions are written relative to this file.
"""
import json
import re
from math import sqrt, exp, pi, factorial
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.graphics import renderSVG
from reportlab.graphics.shapes import Drawing, Line, String, Rect, Circle, PolyLine
from reportlab.lib.colors import toColor
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/assets/statistics'
DATA = json.loads(Path(__file__).with_name('statistics-model-examples.json').read_text())
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
    svg = svg[svg.index('<svg'):]
    # ReportLab closes two-point paths; keep them open so dashes do not overdraw themselves.
    svg = re.sub(r'(<path d="M [^"ML]* L [^"ML]*) Z"', r'\1"', svg)
    i = svg.index('>')+1
    svg = svg[:i]+'<title>'+escape(title)+'</title><desc>'+escape(desc)+'</desc>'+svg[i:]
    filename = name + ('-mobile' if compact else '') + '.svg'
    (OUT/filename).write_text(svg)
    DIMENSIONS['statistics/'+filename] = {'width': int(d.width), 'height': int(d.height)}


def mean(values):
    return sum(values)/len(values)


def sample_variance(values):
    return sum((v-mean(values))**2 for v in values)/(len(values)-1)


def absolute_effects(compact):
    p=DATA['absolute_effects'];w=360 if compact else 720;h=920 if compact else 800
    rates=[e/n for e,n in zip(p['events'],p['group_n'])];difference=rates[1]-rates[0]
    se=sqrt(sum(rate*(1-rate)/n for rate,n in zip(rates,p['group_n'])))
    low,high=[(difference+sign*p['z95']*se)*p['display_denominator'] for sign in [-1,1]]
    d=frame(w,h,'One extra completion per 1,000','Same 90-day horizon. Standardized rates: 2 versus 3 per 1,000.')
    left=20 if compact else 30;grid_left=35 if compact else 60;step=(w-2*grid_left)/50
    for i,(rate,label) in enumerate(zip(rates,['Current message','New message'])):
        top=(700-i*205) if compact else (630-i*190)
        text(d,left,top,label,17,bold=True)
        text(d,left,top-25,f'{p["events"][i]:,} / {p["group_n"][i]:,} = {rate*1000:g} / 1,000',15,GREEN if i else PURPLE)
        for dot in range(1000):
            point(d,grid_left+(dot%50)*step,top-48-(dot//50)*6,(PURPLE if i==0 else GREEN) if dot<round(rate*1000) else '#d2d2c7',1.65 if not compact else 1.45)
    text(d,left,265 if compact else 235,'Each dot: 1 customer in a group of 1,000.',13,GRAY)
    # This interval belongs to the difference, not to either dot array.
    x0=60 if compact else 90;right=w-30;xx=lambda v:x0+(v+.5)/2.5*(right-x0);y=160 if compact else 145
    text(d,left,y+60,'Rate difference per 1,000',17,bold=True)
    line(d,xx(0),y-18,xx(0),y+25,GRAY,1,[3,3]);line(d,xx(low),y,xx(high),y,GREEN,3);point(d,xx(1),y,GREEN,5)
    text(d,xx(low),y+15,f'{low:.2f}',14,GREEN,'middle');text(d,xx(high),y+15,f'{high:.2f}',14,GREEN,'middle')
    for v in [0,1,2]:text(d,xx(v),y-38,str(v),13,GRAY,'middle')
    wrapped(d,left,80 if compact else 70,'Absolute: +0.1 percentage points. Relative: +50%.',w-50,15,bold=True)
    wrapped(d,left,35,'Bar: approximate 95% CI for the difference; not future-count variation.',w-50,13)
    save(d,'absolute-effects','Absolute and relative effects with a common denominator','In fictional independent groups of 100000, 200 versus 300 complete a referral within 90 days. Two standardized 1000-dot arrays show rates two and three per thousand. Difference one per thousand, 0.1 percentage points, relative increase 50 percent. The approximate Normal 95 percent confidence interval for the difference is 0.56 to 1.44 per thousand.',compact)


def panel(d,area,title,subtitle,xr,yr,xticks,yticks,xlabel):
    text(d,area[0],area[1]+area[3]+31,title,16,bold=True)
    text(d,area[0],area[1]+area[3]+9,subtitle,13,GRAY)
    xx,yy=axes(d,area,xr,yr,xticks,yticks)
    text(d,area[0]+area[2]/2,area[1]-44,xlabel,13,GRAY,'middle')
    return xx,yy


def outcomes(compact):
    p=DATA['outcomes'];w=360 if compact else 720;h=1220 if compact else 780
    d=frame(w,h,'Match the outcome, then the model','Separate examples: probabilities, count masses, densities and exposure.')
    areas=[(60,870,270,160),(60,610,270,150),(60,350,270,150)] if compact else [(60,450,280,175),(405,450,280,175),(60,165,280,175)]
    xx,yy=panel(d,areas[0],'Binary: observed 0 or 1','Curve: modeled probability',(-4,4),(0,1),[-4,0,4],[0,.5,1],'Linear predictor eta')
    path(d,[(xx(i/25),yy(1/(1+exp(-i/25)))) for i in range(-100,101)],GREEN,2.5)
    xx,yy=panel(d,areas[1],'Count: 0, 1, 2, ...','Poisson mean 2; probability mass',(-.5,7.5),(0,.31),[0,2,4,6],[0,.15,.3],'Observed count')
    for k in range(8):
        mass=exp(-p['poisson_mean'])*p['poisson_mean']**k/factorial(k)
        rect(d,xx(k)-8,yy(0),16,yy(mass)-yy(0),PURPLE)
    xx,yy=panel(d,areas[2],'Continuous: signed error','Normal mean 0, SD 1; density',(-3.2,3.2),(0,.43),[-3,0,3],[0,.2,.4],'Centered measurement')
    path(d,[(xx(i/30),yy(exp(-.5*(i/30)**2)/sqrt(2*pi))) for i in range(-96,97)],GREEN,2.5)
    left=20 if compact else 405;top=255 if compact else 370;bar_left=left+30;bar_width=270 if compact else 235
    text(d,left,top,'Exposure changes the comparison',16,bold=True)
    text(d,left,top-24,'Complaints per 1,000 transactions',13,GRAY)
    for i,store in enumerate(p['stores']):
        y=top-82-i*66;rate=p['complaints'][i]/p['transactions'][i]*1000
        text(d,left,y+4,store,15,bold=True)
        rect(d,bar_left,y,bar_width*rate/25,16,GREEN if i==0 else PURPLE)
        text(d,bar_left+bar_width*rate/25+7,y+2,f'{rate:g}',14)
        text(d,bar_left,y-21,f'{p["complaints"][i]} / {p["transactions"][i]:,} transactions',13,GRAY)
    wrapped(d,20 if compact else 30,42 if compact else 55,'Vertical scales differ: probability, mass and density are not interchangeable.',w-50,14)
    save(d,'outcome-support','Outcome support, scale, and transaction exposure','A logistic probability remains between zero and one; a Poisson probability mass function with mean two is defined on nonnegative integers; a Normal density for signed continuous errors has a different vertical meaning. The final panel shows store A 20 complaints in 1000 transactions, or 20 per thousand, and B 30 in 3000, or ten per thousand. Distributions are separate teaching examples.',compact)


def ridge_slopes(p,lam):
    # Verify the special design that makes this closed form legitimate.
    x=p['training_x'];y=p['training_y'];n=len(x)
    gram=[[sum(row[j]*row[k] for row in x) for k in range(2)] for j in range(2)]
    if gram!=[[4,0],[0,4]] or mean(y)!=0 or any(sum(row[j] for row in x)!=0 for j in range(2)):
        raise ValueError('Ridge teaching formula requires centered orthogonal columns with Gram matrix 4 I')
    return [sum(row[j]*target for row,target in zip(x,y))/(4+lam) for j in range(2)]


def mse(x,y,beta):
    return mean([(sum(v*b for v,b in zip(row,beta))-target)**2 for row,target in zip(x,y)])


def regularization(compact):
    p=DATA['regularization'];w=360 if compact else 720;h=960 if compact else 650
    d=frame(w,h,'Shrink the fit; check what improves','Constructed cases. Loss: SSE + lambda times squared slopes.')
    areas=[(55,560,275,225),(55,200,275,225)] if compact else [(65,230,270,245),(405,230,275,245)]
    for j,area in enumerate(areas):
        xx,yy=axes(d,area,(0,36),(0,3.3) if j==0 else (0,12),[0,12,24,36],[0,1,2,3] if j==0 else [0,4,8,12])
        text(d,area[0],area[1]+area[3]+28,'Fitted slopes' if j==0 else 'Mean squared error',17,bold=True)
        line(d,xx(12),yy(0),xx(12),yy(3.3 if j==0 else 12),GRAY,1,[3,3])
        if j==0:
            for coef,color in [(0,GREEN),(1,PURPLE)]:
                path(d,[(xx(lam/4),yy(ridge_slopes(p,lam/4)[coef])) for lam in range(145)],color,2.5)
                for lam in p['lambdas']:point(d,xx(lam),yy(ridge_slopes(p,lam)[coef]),color,4)
        else:
            for which,color in [('training',GRAY),('validation',GREEN)]:
                path(d,[(xx(lam/4),yy(mse(p[which+'_x'],p[which+'_y'],ridge_slopes(p,lam/4)))) for lam in range(145)],color,2.5)
                for lam in p['lambdas']:point(d,xx(lam),yy(mse(p[which+'_x'],p[which+'_y'],ridge_slopes(p,lam))),color,4)
            line(d,xx(0),yy(4),xx(36),yy(4),PURPLE,1.5,[5,4])
        text(d,area[0]+area[2]/2,area[1]-43,'Penalty lambda',13,GRAY,'middle')
    left=20 if compact else 30;y=490 if compact else 157
    text(d,left,y,'Green: b1    Purple: b2',14)
    text(d,left,132 if compact else 120,'Error: gray training; green validation',14)
    text(d,left,108 if compact else 96,'Dashed purple: predict-zero baseline MSE 4',13,PURPLE)
    wrapped(d,left,74 if compact else 60,'Grid choice: lambda 12; validation MSE 2.8125. Tuning data are not a final test.',w-50,15,bold=True)
    save(d,'regularization-tradeoff','Ridge shrinkage and training-validation error','For the centered orthogonal design with X transpose X equal to four I, slopes two and three shrink by four divided by four plus lambda. At penalties zero, four, twelve, thirty-six, validation MSE is nine,3.25,2.8125,3.33. Training error rises; strong shrinkage does not guarantee better validation. Purple dashed error line is the predict-zero baseline four. Continuous curves illustrate the constructed loss; the tuning grid contains four values.',compact)


def blocking(compact):
    p=DATA['blocking'];differences=[b-a for a,b in zip(p['a'],p['b'])];se=sqrt(sample_variance(differences)/len(differences))
    w=360 if compact else 720;h=990 if compact else 650
    d=frame(w,h,'Put both settings in every batch','Four predeclared material batches; one fair coin assigns A/B within each.')
    left=20 if compact else 30;top=810 if compact else 510
    text(d,left,top,'One realized random allocation',17,bold=True)
    text(d,100 if compact else 110,top-28,'Position 1',13,GRAY)
    text(d,195 if compact else 200,top-28,'Position 2',13,GRAY)
    text(d,295,top-28,'B - A',13,GRAY,'middle')
    for i,batch in enumerate(p['batches']):
        y=top-85-i*60;text(d,left,y+10,f'Batch {batch}',14,bold=True)
        for j,treatment in enumerate(p['position_assignment'][i]):
            x=(90 if compact else 100)+j*95;value=p['a' if treatment=='A' else 'b'][i]
            rect(d,x,y,82,32,GREEN if treatment=='A' else PURPLE)
            text(d,x+41,y+10,f'{treatment}: {value}',14,'#ffffff','middle',True)
        text(d,295,y+10,f'+{differences[i]}',15,GRAY,'middle')
    legend=top-(295 if compact else 315)
    text(d,left,legend,'Green A / Purple B; outcomes shown in boxes.',13,GRAY)
    area=(55,225,275,230) if compact else (425,210,265,270)
    xx,yy=axes(d,area,(.8,4.2),(40,120),[1,2,3,4],[40,80,120])
    text(d,area[0],area[1]+area[3]+28,'Batch shifts and setting contrasts',16,bold=True)
    for key,color in [('a',GREEN),('b',PURPLE)]:
        path(d,[(xx(batch),yy(value)) for batch,value in zip(p['batches'],p[key])],color,2)
        for batch,value in zip(p['batches'],p[key]):point(d,xx(batch),yy(value),color,4)
    text(d,area[0]+area[2]/2,area[1]-44,'Material batch',13,GRAY,'middle')
    text(d,left,125 if compact else 120,f'Mean within-batch difference: +{mean(differences):g}',17,bold=True)
    text(d,left,95 if compact else 88,f'Estimated SE from block differences: {se:.2f}',15,GREEN)
    wrapped(d,left,55 if compact else 50,'Only four blocks: the example explains the design, not a guarantee of precision.',w-50,14)
    save(d,'blocked-assignment','Randomized positions and within-batch comparisons','Each of four blocks assigns A and B to two positions with a fair coin. Scores A 50,70,90,110 and B 54,73,95,114 give within-block differences four,three,five,four, mean four and estimated SE 0.41 using independent block differences. One allocation A B, B A, A B, B A is illustrated; positions are not assigned by deterministic alternation.',compact)


if __name__ == '__main__':
    for compact in [False,True]:
        for draw in [absolute_effects,outcomes,regularization,blocking]:draw(compact)
    manifest=ROOT/'content/assets/manifest.json'
    dimensions=json.loads(manifest.read_text());dimensions.update(DIMENSIONS)
    manifest.write_text(json.dumps(dimensions,indent=2)+'\n')
    print(f'Rendered {len(DIMENSIONS)} assets; orthogonal ridge design verified.')
