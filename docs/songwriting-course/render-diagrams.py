from pathlib import Path
from html import escape
from math import sin,cos,pi
R=Path(__file__).resolve().parents[2]
OUT=R/'apps/web/static/diagrams/songwriting'
OUT.mkdir(parents=True,exist_ok=True)
STYLE=':root{--paper:#fff;--ink:#181814;--muted:#65655f;--line:#007a4d;--wash:#e2f5eb;--soft:#ecece5;color-scheme:light dark}text{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;fill:var(--ink)}@media(prefers-color-scheme:dark){:root{--paper:#181814;--ink:#fff;--muted:#b6b6ae;--line:#05ce78;--wash:#173e2e;--soft:#343430}}'
def text(x,y,s,size=18,anchor='middle',fill=None,weight=None):
    extra=(f' style="fill:{fill}"' if fill else '')+(f' font-weight="{weight}"' if weight else '')
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}"{extra}>{escape(str(s))}</text>'
def line(x1,y1,x2,y2,color='var(--muted)',width=2,dash=None):
    return f'<path d="M{x1:g} {y1:g} L{x2:g} {y2:g}" fill="none" stroke="{color}" stroke-width="{width}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>'
def box(x,y,w,h,fill='var(--wash)',stroke='var(--ink)',radius=6):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
def dot(x,y,r=6,fill='var(--line)'):
    return f'<circle cx="{x:g}" cy="{y:g}" r="{r:g}" fill="{fill}"/>'
def write(slug,title,desc,parts):
    xml=f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="470" viewBox="0 0 720 470" role="img" aria-labelledby="{slug}-title {slug}-desc"><title id="{slug}-title">{escape(title)}</title><desc id="{slug}-desc">{escape(desc)}</desc><style>{STYLE}</style><rect width="720" height="470" fill="var(--paper)"/>'+text(360,35,title,21,weight=650)+''.join(parts)+'</svg>\n'
    (OUT/(slug+'.svg')).write_text(xml)
# Clockwise fifth relationships; minor names are explicit authored pairings.
maj=['C','G','D','A','E','B','F♯ / G♭','D♭','A♭','E♭','B♭','F']
minor=['Am','Em','Bm','F♯m','C♯m','G♯m','D♯m / E♭m','B♭m','Fm','Cm','Gm','Dm']
p=['<circle cx="360" cy="245" r="160" fill="none" stroke="var(--muted)" stroke-width="1.5"/>','<circle cx="360" cy="245" r="114" fill="none" stroke="var(--muted)" stroke-dasharray="3 6"/>']
for i,(ma,mi) in enumerate(zip(maj,minor)):
    a=-pi/2+i*pi/6; x,y=360+160*cos(a),245+160*sin(a)
    p+=[dot(x,y,23,'var(--wash)' if i in [0,1,11] else 'var(--paper)'),text(x,y+6,ma,17 if '/' in ma else 21,weight=700 if i in [0,1,11] else 450),text(360+111*cos(a),245+111*sin(a)+5+(13 if i==6 else 0),mi,14 if '/' in mi else 16,fill='var(--line)')]
p += [text(360,235,'Major outside',14),text(360,259,'Minor inside',14),text(360,448,'Clockwise from C: add sharps. Counterclockwise: add flats.',16)]
write('circle-of-fifths','A map of key relationships','Major keys move clockwise by fifths from C to G to D. Each key is paired with its relative minor. C, F, and G are highlighted as neighboring signatures.',p)
# Group six subdivisions in two different ways.
p=[]
for row,(name,groups,labels) in enumerate([('3/4: three simple beats',[2,2,2],['1','&','2','&','3','&']),('6/8: two compound beats',[3,3],['1','la','li','2','la','li'])]):
    y=140+row*175; p.append(text(45,y-48,name,19,'start'))
    start=90
    for count in groups:
        p.append(box(start-25,y-27,count*90-12,65)); start+=count*90
    for j,label in enumerate(labels):
        x=90+j*90; p += [dot(x,y,7),text(x,y+62,label,19)]
p.append(text(360,445,'Six small units; different grouping and different larger pulse.',16))
write('meter-groups','Beat count and beat division','Three pairs of subdivisions in 3/4 contrast with two groups of three subdivisions in 6/8.',p)
# Durations account for exactly four quarter-note beats.
p=[]
for j in range(4): p+=[text(240+j*120,100,str(j+1),18),line(180+j*120,114,180+j*120,379,'var(--muted)',1,'3 5')]
for i,(label,events) in enumerate([('Seed',[('E4',1),('G4',1),('A4',2)]),('Earlier arrival',[('E4',.5),('G4',.5),('A4',3)]),('Leave space',[('E4',1),('G4',1),('A4',1),('Rest',1)])]):
    y=130+i*90; p.append(text(30,y+38,label,16,'start'));x=180
    for name,d in events:
        p += [box(x,y,d*120,60,'var(--paper)' if name=='Rest' else 'var(--wash)'),text(x+d*60,y+36,name,16)]
        x+=d*120
p.append(text(360,445,'Each row fills four beats. Rests still occupy counted time.',16))
write('rhythm-grid','Same bar, different rhythmic shape','Three four-beat rows show a seed, an earlier arrival, and a version ending in a one-beat rest.',p)
# Native keyboard: every adjacent pitch is a semitone.
p=[text(360,85,'C4 is middle C; the course seed uses E4, G4, and A4.',17)]
whites=['C4','D4','E4','F4','G4','A4','B4','C5']
for i,name in enumerate(whites):
    x=90+i*65;p += [box(x,120,65,180,'#dff5e8' if name in ['E4','G4','A4'] else '#fff',stroke='#181814',radius=0),text(x+32.5,277,name,17,fill='#181814')]
for i,label in [(0,'C♯'),(1,'D♯'),(3,'F♯'),(4,'G♯'),(5,'A♯')]:
    x=90+(i+1)*65-20;p += [box(x,120,40,108,'#181814',stroke='#181814',radius=0),text(x+20,200,label,13,fill='#fff')]
p += [text(360,347,'E4 → G4: 3 semitones (minor third)',19),text(360,383,'G4 → A4: 2 semitones (major second)',19),text(360,440,'No black key separates E–F or B–C.',17)]
write('keyboard-and-intervals','Locate pitches and count intervals','A C4 to C5 keyboard highlights E4, G4, and A4. Adjacent white keys E to F and B to C are semitone pairs.',p)
# Seven chord families.
p=[text(360,90,'C major: C · D · E · F · G · A · B',19)]
for i,(roman,chord,notes) in enumerate([('I','C','C E G'),('ii','Dm','D F A'),('iii','Em','E G B'),('IV','F','F A C'),('V','G','G B D'),('vi','Am','A C E'),('vii°','Bdim','B D F')]):
    x=42+i*92;p += [box(x,135,84,170),text(x+42,173,roman,22),text(x+42,223,chord,23),text(x+42,270,notes,15)]
p += [text(360,355,'Major: I, IV, V     Minor: ii, iii, vi     Diminished: vii°',17),text(360,407,'In G major, I–vi–IV–V becomes G–Em–C–D.',19),text(360,445,'Chord relationships survive transposition; names change.',16)]
write('chord-family','Seven triads from one major scale','The C-major diatonic triads are labeled by Roman numeral, chord name, and notes, with their qualities distinguished.',p)
# Three actual motif forms with a fixed rhythm.
p=[]
for i,(label,notes,heights) in enumerate([('Seed',['E4','G4','A4'],[30,10,0]),('New ending',['E4','G4','C5'],[30,10,-20]),('Answer',['G4','E4','D4'],[0,20,30])]):
    base=125+i*120;p.append(text(32,base+5,label,17,'start'))
    positions=[(210+j*150,base+heights[j]) for j in range(3)]
    for a,b in zip(positions,positions[1:]):p.append(line(*a,*b,'var(--line)',3))
    for j,((x,y),note) in enumerate(zip(positions,notes)):
        p += [dot(x,y,8),text(x,base-40,note,17),text(x,base+55,'2 beats' if j==2 else '1 beat',14)]
p.append(text(360,453,'A preserved rhythm connects different pitch shapes.',16))
write('motif-variation','Keep an identity while changing a feature','Three note gestures preserve durations one, one, and two beats while their pitch endings and direction change.',p)
# Abstract melodic contour, explicitly not a score.
p=[]
for row,(label,ys) in enumerate([('Rise',[160,145,130,110,85]),('Arch',[255,230,200,230,255]),('Level, then fall',[325,325,325,345,365])]):
    p.append(text(35,130+row*105,label,17,'start'));pts=[(240+i*90,y) for i,y in enumerate(ys)]
    for a,b in zip(pts,pts[1:]):p.append(line(*a,*b,'var(--line)',3))
    for x,y in pts:p.append(dot(x,y))
p.append(text(360,445,'Direction only: exact pitches, intervals, and durations are not shown.',16))
write('melodic-contour','Three ways a melody can move','Schematic lines compare rising, arching, and mostly level contours. They are not exact musical notation.',p)
# Phrase map: eight bars, four two-bar lines, marked breathing room.
p=[text(360,92,'A verse with four two-bar lyric phrases',19)]
for i in range(8):p += [box(60+i*75,145,75,65,'var(--paper)'),text(97.5+i*75,185,str(i+1),20)]
for i in range(4):
    x=60+i*150;p += [box(x,245,150,65),text(x+75,285,'Line '+str(i+1),20),box(x+112,325,38,28,'var(--paper)'),text(x+131,346,'rest',12)]
p += [text(360,405,'A phrase can finish before its counted span ends.',18),text(360,443,'Rest boxes are schematic breathing positions, not fixed durations.',15)]
write('phrase-map','Musical punctuation within counted time','Eight bars group into four lyric phrases. Schematic rests show that a phrase can leave breathing room without deleting time.',p)
# New information changes the return.
p=[]
for x,title,lines in [(40,'Verse 1',['A key in the lock','A hesitant return']),(270,'Verse 2',['A folded note','Someone has waited']),(500,'Bridge',['A mistaken assumption','A changed commitment'])]:
    p += [box(x,110,180,135),text(x+90,145,title,21),text(x+90,186,lines[0],14),text(x+90,216,lines[1],14)]
p += [line(220,175,260,175,'var(--line)',3),line(450,175,490,175,'var(--line)',3),box(100,310,520,85),text(360,346,'The same chorus returns in a changed context.',19),text(360,376,'“Leave the porch light on.”',18),text(360,445,'Development can happen through meaning as well as new words.',16)]
write('lyric-development','Let new information change the return','A scene, new evidence, and an admission lead to a recurring chorus heard with different knowledge.',p)
# Exact syllable-duration placement.
p=[text(220,99,'Bar 1: F',21),text(484,99,'Bar 2: G',21)]
for i in range(8):p += [text(129+i*66,143,str(i%4+1),17),line(96+i*66,155,96+i*66,322,'var(--muted)',1,'3 5')]
x=96
for word,pitch,dur in [('Leave','A4',1),('the','A4',1),('porch','G4',2),('light','E4',2),('on','G4',2)]:
    w=dur*66;p += [box(x,190,w,100,'var(--soft)' if word=='the' else 'var(--wash)'),text(x+w/2,229,word,18),text(x+w/2,267,pitch,18)];x+=w
p += [text(360,373,'Five syllables across eight quarter-note beats.',19),text(360,410,'Durations: 1 + 1 + 2 | 2 + 2',19),text(360,448,'One original setting; musical emphasis also depends on delivery.',15)]
write('lyric-stress','Give important words musical time','Five original title syllables occupy two four-beat bars, with longer durations on porch, light, and on.',p)
# Three voices preserve two common tones.
p=[text(200,93,'C major',23),text(520,93,'Am/C',23)]
for left,right,y1,y2 in [('G4','A4',165,125),('E4','E4',245,245),('C4','C4',325,325)]:
    p += [line(225,y1,495,y2,'var(--line)' if left!=right else 'var(--muted)',3),dot(200,y1),dot(520,y2),text(158,y1+6,left,19),text(561,y2+6,right,19)]
p += [text(360,395,'Two notes stay; one rises by a whole step.',19),text(360,442,'With a separate lower A bass, the full Am chord is root position.',15)]
write('voice-leading','Follow each voice through the change','C4 and E4 remain while G4 rises to A4. Without a lower bass, the final chord is Am in first inversion.',p)
# Borrowed minor iv.
p=[]
for i,(chord,notes) in enumerate([('F',['F','A','C']),('Fm',['F','A♭','C']),('C',['E','G','C'])]):
    x=140+i*220;p += [text(x,110,chord,27),box(x-65,145,130,165)]
    for j,note in enumerate(notes):p.append(text(x,186+j*44,note,23,fill='var(--line)' if j==1 else None))
    if i<2:p.append(line(x+72,228,x+142,228,'var(--line)',3))
p += [text(360,368,'One inner line: A → A♭ → G',23),text(360,408,'The wider reference stays C; Fm borrows from C minor.',17),text(360,446,'A held A natural in the melody needs a deliberate clash check.',15)]
write('borrowed-chord','A parallel-mode color on the way home','F major changes to F minor before C. The A to A-flat to G line makes the borrowed pitch explicit.',p)
# Local dominant relationship.
p=[]
for i,(chord,notes) in enumerate([('C','C E G'),('E7','E G♯ B D'),('Am','A C E')]):
    x=140+i*220;p += [box(x-75,135,150,135),text(x,178,chord,27),text(x,227,notes,18)]
    if i<2:p.append(line(x+80,200,x+140,200,'var(--line)',3))
p += [text(360,94,'C remains the wider tonal reference.',19),text(360,329,'E7 is V7/vi in C: the dominant of Am.',21),text(360,370,'G♯ → A helps point toward the local destination.',18),text(360,420,'A brief tonicization is not automatically a full key change.',16)]
write('temporary-home','Point toward a temporary destination','C moves through E7 to Am. G-sharp leads to A while the surrounding C-major context can continue.',p)
# Full and schematic alternative forms.
p=[text(40,100,'Canonical Porch Light: 52 bars',20,'start')];x=48
for label,bars in [('Intro',4),('V1',8),('C1',8),('V2',8),('C2',8),('Bridge',4),('C3',8),('Outro',4)]:
    w=bars*12;p += [box(x,130,w,100),text(x+w/2,172,label,12 if bars==4 else 18),text(x+w/2,207,str(bars),16)];x+=w
p += [text(40,282,'A verse–refrain alternative',20,'start')]
for x,w,top,bottom in [(48,250,'Verse 1 + refrain','Rewrite the connection'),(298,250,'Verse 2 + refrain','New information'),(548,124,'Final return','Choose length')]:
    p += [box(x,312,w,85),text(x+w/2,346,top,15),text(x+w/2,374,bottom,12)]
p.append(text(360,445,'The lower row is schematic; it does not inherit the 52-bar map.',15))
write('song-forms','Different forms for related material','A proportional 52-bar timeline shows the complete song. A separate schematic verse–refrain design uses a different organization.',p)
# Explicit layer presence.
p=[];heads=['Intro','V1','C1','V2','C2','Br','C3','Out']
for i,h in enumerate(heads):p.append(text(243+i*54,106,h,15))
rows=[('Voice',[0,1,1,1,1,1,1,0]),('Bass',[0,1,1,1,1,1,1,1]),('Chords',[1,1,1,1,1,1,1,1]),('High figure',[1,0,1,0,1,0,1,1]),('Drums',[0,1,1,1,1,0,1,0])]
for j,(name,values) in enumerate(rows):
    y=130+j*48;p.append(text(45,y+28,name,17,'start'))
    for i,v in enumerate(values):p.append(box(219+i*54,y,46,36,'var(--wash)' if v else 'var(--paper)'))
p += [text(360,412,'Filled: present in some of the section. Outline: absent.',16),text(360,446,'Presence alone does not specify rhythm, density, or loudness.',15)]
write('arrangement-map','Give each layer a place','An eight-section grid shows one original plan for voice, bass, chords, high figure, and drums.',p)
# Qualitative planned energy.
p=[line(75,365,665,365),text(45,230,'More',14),text(45,344,'Less',14)]
pts=[(85,315),(155,285),(235,195),(315,250),(395,185),(465,295),(555,145),(645,320)]
for a,b in zip(pts,pts[1:]):p.append(line(*a,*b,'var(--line)',4))
for (x,y),label in zip(pts,heads):p += [dot(x,y,7),text(x,393,label,15)]
p += [text(360,93,'One arrangement plan: activity, density, register, and space',17),text(360,438,'Conceptual sketch, not a measurement of emotion or audio loudness.',15)]
write('energy-arc','Plan contrast across the whole song','A conceptual line rises for choruses, reduces in the bridge, and settles into the outro; it summarizes several musical dimensions.',p)
print(str(len(list(OUT.glob('*.svg'))))+' explanatory SVG diagrams generated.')
