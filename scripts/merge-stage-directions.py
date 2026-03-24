"""
Merges stage directions from Folger TEI XML into king-lear.json.
Positions stage directions by scene-relative line number (from line.id),
not by absolute FTLN.
"""
import json, re, xml.etree.ElementTree as ET

NS = {'tei': 'http://www.tei-c.org/ns/1.0'}
XML_PATH = '/Users/benhinton/Documents/klread/king-lear_XML_FolgerShakespeare/Lr.xml'
JSON_PATH = 'src/data/king-lear.json'

tree = ET.parse(XML_PATH)
root = tree.getroot()

stages = []
for el in root.findall('.//tei:stage', NS):
    # Skip parent stage elements that contain child stage elements (they duplicate their children)
    if el.find('tei:stage', NS) is not None:
        continue
    n = el.get('n', '')
    m = re.match(r'[Ss][Dd]\s+(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?', n)
    if not m:
        continue
    act, scene, linenum = int(m.group(1)), int(m.group(2)), int(m.group(3))
    sub = int(m.group(4)) if m.group(4) else 0
    text = ' '.join(''.join(el.itertext()).split()).strip().lstrip(',').strip()
    if not text:
        continue
    stages.append({
        'act': act, 'scene': scene, 'linenum': linenum, 'sub': sub,
        'stageType': el.get('type', ''),
        'inline': el.get('rend', '') == 'inline',
        'text': text,
    })

stages.sort(key=lambda s: (s['act'], s['scene'], s['linenum'], s['sub']))

with open(JSON_PATH) as f:
    data = json.load(f)

# Strip any previously inserted stage directions
for act in data['acts']:
    for scene in act['scenes']:
        scene['lines'] = [l for l in scene['lines'] if l.get('type') != 'stage']

total = 0
for act_data in data['acts']:
    a = act_data['num']
    for scene_data in act_data['scenes']:
        s = scene_data['num']
        sds = [x for x in stages if x['act'] == a and x['scene'] == s]
        if not sds:
            continue

        lines = scene_data['lines']
        new_lines = []

        # linenum=0 → before first line
        for sd in sds:
            if sd['linenum'] == 0:
                new_lines.append({
                    'id': f"sd-{a}.{s}.0.{sd['sub']}.{sd['stageType'][:3]}",
                    'type': 'stage', 'stageType': sd['stageType'],
                    'inline': sd['inline'], 'act': a, 'scene': s, 'text': sd['text'],
                })
                total += 1

        sds_remaining = [sd for sd in sds if sd['linenum'] != 0]

        for line in lines:
            new_lines.append(line)
            # Scene-relative line number is the last component of the id e.g. "3.4.47" → 47
            try:
                lnum = int(line['id'].split('.')[-1])
            except (KeyError, ValueError):
                lnum = -1
            to_insert = [sd for sd in sds_remaining if sd['linenum'] == lnum]
            for sd in to_insert:
                new_lines.append({
                    'id': f"sd-{a}.{s}.{sd['linenum']}.{sd['sub']}.{sd['stageType'][:3]}",
                    'type': 'stage', 'stageType': sd['stageType'],
                    'inline': sd['inline'], 'act': a, 'scene': s, 'text': sd['text'],
                })
                total += 1
            sds_remaining = [sd for sd in sds_remaining if sd['linenum'] != lnum]

        # Any unmatched: insert after last line with linenum <= sd.linenum
        for sd in sds_remaining:
            insert_at = len(new_lines)
            for i, ln in enumerate(new_lines):
                try:
                    lnum = int(ln['id'].split('.')[-1])
                    if lnum <= sd['linenum']:
                        insert_at = i + 1
                except (KeyError, ValueError, IndexError):
                    pass
            new_lines.insert(insert_at, {
                'id': f"sd-{a}.{s}.{sd['linenum']}.{sd['sub']}.{sd['stageType'][:3]}",
                'type': 'stage', 'stageType': sd['stageType'],
                'inline': sd['inline'], 'act': a, 'scene': s, 'text': sd['text'],
            })
            total += 1

        scene_data['lines'] = new_lines

with open(JSON_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print(f'Done — inserted {total} stage directions')
