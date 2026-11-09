"""Render the final six statistics teaching figures and their compact companions.

Requires ReportLab. Inputs are the fictional statistics-final-examples.json.
Run from any directory; assets and dimensions are written relative to this file.
"""
import json
import re
from math import sqrt
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.graphics import renderSVG
from reportlab.graphics.shapes import Drawing, Line, String, Rect, Circle, PolyLine
from reportlab.lib.colors import toColor
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/assets/statistics'
DATA = json.loads(Path(__file__).with_name('statistics-final-examples.json').read_text())
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


def target(compact):
    p=DATA['target'];w=360 if compact else 720;h=900 if compact else 700;left=20 if compact else 30
    d=frame(w,h,'Define the answer before the analysis','New paid subscribers; assignment at signup; complete 90-day outcomes.')
    y=700 if compact else 535
    wrapped(d,left,y,'Target: day-90 paid probability, new message minus current message.',w-50,18,bold=True)
    for i,name in enumerate(['Current','New']):
        base=y-115-i*100 if compact else y-100-i*90
        rate=p['paid_day90'][i]/p['assigned'][i]
        text(d,left,base+35,f'{name}: {p["assigned"][i]:,} assigned',16,bold=True)
        rect(d,left,base,(w-2*left)*rate,22,PURPLE if i==0 else GREEN)
        text(d,left,base-25,f'{p["paid_day90"][i]} paid at day 90: {rate:.0%}',15,PURPLE if i==0 else GREEN)
    y=320 if compact else 235
    cases=[('Stated target: paid at day 90',5,GREEN),('Different outcome: active day 7',10,GRAY),('Selected new openers vs all current',20,PURPLE)]
    for i,(label,gap,color) in enumerate(cases):
        base=y-i*(75 if compact else 58)
        text(d,left,base,label,15,bold=True)
        text(d,left,base-24,f'+{gap} percentage points',16,color)
    wrapped(d,left,65 if compact else 42,'The opener comparison selects on behavior after assignment. It does not preserve the original target.',w-50,14)
    save(d,'defined-target','A stated estimand and the consequences of changing it','Two randomized groups of 1000 yield paid day-90 counts 600 and 650, difference five percentage points. Day-seven activity 700 versus 800 gives a different ten-point contrast. Selecting 400 retained among 500 new-message openers gives 80 percent, which compared with all current customers gives a misleading twenty-point contrast for a changed population.',compact)


def extremes(compact):
    p=DATA['extremes'];values=p['orders'];total=sum(values);average=mean(values);median=(sorted(values)[4]+sorted(values)[5])/2
    w=360 if compact else 720;h=830 if compact else 670;left=20 if compact else 30
    d=frame(w,h,'Investigate influence before deleting','Ten completed paid orders; the largest value is not automatically an error.')
    area=(60,395,270,240) if compact else (65,290,625,230)
    xx,yy=axes(d,area,(.5,10.5),(0,310),[1,5,10],[0,100,200,300])
    for i,value in enumerate(values):rect(d,xx(i+1)-8,yy(0),16,yy(value)-yy(0),PURPLE if i==9 else GREEN)
    text(d,area[0],area[1]+area[3]+25,'Order value, currency units',15,GRAY)
    text(d,xx(10)-8,yy(values[-1])+12,str(values[-1]),15,PURPLE,'end')
    text(d,w/2,area[1]-45,'Order (sorted for display)',13,GRAY,'middle')
    text(d,left,285 if compact else 205,f'All 10: total {total}; mean {average:.2f}',17,bold=True)
    text(d,left,255 if compact else 176,f'Median {median:g}; largest share {values[-1]/total:.2%}',15,PURPLE)
    rows=[('Keep all 10',average,GREEN),('Omit largest; n = 9',mean(values[:-1]),GRAY)]
    for i,(label,value,color) in enumerate(rows):
        y=(180-i*60) if compact else (115-i*45);text(d,left,y+21,label,14,bold=True)
        rect(d,left,y,(w-2*left-65)*value/60,13,color);text(d,left+(w-2*left-65)*value/60+8,y+1,f'{value:.2f}',14,color)
    wrapped(d,left,45 if compact else 27,'Correct 280 to 28 only if source records verify the error. Correction and omission use different records.',w-50,13)
    save(d,'extremes-influence','An influential order, its contribution, and two different data decisions','Orders 20 through 36 by twos plus 280 total 532, mean 53.20, median 29. The largest contributes 52.63 percent of revenue. Omitting it gives nine records, total 252, mean 28. A separate verified correction to 28 gives ten records, total 280, mean 28. The identical means do not justify the same workflow.',compact)


def sensitivity(compact):
    p=DATA['sensitivity'];w=360 if compact else 720;h=740 if compact else 580;left=20 if compact else 30
    d=frame(w,h,'How much bias changes the conclusion?','Observed contrast +7; known SE 1. Each scenario fixes an additive bias b.')
    area=(60,290,270,255) if compact else (65,210,625,230)
    xx,yy=axes(d,area,(0,10),(-5,10),[0,2,5,7,9],[-4,0,4,8])
    half=p['z95']*p['known_se']
    for offset,color,width in [(half,GRAY,1),(-half,GRAY,1),(0,GREEN,2.5)]:
        path(d,[(xx(0),yy(p['estimate']+offset)),(xx(10),yy(p['estimate']-10+offset))],color,width)
    line(d,xx(0),yy(0),xx(10),yy(0),PURPLE,1.5,[4,4])
    point(d,xx(7),yy(0),PURPLE,5);text(d,xx(7)+9,yy(0)+12,'b = 7',14,PURPLE)
    point(d,xx(p['estimate']-half),yy(0),GRAY,4)
    text(d,area[0],area[1]+area[3]+22,'Bias-adjusted contrast, points',15,GRAY)
    text(d,w/2,area[1]-45,'Assumed positive bias b, points',13,GRAY,'middle')
    y=190 if compact else 120
    text(d,left,y,'Green: 7 - b; gray: conditional 95% limits',14)
    wrapped(d,left,y-40,'Bias = 10 x prevalence difference. At d = 0.70, bias is 7.',w-50,15,bold=True)
    wrapped(d,left,62 if compact else 35,'The lower limit reaches zero at b = 5.04. These lines do not include uncertainty about b.',w-50,14)
    save(d,'causal-sensitivity','Sensitivity to a fixed additive bias','The adjusted estimate is seven minus b, and conditional interval endpoints are seven minus b plus or minus 1.959964. Point estimate crosses zero at b seven; lower endpoint at b 5.04. A ten-point outcome difference associated with a binary baseline characteristic and prevalence gap 0.7 supplies bias seven. Bias assumptions are not estimated by the chart.',compact)


def confirmation(compact):
    p=DATA['confirmation'];w=360 if compact else 720;h=980 if compact else 720;left=20 if compact else 30
    d=frame(w,h,'A selected finding needs fresh evidence','Exploration proposes a claim; a locked analysis evaluates it on new cases.')
    top=790 if compact else 565
    text(d,left,top,f'{p["searches"]} explored subgroup claims',17,bold=True)
    cols=5 if compact else 10;cell=58 if compact else 62
    for i in range(p['searches']):rect(d,left+(i%cols)*cell,top-35-(i//cols)*29,cell-9,18,PURPLE if i==16 else '#d2d2c7')
    y=top-165 if compact else top-115
    text(d,left,y,'Lock subgroup, outcome, analysis and stopping.',14,bold=True)
    text(d,left,y-29,'Then evaluate the claim using fresh evidence.',14,GREEN)
    x0=70 if compact else 140;right=w-30;xx=lambda v:x0+(v+2)/17*(right-x0)
    base=430 if compact else 320
    for value,color in [(0,GRAY),(p['meaningful_effect'],PURPLE)]:line(d,xx(value),base-180,xx(value),base+12,color,1,[4,4])
    for i,(key,label,color) in enumerate([('discovery','Selected exploration',GRAY),('fresh','Fresh, prespecified',GREEN)]):
        r=p[key];yy=base-i*115;half=p['z95']*r['known_se'];lo=r['estimate']-half;hi=r['estimate']+half
        rect(d,left,yy+28,w-left-20,28,PAPER)
        text(d,left,yy+36,label,16,bold=True)
        line(d,xx(lo),yy,xx(hi),yy,color,2.5);point(d,xx(r['estimate']),yy,color,5)
        text(d,xx(lo),yy+13,f'{lo:.2f}',13,color,'middle');text(d,xx(hi),yy+13,f'{hi:.2f}',13,color,'middle')
    for value in [0,5,10,15]:text(d,xx(value),base-205,str(value),13,GRAY,'middle')
    text(d,w/2,base-234,'Estimated difference, performance points',13,GRAY,'middle')
    y=135 if compact else 58
    wrapped(d,left,y,'References: zero and a +2 practical threshold. Exploration interval is unadjusted for selection.',w-50,14)
    if compact:wrapped(d,left,63,'20 independent null tests at 5%: 64.15% chance of at least one false positive.',w-50,14)
    save(d,'fresh-confirmation','Exploration, a locked claim, and a fresh interval','Twenty candidates lead to one chosen claim, then a prespecified fresh check. Selected estimate eight SE three has an unadjusted Normal 95 percent interval 2.12 to 13.88. Fresh estimate three SE two has interval -0.92 to 6.92, crossing zero and the +2 practical threshold. The separate independent-null-test calculation is 64.15 percent, not the probability this selected claim is false.',compact)


def decision(compact):
    p=DATA['decision'];w=360 if compact else 720;h=850 if compact else 640;left=20 if compact else 30
    d=frame(w,h,'Let consequences set the threshold','Benefit 50 if the issue is present; intervention cost paid whenever acting.')
    area=(60,425,270,225) if compact else (65,275,625,230)
    xx,yy=axes(d,area,(0,1),(-20,45),[0,.2,.4,.6,.8,1],[-20,0,20,40])
    line(d,xx(0),yy(0),xx(1),yy(0),GRAY,1.5,[4,4])
    for cost,color in [(p['action_cost'],GREEN),(p['alternative_action_cost'],PURPLE)]:
        line(d,xx(0),yy(-cost),xx(1),yy(p['benefit_if_present']-cost),color,2.5)
        point(d,xx(cost/p['benefit_if_present']),yy(0),color,4)
        point(d,xx(p['probability']),yy(p['benefit_if_present']*p['probability']-cost),color,4)
    text(d,area[0],area[1]+area[3]+23,'Expected net benefit, utility units',15,GRAY)
    text(d,w/2,area[1]-45,'Probability the issue is present',13,GRAY,'middle')
    y=325 if compact else 185
    text(d,left,y,'Green: cost 10; threshold 0.20',15,GREEN)
    text(d,left,y-26,'Purple: cost 20; threshold 0.40',15,PURPLE)
    text(d,left,y-52,'Dashed: wait, net benefit 0',14,GRAY)
    y=190 if compact else 92
    text(d,left,y,'At p = 0.30, with cost 10:',16,bold=True)
    text(d,left,y-28,'Act now: 5    Check first: 6.90',15,GREEN)
    text(d,left,y-53,'Perfect information: 12, before its cost',14)
    wrapped(d,left,70 if compact else 22,'The check costs 2; sensitivity 0.80, specificity 0.90. Utilities and error rates are assumptions.',w-50,13)
    save(d,'decision-consequences','Action thresholds and the conditional value of information','Expected net benefit of acting is fifty times p minus cost; cost ten crosses zero at 0.2, cost twenty at 0.4. At p 0.3 with cost ten, act-now expected benefit is five. A check with sensitivity 0.8, specificity 0.9 and cost two yields expected net benefit 6.9; perfect information gives twelve before its cost. These are conditional utilities, not guaranteed outcomes.',compact)


def arrow(d,x1,y1,x2,y2,color=INK,width=1.6,dash=None):
    line(d,x1,y1,x2,y2,color,width,dash)
    length=sqrt((x2-x1)**2+(y2-y1)**2);ux=(x2-x1)/length;uy=(y2-y1)/length
    for side in [-1,1]:line(d,x2,y2,x2-7*ux+side*3*uy,y2-7*uy-side*3*ux,color,width)


def node(d,cx,cy,width,height,title,subtitle,color):
    rect(d,cx-width/2,cy-height/2,width,height,'#e0eee5' if color==GREEN else '#eee8f6' if color==PURPLE else '#eeeeea')
    text(d,cx,cy+5,title,15,color,'middle',True);text(d,cx,cy-16,subtitle,13,GRAY,'middle')


def instrument(compact):
    p=DATA['instrument'];w=360 if compact else 720;h=980 if compact else 850;left=20 if compact else 30;red='#ad503a'
    d=frame(w,h,'Trace the instrument through participation','Random invitation Z; attendance D; performance Y; motivation U.')
    if compact:
        node(d,180,730,150,60,'Invitation Z','randomized',GREEN)
        node(d,77,570,114,60,'Motivation U','unmeasured',GRAY)
        node(d,250,570,150,60,'Attendance D','received',PURPLE)
        node(d,250,430,150,60,'Performance Y','outcome',INK)
        arrow(d,180,700,250,600,GREEN);arrow(d,134,570,175,570,GRAY);arrow(d,250,540,250,460,PURPLE);arrow(d,77,540,175,430,GRAY)
        line(d,255,730,340,730,red,1.5,[4,4]);line(d,340,730,340,430,red,1.5,[4,4]);arrow(d,340,430,325,430,red,1.5,[4,4])
        wrapped(d,left,355,'Dashed route: any direct invitation effect threatens exclusion.',w-50,14,red)
    else:
        node(d,110,535,140,60,'Invitation Z','randomized',GREEN)
        node(d,350,535,140,60,'Attendance D','received',PURPLE)
        node(d,590,535,140,60,'Performance Y','outcome',INK)
        node(d,350,680,140,60,'Motivation U','unmeasured',GRAY)
        arrow(d,180,535,280,535,GREEN);arrow(d,420,535,520,535,PURPLE);arrow(d,350,650,350,565,GRAY);arrow(d,420,680,590,565,GRAY)
        line(d,110,505,110,430,red,1.5,[4,4]);line(d,110,430,590,430,red,1.5,[4,4]);arrow(d,590,430,590,505,red,1.5,[4,4])
        text(d,left,390,'Dashed route: a direct invitation effect threatens exclusion.',15,red)
    first=p['attended'][1]/p['group_n'][1]-p['attended'][0]/p['group_n'][0];reduced=p['outcome_mean'][1]-p['outcome_mean'][0]
    y=275 if compact else 285
    text(d,left,y,'Attendance: 60% - 20% = 0.40',16,PURPLE)
    text(d,left,y-40,'Outcome: 54 - 50 = 4 points',16)
    text(d,left,y-95,f'IV ratio: 4 / 0.40 = {reduced/first:g} points',20,GREEN,bold=True)
    wrapped(d,left,105 if compact else 115,'Local interpretation: people whose participation changes with invitation. The assumptions do the identifying work.',w-50,14)
    save(d,'instrument-pathways','Instrumental-variable pathways and a local ratio','Random invitation affects attendance, attendance affects performance, and unmeasured motivation affects both attendance and performance. A dashed direct invitation-to-performance route would threaten exclusion. Attendance differs 60 versus 20 percent and performance means 54 versus 50, so the Wald ratio is four divided by 0.40, ten points. Local interpretation needs the stated assumptions.',compact)


if __name__ == '__main__':
    for compact in [False,True]:
        for draw in [target,extremes,sensitivity,confirmation,decision,instrument]:draw(compact)
    manifest=ROOT/'content/assets/manifest.json'
    dimensions=json.loads(manifest.read_text());dimensions.update(DIMENSIONS)
    manifest.write_text(json.dumps(dimensions,indent=2)+'\n')
    print(f'Rendered {len(DIMENSIONS)} assets.')
