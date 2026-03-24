"""
Merges stage directions from Folger TEI XML into king-lear.json.
Each stage direction becomes a line object with type="stage".
"""
import json, re, xml.etree.ElementTree as ET

NS = {'tei': 'http://www.tei-c.org/ns/1.0'}
XML_PATH = '/Users/benhinton/Documents/klread/king-lear_XML_FolgerShakespeare/Lr.xml'
JSON_PATH = 'src/data/king-lear.json'

tree = ET.parse(XML_PATH)
root = tree.getroot()

# Extract stage directions
stages = []
for el in root.findall('.//tei:stage', NS):
    n = el.get('n', '')
    m = re.match(r'[Ss][Dd]\s+(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?', n)
    if not m:
        continue
    act, scene, ftln = int(m.group(1)), int(m.group(2)), int(m.group(3))
    sub = int(m.group(4)) if m.group(4) else 0
    text = ' '.join(''.join(el.itertext()).split()).strip().lstrip(',').strip()
    if not text:
        continue
    stages.append({
        'act': act, 'scene': scene, 'ftln': ftln, 'sub': sub,
        'stageType': el.get('type', ''),
        'inline': el.get('rend', '') == 'inline',
        'text': text,
    })

# Sort within each scene by (ftln, sub)
stages.sort(key=lambda s: (s['act'], s['scene'], s['ftln'], s['sub']))

with open(JSON_PATH) as f:
    data = json.load(f)

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

        # Insert stage directions with ftln=0 at start
        for sd in sds:
            if sd['ftln'] == 0:
                new_lines.append({
                    'id': f"sd-{a}.{s}.0.{sd['sub']}.{sd['stageType'][:3]}",
                    'type': 'stage', 'stageType': sd['stageType'],
                    'inline': sd['inline'], 'act': a, 'scene': s, 'text': sd['text'],
                })
                total += 1

        # Walk lines, appending stage directions after their matching ftln
        sds_remaining = [sd for sd in sds if sd['ftln'] != 0]
        for line in lines:
            new_lines.append(line)
            lftln = line.get('ftln', -1)
            to_insert = [sd for sd in sds_remaining if sd['ftln'] == lftln]
            for sd in to_insert:
                new_lines.append({
                    'id': f"sd-{a}.{s}.{sd['ftln']}.{sd['sub']}.{sd['stageType'][:3]}",
                    'type': 'stage', 'stageType': sd['stageType'],
                    'inline': sd['inline'], 'act': a, 'scene': s, 'text': sd['text'],
                })
                total += 1
            sds_remaining = [sd for sd in sds_remaining if sd['ftln'] != lftln]

        # Any remaining stage directions (ftln doesn't match any line exactly)
        # insert after the last line with ftln <= sd.ftln
        for sd in sds_remaining:
            insert_at = len(new_lines)
            for i, line in enumerate(new_lines):
                if line.get('ftln', -1) <= sd['ftln']:
                    insert_at = i + 1
            new_lines.insert(insert_at, {
                'id': f"sd-{a}.{s}.{sd['ftln']}.{sd['sub']}.{sd['stageType'][:3]}",
                'type': 'stage', 'stageType': sd['stageType'],
                'inline': sd['inline'], 'act': a, 'scene': s, 'text': sd['text'],
            })
            total += 1

        scene_data['lines'] = new_lines

with open(JSON_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print(f'Done — inserted {total} stage directions')
