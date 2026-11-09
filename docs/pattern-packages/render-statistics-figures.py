"""Rebuild original field-guide SVGs from statistics-worked-examples.json.

Requires ReportLab. No external data, fonts, or raster images are fetched.
"""
import json
import re
from pathlib import Path
from math import sqrt
from xml.sax.saxutils import escape
from reportlab.graphics import renderSVG
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.shapes import Drawing, Line, String, Rect, Circle, Polygon
from reportlab.lib.colors import toColor

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/assets/statistics'
DATA = json.loads(Path(__file__).with_name('statistics-worked-examples.json').read_text())
INK, GREEN, GRAY, PURPLE = '#181814', '#007a4d', '#66665e', '#7259b8'
OUT.mkdir(parents=True, exist_ok=True)
dimensions = {}

def text(d, x, y, value, size=16, color=INK, anchor='start', bold=False):
    d.add(String(x, y, value, fontName='Helvetica-Bold' if bold else 'Helvetica',
                 fontSize=size, fillColor=color, textAnchor=anchor))

def canvas(height, title, subtitle):
    d = Drawing(720, height)
    d.add(Rect(0, 0, 720, height, fillColor='#fafaf6', strokeColor=None))
    text(d, 30, height-40, title, 24, bold=True)
    text(d, 30, height-67, subtitle, 15, GRAY)
    return d

def line(d, x1, y1, x2, y2, color=INK, width=2, dash=None):
    d.add(Line(x1,y1,x2,y2,strokeColor=color,strokeWidth=width,strokeDashArray=dash))

def save(d, name, title, desc):
    for shape in d.contents:
        for attr in ('fillColor', 'strokeColor'):
            value = getattr(shape, attr, None)
            if isinstance(value, str):
                setattr(shape, attr, toColor(value))
    svg = renderSVG.drawToString(d)
    # Keep two-point strokes open: closing retraces dashes and can erase their gaps.
    svg = re.sub(r'(<path d="M [^"ML]* L [^"ML]*) Z"', r'\1"', svg)
    start = svg.index('>', svg.index('<svg')) + 1
    svg = svg[:start] + '<title>'+escape(title)+'</title><desc>'+escape(desc)+'</desc>' + svg[start:]
    (OUT / name).write_text(svg)
    dimensions['statistics/'+name] = {'width':int(d.width),'height':int(d.height)}

def arrow(d, x1,y1,x2,y2, color=INK):
    line(d,x1,y1,x2,y2,color)
    dx,dy=x2-x1,y2-y1; length=sqrt(dx*dx+dy*dy); ux,uy=dx/length,dy/length
    d.add(Polygon([x2,y2,x2-10*ux+5*uy,y2-10*uy-5*ux,x2-10*ux-5*uy,y2-10*uy+5*ux],fillColor=color,strokeColor=None))

# Three causal diagrams share the same treatment/outcome labels and distinguish roles.
d=canvas(820,'What role does the third variable play?','Arrows state assumptions. The adjustment choice depends on the target.')
for i,(heading,third,rule) in enumerate([
    ('Common cause','C: prior skill','Account for C to block this backdoor path.'),
    ('Mediator','M: practice','For the total effect, do not block the route through M.'),
    ('Collider','S: selected for review','Conditioning on S can open a noncausal path.')]):
    y=650-i*225
    text(d,30,y+52,heading,19,bold=True)
    for x,yy,label,color in [(145,y-62,'T: training',GREEN),(575,y-62,'Y: passes',INK),(360,y+10,third,PURPLE)]:
        d.add(Rect(x-108,yy-22,216,44,rx=6,ry=6,fillColor='white',strokeColor=color,strokeWidth=1.5))
        text(d,x,yy-5,label,16,color,'middle')
    if i==0:
        arrow(d,275,y-12,185,y-40,PURPLE);arrow(d,445,y-12,535,y-40,PURPLE)
        arrow(d,253,y-62,467,y-62,GREEN)
    elif i==1:
        arrow(d,185,y-40,275,y-12,GREEN);arrow(d,445,y-12,535,y-40,GREEN)
        arrow(d,253,y-62,467,y-62,GREEN)
    else:
        arrow(d,185,y-40,275,y-12,PURPLE);arrow(d,535,y-40,445,y-12,PURPLE)
    text(d,30,y-115,rule,16)
    if i<2: line(d,30,y-145,690,y-145,'#d4d4ca',1)
save(d,'causal-roles.svg','Common cause, mediator, and collider',
     'Common cause C points to training T and passing Y. A mediator M lies on T to Y. A collider S receives arrows from T and Y. Each role requires a different adjustment argument.')

p=DATA['pairing']; before=p['before']; after=p['after']; diff=[a-b for a,b in zip(after,before)]
d=canvas(490,'The person is the link','Four fictional workers; change = after minus before, in minutes.')
plot=LinePlot();plot.x=85;plot.y=110;plot.width=250;plot.height=255
plot.data=[[(0,b),(1,a)] for b,a in zip(before,after)]
plot.xValueAxis.valueMin=0;plot.xValueAxis.valueMax=1;plot.xValueAxis.valueSteps=[0,1]
plot.xValueAxis.labelTextFormat=lambda v:'Before' if v==0 else 'After'
plot.yValueAxis.valueMin=0;plot.yValueAxis.valueMax=45;plot.yValueAxis.valueSteps=[0,10,20,30,40]
plot.xValueAxis.labels.fontSize=15;plot.yValueAxis.labels.fontSize=14
for i,c in enumerate([GREEN,PURPLE,GRAY,INK]):plot.lines[i].strokeColor=toColor(c);plot.lines[i].strokeWidth=2.5
d.add(plot)
for worker, value, color in zip(p['workers'], after, [GREEN,PURPLE,GRAY,INK]):
    text(d, 347, 110 + value * 255 / 45 - 5, worker, 15, color)
text(d,85,390,'Completion time',17,bold=True)
text(d,460,390,'Within-person change',17,bold=True)
for i,(worker,delta) in enumerate(zip(p['workers'],diff)):
    y=340-i*57;text(d,440,y,worker,16)
    x=600+delta*40
    line(d,x,y+5,600,y+5,GREEN,3);d.add(Circle(x,y+5,5,fillColor=GREEN,strokeColor=None))
    text(d,625,y,f'{delta:+d}',17,GREEN)
line(d,600,135,600,365,GRAY,1,[4,4]);text(d,600,112,'0',15,GRAY,'middle')
text(d,30,45,'Mean change: -2.00 min     Paired SE: 0.41 min     95% t interval: -3.30 to -0.70',16,bold=True)
save(d,'paired-changes.svg','Paired levels and individual changes',
     'Workers A to D take 10, 20, 30, 40 minutes before and 8, 19, 27, 38 after. Changes are minus 2, minus 1, minus 3, minus 2 minutes. The mean is minus 2 minutes.')

c=DATA['censoring'];d=canvas(690,'An unfinished observation still counts','Dots are cancellations. Crosses end observation without a cancellation.')
x=lambda t:110+t*85
for i,(customer,t,event) in enumerate(zip(c['customers'],c['months'],c['event'])):
    y=565-i*34;text(d,52,y-5,customer)
    line(d,x(0),y,x(t),y,GREEN,3)
    if event:d.add(Circle(x(t),y,5,fillColor=INK,strokeColor=None))
    else:line(d,x(t)-5,y-5,x(t)+5,y+5,PURPLE,2);line(d,x(t)-5,y+5,x(t)+5,y-5,PURPLE,2)
for t in range(7):text(d,x(t),350,str(t),14,GRAY,'middle')
text(d,365,325,'Months since entry',15,GRAY,'middle')
text(d,30,282,'Kaplan-Meier estimate',19,bold=True)
sx=lambda t:110+t*85;sy=lambda s:70+s*170
line(d,sx(0),sy(0),sx(6.3),sy(0),GRAY,1);line(d,sx(0),sy(0),sx(0),sy(1.05),GRAY,1)
times=[0];survival=[1];at_risk=[];s=1
for t in sorted(set(c['months'])):
    risk=sum(v>=t for v in c['months']);events=sum(v==t and e for v,e in zip(c['months'],c['event']))
    if events:
        at_risk.append(risk);times.extend([t,t]);survival.extend([s,s*(1-events/risk)]);s*=1-events/risk
for i in range(len(times)-1):line(d,sx(times[i]),sy(survival[i]),sx(times[i+1]),sy(survival[i+1]),GREEN,3)
for t,s,label in [(2,5/6,'83.3%'),(4,5/8,'62.5%'),(6,5/16,'31.3%')]:
    text(d,sx(t)-8,sy(s)+12,label,15,GREEN,'end')
for t in [3,5,6]:
    s=1 if t<2 else 5/6 if t<4 else 5/8 if t<6 else 5/16
    line(d,sx(t)-5,sy(s)-5,sx(t)+5,sy(s)+5,PURPLE,2);line(d,sx(t)-5,sy(s)+5,sx(t)+5,sy(s)-5,PURPLE,2)
for s in [0,.5,1]:text(d,96,sy(s)-5,f'{s:.0%}',14,GRAY,'end')
for t in range(7):text(d,sx(t),45,str(t),14,GRAY,'middle')
text(d,30,15,'At risk just before the cancellations: 6 at month 2; 4 at month 4; 2 at month 6.',15)
save(d,'censored-follow-up.svg','Individual follow-up and Kaplan-Meier survival',
     'Six customers: cancellations at months 2, 4, 6; censoring at months 3, 5, 6. Risk sets at events are 6, 4, 2. Survival drops only at events to 5/6, 5/8, 5/16.')

f=DATA['forecast'];d=canvas(525,'A forecast is a range of possible outcomes','All six forecasts are issued at day 0 under stated Normal approximations.')
x=lambda t:90+(t-1)*108;y=lambda v:115+(v-10)*1.5
for z,color in [(f['z95'],'#e5e0f0'),(f['z80'],'#c4e7d6')]:
    points=[]
    for i,(m,sd) in enumerate(zip(f['mean'],f['sd'])):points.extend([x(i+1),y(m+z*sd)])
    for i in reversed(range(6)):points.extend([x(i+1),y(f['mean'][i]-z*f['sd'][i])])
    d.add(Polygon(points,fillColor=color,strokeColor=None))
for value in [20,60,100,140,180]:
    line(d,90,y(value),630,y(value),'#deded5',.7);text(d,75,y(value)-5,str(value),14,GRAY,'end')
for i in range(5):
    line(d,x(i+1),y(f['mean'][i]),x(i+2),y(f['mean'][i+1]),GREEN,2.5)
    line(d,x(i+1),y(f['observed'][i]),x(i+2),y(f['observed'][i+1]),INK,1.5,[4,4])
for i,o in enumerate(f['observed']):d.add(Circle(x(i+1),y(o),4.5,fillColor=INK,strokeColor=None))
for i in range(1,7):text(d,x(i),80,f'Day {i}',14,GRAY,'middle')
text(d,30,426,'Calls',15,GRAY)
for x0,color,label in [(90,'#e5e0f0','95% interval'),(285,'#c4e7d6','80% interval')]:
    d.add(Rect(x0,35,20,14,fillColor=color,strokeColor=GRAY,strokeWidth=.5));text(d,x0+28,35,label,15)
line(d,480,42,505,42,INK,1.5,[4,4]);text(d,515,35,'Observed later',15)
save(d,'forecast-bands.svg','Predictive bands and subsequent observations',
     'Forecast means are 100, 102, 104, 106, 108, 110 calls. Standard deviations are 20, 22, 24, 26, 28, 30. Observations 125, 96, 112, 145, 85, 132 lie inside all six 95 percent intervals and five of six 80 percent intervals.')

s=DATA['synthesis'];w=[1/se**2 for se in s['se']];mean=sum(v*e for v,e in zip(w,s['effect']))/sum(w);se=sqrt(1/sum(w));z=s['z95']
d=canvas(485,'Combine estimates, not significance labels','Fictional independent studies of the same outcome at the same follow-up.')
x=lambda value:190+(value+3)*23
line(d,x(0),135,x(0),360,GRAY,1,[4,4])
text(d,30,386,'Study',16,bold=True);text(d,640,386,'Weight',16,bold=True)
for i,(study,e,se_i,wi) in enumerate(zip(s['studies'],s['effect'],s['se'],w)):
    yy=335-i*58;text(d,30,yy-5,study,17)
    lo,hi=e-z*se_i,e+z*se_i
    line(d,x(lo),yy,x(hi),yy,GREEN,2)
    line(d,x(lo),yy-6,x(lo),yy+6,GREEN,2);line(d,x(hi),yy-6,x(hi),yy+6,GREEN,2)
    size=16*sqrt(wi/max(w));d.add(Rect(x(e)-size/2,yy-size/2,size,size,fillColor=GREEN,strokeColor=None))
    text(d,640,yy-5,f'{100*wi/sum(w):.1f}%',16)
yy=142;lo,hi=mean-z*se,mean+z*se
d.add(Polygon([x(lo),yy,x(mean),yy+10,x(hi),yy,x(mean),yy-10],fillColor=PURPLE,strokeColor=None))
text(d,30,yy-5,'Common effect',16,bold=True)
for value in [0,4,8,12]:text(d,x(value),103,str(value),15,GRAY,'middle')
text(d,420,72,'Improvement in points; horizontal bars are 95% intervals',15,GRAY,'middle')
text(d,30,30,f'Pooled estimate: {mean:.2f} points     95% interval: {lo:.2f} to {hi:.2f}',18,bold=True)
save(d,'evidence-forest.svg','Forest plot and inverse-variance pooled estimate',
     'Studies A, B, C estimate improvements of 4, 6, 5 points with standard errors 1, 4, 2. Weights are 76.2, 4.8, 19.0 percent. The pooled common effect is 4.29 with 95 percent interval 2.57 to 6.00.')

manifest=ROOT/'content/assets/manifest.json'
entries=json.loads(manifest.read_text());entries.update(dimensions)
manifest.write_text(json.dumps(entries,indent=2)+'\n')
print('Rendered',len(dimensions),'original statistical illustrations.')

# Compact companions are authored layouts, not scaled-down desktop labels.
def mobile(height, title, subtitle):
    d=Drawing(360,height)
    d.add(Rect(0,0,360,height,fillColor='#fafaf6',strokeColor=None))
    for i,t in enumerate(title):text(d,20,height-32-i*25,t,22,bold=True)
    y=height-40-len(title)*25
    for i,t in enumerate(subtitle):text(d,20,y-i*19,t,13,GRAY)
    return d

d=mobile(790,['Three roles, three choices'],['Arrows express causal assumptions.','T = training; Y = passing the assessment.'])
for i,(heading,third,rule) in enumerate([
    ('Common cause','Prior skill',['Account for prior skill to block','this backdoor path.']),
    ('Mediator','Practice',['For the total effect, do not block','the route through practice.']),
    ('Collider','Review selection',['Conditioning on review selection','can open a noncausal path.'])]):
    y=615-i*225;text(d,20,y+50,heading,18,bold=True)
    for x,yy,label,color,ww in [(70,y-62,'T: training',GREEN,100),(290,y-62,'Y: passes',INK,100),(180,y+10,third,PURPLE,175)]:
        d.add(Rect(x-ww/2,yy-20,ww,40,rx=5,ry=5,fillColor='white',strokeColor=color,strokeWidth=1.5));text(d,x,yy-5,label,14,color,'middle')
    if i==0:
        arrow(d,126,y-10,84,y-42,PURPLE);arrow(d,234,y-10,276,y-42,PURPLE);arrow(d,120,y-62,240,y-62,GREEN)
    elif i==1:
        arrow(d,84,y-42,126,y-10,GREEN);arrow(d,234,y-10,276,y-42,GREEN);arrow(d,120,y-62,240,y-62,GREEN)
    else:
        arrow(d,84,y-42,126,y-10,PURPLE);arrow(d,276,y-42,234,y-10,PURPLE)
    for j,t in enumerate(rule):text(d,20,y-108-j*19,t,14)
save(d,'causal-roles-mobile.svg','Three causal roles', 'Common cause points to training and passing. Practice mediates a route from training to passing. Review selection receives arrows from training and passing.')

p=DATA['pairing'];d=mobile(760,['The person is the link'],['Fictional workers; times in minutes.'])
text(d,20,640,'Before and after',18,bold=True)
xx=lambda t:90+t*150;yy=lambda v:345+v*5.5
for v in [0,10,20,30,40]:text(d,66,yy(v)-5,str(v),13,GRAY,'end')
for b,a,worker,color in zip(p['before'],p['after'],p['workers'],[GREEN,PURPLE,GRAY,INK]):
    line(d,xx(0),yy(b),xx(1),yy(a),color,2.5)
    for x0,v in [(xx(0),b),(xx(1),a)]:d.add(Circle(x0,yy(v),3,fillColor=color,strokeColor=None))
    text(d,255,yy(a)-5,worker,14,color)
text(d,xx(0),320,'Before',14,GRAY,'middle');text(d,xx(1),320,'After',14,GRAY,'middle')
text(d,20,277,'Change = after minus before',18,bold=True)
for i,(worker,delta) in enumerate(zip(p['workers'],diff)):
    y0=240-i*38;text(d,30,y0-5,worker,15);line(d,260+delta*42,y0,260,y0,GREEN,2.5);d.add(Circle(260+delta*42,y0,4,fillColor=GREEN,strokeColor=None));text(d,290,y0-5,f'{delta:+d}',15,GREEN)
line(d,260,112,260,255,GRAY,1,[4,4]);text(d,260,92,'0',13,GRAY,'middle')
text(d,20,60,'Mean change: -2.00 min; paired SE: 0.41',15,bold=True);text(d,20,33,'95% t interval: -3.30 to -0.70 min',15,bold=True)
save(d,'paired-changes-mobile.svg','Paired levels and changes','Before: 10, 20, 30, 40; after: 8, 19, 27, 38. Individual changes minus 2, minus 1, minus 3, minus 2. Mean minus 2 minutes.')

c=DATA['censoring'];d=mobile(675,['Unfinished still counts'],['Dot = cancellation; cross = censored.'])
x=lambda t:65+t*44
for i,(customer,t,event) in enumerate(zip(c['customers'],c['months'],c['event'])):
    y0=540-i*32;text(d,25,y0-5,customer,15);line(d,x(0),y0,x(t),y0,GREEN,2.5)
    if event:d.add(Circle(x(t),y0,4,fillColor=INK,strokeColor=None))
    else:line(d,x(t)-4,y0-4,x(t)+4,y0+4,PURPLE,2);line(d,x(t)-4,y0+4,x(t)+4,y0-4,PURPLE,2)
for t in range(7):text(d,x(t),350,str(t),13,GRAY,'middle')
text(d,195,325,'Months since entry',14,GRAY,'middle');text(d,20,283,'Kaplan-Meier survival',18,bold=True)
sy=lambda s:85+s*155
for i in range(len(times)-1):line(d,x(times[i]),sy(survival[i]),x(times[i+1]),sy(survival[i+1]),GREEN,2.5)
for v in [0,.5,1]:text(d,53,sy(v)-5,f'{v:.0%}',13,GRAY,'end')
for t,s0,label in [(2,5/6,'83.3%'),(4,5/8,'62.5%'),(6,5/16,'31.3%')]:text(d,x(t)-3,sy(s0)+12,label,13,GREEN,'end')
for t in [3,5,6]:
    s0=5/6 if t==3 else 5/8 if t==5 else 5/16
    line(d,x(t)-4,sy(s0)-4,x(t)+4,sy(s0)+4,PURPLE,2);line(d,x(t)-4,sy(s0)+4,x(t)+4,sy(s0)-4,PURPLE,2)
for t in range(7):text(d,x(t),60,str(t),13,GRAY,'middle')
text(d,20,32,'Event risk sets: 6, then 4, then 2.',14,bold=True)
save(d,'censored-follow-up-mobile.svg','Censoring and survival','Cancellations at months 2, 4, 6 and censoring at 3, 5, 6. Survival becomes 5/6, 5/8, 5/16. Censoring alone does not lower the curve.')

f=DATA['forecast'];d=mobile(540,['A forecast is a range'],['Six forecasts issued together at day 0.','Stated Normal approximations; calls.'])
x=lambda t:55+(t-1)*53;y=lambda v:125+(v-10)*1.5
for z,color in [(f['z95'],'#e5e0f0'),(f['z80'],'#c4e7d6')]:
    pts=[]
    for i,(m,sd) in enumerate(zip(f['mean'],f['sd'])):pts.extend([x(i+1),y(m+z*sd)])
    for i in reversed(range(6)):pts.extend([x(i+1),y(f['mean'][i]-z*f['sd'][i])])
    d.add(Polygon(pts,fillColor=color,strokeColor=None))
for v in [20,60,100,140,180]:line(d,55,y(v),320,y(v),'#deded5',.7);text(d,44,y(v)-4,str(v),13,GRAY,'end')
for i in range(5):
    line(d,x(i+1),y(f['mean'][i]),x(i+2),y(f['mean'][i+1]),GREEN,2)
    line(d,x(i+1),y(f['observed'][i]),x(i+2),y(f['observed'][i+1]),INK,1.2,[3,3])
for i,o in enumerate(f['observed']):d.add(Circle(x(i+1),y(o),3.5,fillColor=INK,strokeColor=None))
for i in range(1,7):text(d,x(i),104,str(i),13,GRAY,'middle')
text(d,185,82,'Forecast day',14,GRAY,'middle')
for x0,color,label in [(20,'#e5e0f0','95% interval'),(185,'#c4e7d6','80% interval')]:
    d.add(Rect(x0,49,16,12,fillColor=color,strokeColor=GRAY,strokeWidth=.5));text(d,x0+22,49,label,13)
line(d,20,28,45,28,INK,1.2,[3,3]);text(d,52,23,'Observed later',13);line(d,185,28,210,28,GREEN,2);text(d,217,23,'Mean',13)
save(d,'forecast-bands-mobile.svg','Forecast bands and later observations','Nested 80 and 95 percent prediction intervals. Five of six later outcomes lie within the 80 percent intervals; all six lie within the 95 percent intervals.')

s=DATA['synthesis'];d=mobile(475,['Combine estimates'],['Fictional independent studies; same target.','Bars = 95% intervals; square area = weight.'])
x=lambda v:105+(v+3)*13
line(d,x(0),140,x(0),350,GRAY,1,[4,4])
for i,(study,e,se_i,wi) in enumerate(zip(s['studies'],s['effect'],s['se'],w)):
    y0=330-i*62;text(d,20,y0,study,16,bold=True);text(d,20,y0-20,f'{100*wi/sum(w):.1f}%',13,GRAY)
    lo,hi=e-s['z95']*se_i,e+s['z95']*se_i
    line(d,x(lo),y0,x(hi),y0,GREEN,2);line(d,x(lo),y0-5,x(lo),y0+5,GREEN,1.5);line(d,x(hi),y0-5,x(hi),y0+5,GREEN,1.5)
    size=14*sqrt(wi/max(w));d.add(Rect(x(e)-size/2,y0-size/2,size,size,fillColor=GREEN,strokeColor=None))
lo,hi=mean-s['z95']*se,mean+s['z95']*se
text(d,20,142,'Pooled',15,bold=True);d.add(Polygon([x(lo),147,x(mean),156,x(hi),147,x(mean),138],fillColor=PURPLE,strokeColor=None))
for v in [0,4,8,12]:text(d,x(v),110,str(v),13,GRAY,'middle')
text(d,225,85,'Improvement, points',14,GRAY,'middle')
text(d,20,51,'Common effect: 4.29 points',17,bold=True);text(d,20,25,'95% interval: 2.57 to 6.00',16,bold=True)
save(d,'evidence-forest-mobile.svg','Forest plot and pooled interval','A, B, C estimates 4, 6, 5 points; weights 76.2, 4.8, 19.0 percent. Pooled 4.29 with 95 percent interval 2.57 to 6.00.')
entries=json.loads(manifest.read_text());entries.update(dimensions);manifest.write_text(json.dumps(entries,indent=2)+'\n')
print('Rendered five compact companions for small screens.')
