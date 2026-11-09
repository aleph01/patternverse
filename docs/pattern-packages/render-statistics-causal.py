"""Render four causal-design teaching figures and their compact companions.

Requires ReportLab. Inputs are the fictional statistics-causal-examples.json.
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
DATA = json.loads(Path(__file__).with_name('statistics-causal-examples.json').read_text())
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


def fit_line(xs, ys, cutoff):
    """Return a centered intercept and slope; the intercept is the cutoff limit."""
    zs=[x-cutoff for x in xs];zbar=sum(zs)/len(zs);ybar=sum(ys)/len(ys)
    slope=sum((z-zbar)*(y-ybar) for z,y in zip(zs,ys))/sum((z-zbar)**2 for z in zs)
    return ybar-slope*zbar,slope


def synthetic_fit(p):
    """Two-donor convex least squares using only the declared pre-periods."""
    a,b=p['donors'].values();n=p['pre_periods']
    numerator=sum((a[i]-b[i])*(p['treated'][i]-b[i]) for i in range(n))
    denominator=sum((a[i]-b[i])**2 for i in range(n))
    weight=max(0,min(1,numerator/denominator))
    if abs(weight-p['weights'][0])>1e-12 or abs(1-weight-p['weights'][1])>1e-12:
        raise ValueError('Recorded weights differ from pre-period-only fit')
    return [weight*x+(1-weight)*y for x,y in zip(a,b)]


def timing(compact):
    p=DATA['timing'];w=360 if compact else 720;h=1000 if compact else 800
    d=frame(w,h,'Start both groups at the same time','A badge requires six active months. Complete records for 100 customers.')
    left=20 if compact else 30;axis_left=40 if compact else 315;axis_right=w-30
    xx=lambda month:axis_left+(axis_right-axis_left)*month/p['end_month']
    never=p['start_n']-p['badge_n'];early=p['early_cancellations'];late=p['no_badge_late_cancellations']
    bad=p['badge_late_cancellations']/p['badge_n']-(early+late)/never
    good=p['badge_late_cancellations']/p['badge_n']-late/p['no_badge_survivors']
    for aligned,top in [(False,845 if compact else 655),(True,505 if compact else 380)]:
        text(d,left,top,'Aligned at month 6' if aligned else 'Groups defined by a future badge',18,bold=True)
        wrapped(d,left,top-28,'Eligibility, group labels and follow-up start together.' if aligned else 'Labels learned at month 6; outcomes counted from month 0.',w-50,13,GRAY)
        for i,label in enumerate(['Badge','No badge']):
            y=top-(95+i*95) if compact else top-(75+i*60)
            count=p['badge_n'] if i==0 else p['no_badge_survivors'] if aligned else never
            canceled=p['badge_late_cancellations'] if i==0 else late if aligned else early+late
            value=f'{label}: {canceled} / {count} = {100*canceled/count:.0f}%'
            text(d,left,y+30 if compact else y+5,value,15,bold=True)
            start=p['landmark_month'] if aligned else 0
            if not aligned:
                rect(d,xx(0),y+5,xx(6)-xx(0),21,'#eee8f6' if i==0 else '#eeeeea')
                text(d,(xx(0)+xx(6))/2,y+11,'Must stay active' if i==0 else f'{early} cancel early',13,PURPLE if i==0 else GRAY,'middle')
            line(d,xx(start),y,xx(12),y,GREEN,2)
            if not aligned:
                # The required-survival span is a condition of the retrospective label.
                line(d,xx(0),y,xx(6),y,PURPLE if i==0 else GRAY,2)
            for month in ([6,12] if aligned else [0,6,12]):
                line(d,xx(month),y-5,xx(month),y+7,GRAY,1)
                text(d,xx(month),y-24,str(month),13,GRAY,'middle')
            text(d,(xx(6)+xx(12))/2,y+10 if aligned else y+11,f'{p["badge_late_cancellations"] if i==0 else late} cancel later',13,GREEN,'middle')
        result_y=top-255 if compact else top-195
        text(d,left,result_y,f'Observed gap: {100*(good if aligned else bad):.0f} percentage points',17,GREEN if aligned else PURPLE,bold=True)
        text(d,left,result_y-24,'60 eligible survivors; follow months 6-12.' if aligned else 'All 40 early events enter the no-badge group.',13,GRAY)
    wrapped(d,left,125 if compact else 95,'Month numbers are time since account creation. The aligned comparison changes the population and period.',w-50,14)
    wrapped(d,left,65 if compact else 50,'Equal observed rates do not establish no causal effect.',w-50,14,bold=True)
    save(d,'aligned-time-zero','Future-defined groups versus aligned time zero','Of 100 customers, 40 cancel before month six. Among 60 survivors, 20 receive a badge and four later cancel, while eight of 40 others cancel. Retrospective groups have 20 versus 60 percent cancellation; the month-six-survivor comparison has 20 versus 20 percent. The population changes and confounding can remain.',compact)


def overlap(compact):
    p=DATA['overlap'];w=360 if compact else 720;h=850 if compact else 670
    d=frame(w,h,'Where do counterparts exist?','Premium and standard service by pretreatment account tier.')
    area=(60,400,w-90,240) if compact else (65,300,w-95,230)
    xx,yy=axes(d,area,(-.5,2.5),(0,47),[],[0,20,40])
    for i in range(3):
        rect(d,xx(i-.5),yy(0),xx(i+.5)-xx(i-.5),yy(47)-yy(0),'#e0eee5' if i==p['supported_tier'] else '#eeeeea')
    # Redraw horizontal guides over the support shading.
    for value in [0,20,40]:line(d,xx(-.5),yy(value),xx(2.5),yy(value),'#deded5',.7)
    bw=18 if compact else 35;offset=12 if compact else 23
    for i,tier in enumerate(p['tiers']):
        for values,color,direction in [(p['treated_n'],GREEN,-1),(p['control_n'],PURPLE,1)]:
            x=xx(i)+direction*offset;value=values[i]
            rect(d,x-bw/2,yy(0),bw,max(1,yy(value)-yy(0)),color)
            text(d,x,yy(value)+8,str(value),14,color,'middle',True)
        text(d,xx(i),area[1]-25,tier,14,GRAY,'middle')
    text(d,area[0],area[1]+area[3]+22,'Number of accounts',14,GRAY)
    legend_y=area[1]-65
    rect(d,20 if compact else 65,legend_y,15,12,GREEN);text(d,42 if compact else 87,legend_y,'Premium',14)
    rect(d,180 if compact else 260,legend_y,15,12,PURPLE);text(d,202 if compact else 282,legend_y,'Standard',14)
    x=20 if compact else 30;top=290 if compact else 190
    text(d,x,top,'Shared support: 40 medium accounts',17,GREEN,bold=True)
    treated=sum(p['treated_retained'])/sum(p['treated_n']);control=sum(p['control_retained'])/sum(p['control_n'])
    text(d,x,top-48,f'All accounts: {treated:.0%} vs {control:.0%}',16,bold=True)
    text(d,x,top-73,f'Observed difference: +{100*(treated-control):.0f} points',15,GRAY)
    i=p['supported_tier'];treated=p['treated_retained'][i]/p['treated_n'][i];control=p['control_retained'][i]/p['control_n'][i]
    text(d,x,top-116,f'Medium only: {treated:.0%} vs {control:.0%}',16,GREEN,bold=True)
    text(d,x,top-141,f'Observed difference: +{100*(treated-control):.0f} points',15,GREEN)
    wrapped(d,x,65 if compact else 25,'Shaded extremes lack a counterpart. Restriction changes the target; it does not prove causation.',w-50,14)
    save(d,'comparable-support','Treatment overlap and the narrower supported population','Small accounts have zero premium and 40 standard; medium accounts have 20 each; large accounts have 20 premium and zero standard. The full observed retention contrast is 85 versus 40 percent. For the 40 medium accounts it is 80 versus 60 percent, with remaining confounding assumptions.',compact)


def threshold(compact):
    p=DATA['threshold'];c=p['cutoff'];bw=p['display_bandwidth'];w=360 if compact else 720;h=700 if compact else 590
    d=frame(w,h,'Compare the limits at the cutoff','Scholarship threshold: score 80. Constructed, noiseless values.')
    area=(55,280,w-85,255) if compact else (65,215,w-95,245)
    xx=lambda x:area[0]+(x-75)/9*area[2];yy=lambda y:area[1]+(y-48)/28*area[3]
    rect(d,xx(c-bw),yy(48),xx(c+bw)-xx(c-bw),yy(76)-yy(48),'#e0eee5')
    axes(d,area,(75,84),(48,76),[76,78,80,82,84],[50,60,70])
    line(d,xx(c),yy(48),xx(c),yy(76),GRAY,1,[3,3])
    limits=[]
    for above,color in [(False,GREEN),(True,PURPLE)]:
        pairs=[(x,y) for x,y in zip(p['scores'],p['outcomes']) if (x>=c)==above and abs(x-c)<=bw]
        intercept,slope=fit_line([x for x,y in pairs],[y for x,y in pairs],c);limits.append(intercept)
        start,end=(c,c+bw) if above else (c-bw,c)
        line(d,xx(start),yy(intercept+slope*(start-c)),xx(end),yy(intercept+slope*(end-c)),color,2)
        for x,y in zip(p['scores'],p['outcomes']):
            if (x>=c)==above:point(d,xx(x),yy(y),color if abs(x-c)<=bw else GRAY,4)
    # An open circle is the lower-side limit, not an observed treated outcome.
    d.add(Circle(xx(c),yy(limits[0]),4.5,fillColor=toColor(PAPER),strokeColor=toColor(GREEN),strokeWidth=2))
    bracket_x=xx(c)+22
    line(d,bracket_x,yy(limits[0]),bracket_x,yy(limits[1]),INK,1.5)
    for value in limits:line(d,bracket_x-5,yy(value),bracket_x+5,yy(value),INK,1.5)
    text(d,xx(c)-9,yy(limits[0])+8,'60',14,GREEN,'end')
    text(d,xx(c)-9,yy(limits[1])+9,'66',14,PURPLE,'end')
    text(d,bracket_x+8,yy(sum(limits)/2)-4,'+6',16,bold=True)
    text(d,area[0],area[1]+area[3]+20,'Later performance score',14,GRAY)
    text(d,w/2,area[1]-48,'Application score; cutoff at 80',13,GRAY,'middle')
    x=20 if compact else 30;y=175 if compact else 115
    text(d,x,y,'Cutoff limits: 66 - 60 = 6 points',17,bold=True)
    text(d,x,y-30,'Nearest observations: 66 - 58 = 8',15,GRAY)
    wrapped(d,x,y-67,'Shading: illustrative window 77-83. It is not an uncertainty band.',w-50,14)
    if compact:wrapped(d,x,45,'A local causal interpretation still needs a credible assignment rule.',w-50,14)
    save(d,'threshold-comparison','The local discontinuity and the score gradient','At score 80 the lower-side limit is 60 and upper-side value 66, giving a six-point jump. Nearest observations differ by eight and full-group means by fourteen. Shading spans 77 to 83, a teaching bandwidth of three. Noiseless data do not provide real-world precision.',compact)


def synthetic(compact):
    p=DATA['synthetic'];values=synthetic_fit(p);gap=[a-b for a,b in zip(p['treated'],values)];cut=p['pre_periods']+.5
    w=360 if compact else 720;h=970 if compact else 850
    d=frame(w,h,'Fit before, compare after','Ridership index; weights fixed using only periods 1-4.')
    area=(60,535,270,280) if compact else (65,470,625,240)
    xx=lambda x:area[0]+(x-1)/5*area[2];yy=lambda y:area[1]+(y-85)/50*area[3]
    rect(d,xx(cut),yy(85),xx(6)-xx(cut),yy(135)-yy(85),'#eee8f6')
    axes(d,area,(1,6),(85,135),[1,2,3,4,5,6],[90,110,130])
    for series in p['donors'].values():path(d,[(xx(i),yy(v)) for i,v in zip(p['periods'],series)],'#b8b8ae',1.5)
    path(d,[(xx(i),yy(v)) for i,v in zip(p['periods'],p['treated'])],GREEN,3)
    # Dashes expose both series where the pretreatment trajectories coincide.
    points=[(xx(i),yy(v)) for i,v in zip(p['periods'],values)]
    for first,second in zip(points,points[1:]):line(d,*first,*second,PURPLE,2,[5,4])
    for i,v in zip(p['periods'],p['treated']):point(d,xx(i),yy(v),GREEN,4)
    line(d,xx(cut),yy(85),xx(cut),yy(135),GRAY,1,[3,3])
    text(d,area[0],area[1]+area[3]+25,'Observed and synthetic outcome',16,bold=True)
    text(d,xx(cut)+7,area[1]+area[3]+3,'Policy',13,PURPLE)
    text(d,w/2,area[1]-45,'Period',13,GRAY,'middle')
    legend_y=area[1]-78;x=20 if compact else 65
    line(d,x,legend_y+4,x+20,legend_y+4,GREEN,3);text(d,x+28,legend_y,'Observed',14)
    line(d,x+155,legend_y+4,x+175,legend_y+4,PURPLE,2,[4,3]);text(d,x+183,legend_y,'Synthetic',14)
    text(d,x,legend_y-24,'Gray: untreated donors A and B',13,GRAY)
    gap_area=(60,215,270,145) if compact else (65,210,625,95)
    xx,yy=axes(d,gap_area,(1,6),(-2,12),[1,2,3,4,5,6],[0,5,10])
    rect(d,xx(cut),yy(-2),xx(6)-xx(cut),yy(12)-yy(-2),'#eee8f6')
    for value in [0,5,10]:line(d,xx(1),yy(value),xx(6),yy(value),'#deded5',.7)
    line(d,xx(1),yy(0),xx(6),yy(0),GRAY,1)
    line(d,xx(cut),yy(-2),xx(cut),yy(12),GRAY,1,[3,3])
    path(d,[(xx(i),yy(v)) for i,v in zip(p['periods'],gap)],GREEN,2)
    for i,v in zip(p['periods'],gap):point(d,xx(i),yy(v),GREEN,4)
    text(d,gap_area[0],gap_area[1]+gap_area[3]+24,'Gap = observed - synthetic',16,bold=True)
    for i in range(p['pre_periods'],len(gap)):text(d,xx(p['periods'][i])-8,yy(gap[i])+10,f'+{gap[i]:g}',14,GREEN,'end')
    text(d,w/2,gap_area[1]-44,'Period',13,GRAY,'middle')
    base=105 if compact else 87;left=20 if compact else 65;barw=w-left-(30 if compact else 30)
    text(d,left,base+28,'Donor weights: A 60% / B 40%',15,bold=True)
    rect(d,left,base,barw*p['weights'][0],15,GREEN);rect(d,left+barw*p['weights'][0],base,barw*p['weights'][1],15,PURPLE)
    wrapped(d,left,base-28,'Post-policy gaps: +8 and +10. Average: +9 index points.',w-50 if compact else w-95,14)
    save(d,'synthetic-trajectory','Pretreatment fit, donor weights, and post-policy gap','Two nonnegative weights, A 60 percent and B 40 percent, fit treated indices 100,104,106,110 exactly before period five. After the policy, synthetic indices 112 and 114 compare with observed 120 and 124. The separate gaps are eight and ten, average nine. This does not establish causation.',compact)


if __name__ == '__main__':
    for compact in [False,True]:
        for draw in [timing,overlap,threshold,synthetic]:draw(compact)
    manifest=ROOT/'content/assets/manifest.json'
    dimensions=json.loads(manifest.read_text());dimensions.update(DIMENSIONS)
    manifest.write_text(json.dumps(dimensions,indent=2)+'\n')
    print(f'Rendered {len(DIMENSIONS)} assets; pre-period-only donor fit verified.')
