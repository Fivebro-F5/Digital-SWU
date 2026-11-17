"""Generate editable foot-level collision rectangles; preserve manually authored objects."""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent / 'maps_final'

def boxes(name, category):
    if name == 'hanhong_gate_only_pixel':
        # Four piers and the outer walls; retain the central walking passage.
        return [(0.03, .83, .205, .15), (.27, .83, .105, .15), (.635, .83, .105, .15), (.775, .83, .195, .15)]
    if name == 'xingshu_a_pixel': return [(.08, .70, .84, .25)]
    if category == '01_Trees' or name.startswith('mini_tree'): return [(.43, .84, .14, .12)]
    if name.startswith('lamp_') or name in ('campus_banners', 'sign_directions', 'birdhouse', 'lantern_stone', 'bird_bath'):
        return [(.38, .86, .24, .10)]
    if name.startswith('bench_'): return [(.08, .64, .84, .28)]
    if name == 'bins_pair': return [(.12, .64, .76, .30)]
    if name == 'information_board': return [(.10,.77,.14,.19),(.76,.77,.14,.19)]
    if name in ('pergola_wisteria', 'garden_gazebo'): return [(.08,.79,.13,.17),(.79,.79,.13,.17)]
    if category == '03_Garden_Decor' and name not in ('stone_steps','stone_tiles','stepping_stones'):
        return [(.10, .58, .80, .34)]
    if name in ('low_flower_bed', 'low_azalea_hedge'): return [(.10,.60,.80,.30)]
    return []

def main():
    count = 0
    for path in sorted(ROOT.glob('*.tmx')):
        root = ET.parse(path).getroot(); definitions = {}
        for ref in root.findall('tileset'):
            tsx = path.parent / ref.get('source') if ref.get('source') else path
            ts = ET.parse(tsx).getroot() if ref.get('source') else ref
            alignment = ts.get('objectalignment','bottomleft')
            for tile in ts.findall('tile'):
                image = tile.find('image')
                if image is None: continue
                file = tsx.parent / image.get('source')
                if file.exists(): definitions[int(ref.get('firstgid')) + int(tile.get('id'))] = (file,alignment)
        group = root.find('objectgroup[@name="Collisions"]')
        if group is None:
            group = ET.SubElement(root,'objectgroup',id=root.get('nextlayerid'),name='Collisions')
            root.set('nextlayerid',str(int(root.get('nextlayerid'))+1))
        for obj in list(group):
            if obj.get('name','').startswith('auto_foot_'): group.remove(obj)
        oid = max(int(o.get('id','0')) for o in root.findall('.//object'))+1
        added = []
        for obj in root.findall('objectgroup/object[@gid]'):
            raw = int(obj.get('gid')); definition = definitions.get(raw & 0x0fffffff)
            if not definition or obj.get('visible') == '0': continue
            file,align = definition
            w,h = float(obj.get('width','0')),float(obj.get('height','0'))
            x,y = float(obj.get('x')),float(obj.get('y'))
            left = x-(w/2 if align=='bottom' else 0); top = y-h
            for i,(rx,ry,rw,rh) in enumerate(boxes(file.stem,file.parent.name)):
                if raw & 0x80000000: rx=1-rx-rw
                if raw & 0x40000000: ry=1-ry-rh
                rect = (left+rx*w,top+ry*h,rw*w,rh*h)
                # 用户校准北部中区建筑：世界 X=308..1315，Y=-2091..-1563。
                if path.name == '04_final.tmx' and obj.get('id') == '1242':
                    rect = (532, 277, 1007, 528)
                added.append(rect)
                ET.SubElement(group,'object',id=str(oid),name=f'auto_foot_{obj.get("id")}_{i}',type='solid',**dict(zip(('x','y','width','height'),(f'{v:.3f}' for v in rect))))
                oid+=1
        spawn=root.find('.//object[@name="player_start"]');sx,sy=float(spawn.get('x')),float(spawn.get('y'))
        assert not any(x<=sx<x+w and y<=sy<y+h for x,y,w,h in added), f'{path.name}: spawn blocked'
        root.set('nextobjectid',str(oid));ET.indent(root);ET.ElementTree(root).write(path,encoding='utf-8',xml_declaration=True)
        print(path.name,len(added));count+=len(added)
    print('Total collision rectangles:',count)

if __name__ == '__main__': main()
