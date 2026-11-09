"""Create illustration-only regular WOFF2 instances from the bundled OFL source.
Requires fonttools[woff]; the original font and license are retained beside the output.
"""
from pathlib import Path
import hashlib
import json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1] / 'docs/pattern-packages/graphic-design-pairing-fonts'
instances = []
for source, output_name, family, axes in [
    ('SourceSans3[wght].ttf', 'pairing-sans.woff2', 'PV Pairing Sans', {'wght': 400}),
    ('Pacifico-Regular.ttf', 'pairing-script.woff2', 'PV Pairing Script', {}),
]:
    font = TTFont(root / source)
    if axes:
        font = instantiateVariableFont(font, axes, inplace=False)
    postscript = family.replace(' ', '') + '-Regular'
    for record in font['name'].names:
        value = {
            1: family, 2: 'Regular', 3: postscript,
            4: family + ' Regular', 6: postscript, 16: family, 17: 'Regular',
        }.get(record.nameID)
        if value is not None:
            record.string = value.encode(record.getEncoding())
    font.flavor = 'woff2'
    font.recalcTimestamp = False
    output = root / output_name
    font.save(output)
    instances.append({
        'file': output.name, 'family': family, 'source': source, 'axes': axes,
        'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    })
(root / 'instances.json').write_text(json.dumps(instances, indent=2) + '\n')
print('Built two renamed illustration fonts; retained original copyright and OFL notices.')
