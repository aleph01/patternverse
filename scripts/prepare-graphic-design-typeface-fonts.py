"""Create illustration-only static WOFF2 instances from the bundled OFL sources.
Requires fonttools[woff]. Original fonts and licenses live beside the output files.
"""
from pathlib import Path
import json, hashlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
root=Path(__file__).resolve().parents[1]/'docs/pattern-packages/graphic-design-typeface-fonts'
instances=[
 ('reading-display','sourceserif4/SourceSerif4[opsz,wght].ttf',{'wght':400,'opsz':60}),
 ('reading-text','sourceserif4/SourceSerif4[opsz,wght].ttf',{'wght':400,'opsz':12}),
 ('geometric','jost/Jost[wght].ttf',{'wght':400}),
 ('event','fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf',{'wght':400,'opsz':72,'SOFT':50,'WONK':1}),
 ('code','atkinsonhyperlegiblemono/AtkinsonHyperlegibleMono[wght].ttf',{'wght':400}),
]
records=[]
for name,source,axes in instances:
 font=instantiateVariableFont(TTFont(root/source),axes,inplace=False)
 family='PV '+name.replace('-',' ').title()
 # Instance names are changed to avoid retaining reserved upstream family names.
 for record in font['name'].names:
  value={1:family,2:'Regular',3:family+'-Regular',4:family+' Regular',6:family.replace(' ','')+'-Regular',16:family,17:'Regular'}.get(record.nameID)
  if value is not None:record.string=value.encode(record.getEncoding())
 font.flavor='woff2';target=root/(name+'.woff2');font.save(target)
 records.append({'file':target.name,'family':family,'source':source,'axes':axes,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(root/'instances.json').write_text(json.dumps(records,indent=2)+'\n')
print('Built five named static WOFF2 instances with preserved copyright and OFL notices.')
