#!/usr/bin/env python3
"""Independent sanity checks for all 6 exported TMX and Tiled JSON maps."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'map_connections.json').read_text('utf-8'))
scenes={s['id']:s for s in manifest['scenes']}
assert len(scenes)==6
for s in scenes.values():
    tmx=root/s['tmx'];js=root/s['json'];assert tmx.exists() and js.exists()
    x=ET.parse(tmx).getroot();j=json.loads(js.read_text('utf-8'))
    assert x.get('tilewidth')=='16' and x.get('tileheight')=='16' and x.get('width')=='100' and x.get('height')=='74'
    assert j['width']==100 and j['height']==74 and j['tilewidth']==16 and j['tileheight']==16
    atlas=tmx.parent/x.find('tileset/image').get('source');assert atlas.exists(),atlas
    xtiles=x.findall('layer');jtiles=[l for l in j['layers'] if l['type']=='tilelayer'];assert len(xtiles)==len(jtiles)==4
    for a,b in zip(xtiles,jtiles):
        nums=[int(q) for q in a.find('data').text.replace('\n',',').split(',') if q.strip()]
        assert len(nums)==7400 and nums==b['data'],(s['id'],a.get('name'))
    gids=sum(v['data'].count(0) for v in jtiles)
    print('OK',s['id'],s['name'],'TMX+JSON data equal | image resolves | transitions',len(s['portals']))
    for p in s['portals']:
        dest=scenes[p['to']];opposite=next((q for q in dest['portals'] if q['name']==p['arrival_portal']),None)
        assert opposite is not None and opposite['to']==s['id'],(s['id'],p)
        x,y,w,h=p['rect_px']; assert x>=0 and y>=0 and x+w<=1600 and y+h<=1184
        assert p['arrival_feet_px'][0]>=0 and p['arrival_feet_px'][1]>=0
print('PASS: six scenes, reciprocal transitions, editable Tile Map XML, standard JSON, local shared PNG atlas.')
