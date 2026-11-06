#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pixel SWU: six connected WALKABLE GROUND scenes / Tiled TMX+JSON.
Offline: python build_maps.py
Only terrain and reserved pads; actors and collision props deliberately omitted.
"""
from PIL import Image, ImageDraw, ImageFont
from collections import deque
from pathlib import Path
from xml.etree import ElementTree as ET
import json, random, csv, io, math, zipfile

ROOT=Path(__file__).resolve().parent
for p in ['maps','assets','previews']:(ROOT/p).mkdir(parents=True,exist_ok=True)
T=16; W=100; H=74; PC=48
CX=50; CY=57
SCENES=[
 ('00','hanhong_gate','含弘门一号门','入口广场 · 校门预留地','0 号点'),
 ('01','outer_approach','门外衔接区','城市人行道 · 横向车道','南侧'),
 ('02','east_camphor','东侧樟林','林下通道 · 开敞绿地','东侧'),
 ('03','west_camphor','西侧樟林','林下通道 · 文化空间','西侧'),
 ('04','memorial_steps','雕像花园与台阶','中轴花园 · 景观台阶','内侧'),
 ('05','xingshu_road','行署路北段','行署路轴线 · 建筑预留','北侧'),
]
POS={'00':(0,0),'01':(0,1),'02':(1,0),'03':(-1,0),'04':(0,-1),'05':(0,-2)}
BYID={a[0]:a for a in SCENES}
LINK={
 '00':{'north':'04','south':'01','west':'03','east':'02'},
 '01':{'north':'00'},
 '02':{'west':'00'},
 '03':{'east':'00'},
 '04':{'south':'00','north':'05'},
 '05':{'south':'04'},
}
OPP={'north':'south','south':'north','west':'east','east':'west'}
SOURCES=[
 {'name':'西南大学：含弘门（1号门）','url':'https://www.swu.edu.cn/info/1149/2090.htm','note':'确认名称'},
 {'name':'西南大学：十二干道','url':'https://www.swu.edu.cn/whxd/hjwh/segd.htm','note':'行署路从1号门连接融汇大道'},
 {'name':'西南大学：校园建设规划','url':'https://fgb.swu.edu.cn/info/1014/1131.htm','note':'1号门入口景观轴、樟林、花园台阶、主路'},
 {'name':'西南大学：一号门樟树林景观提升','url':'https://yyyl.swu.edu.cn/info/1066/4478.htm','note':'2026年樟林步道景观更新'},
 {'name':'西南大学：校园鸟瞰','url':'https://www.swu.edu.cn/','note':'校门、轴线绿化的视觉参考'},
 {'name':'西南大学：2025校园手绘图','url':'https://120th.swu.edu.cn/xyhj/xydt.htm','note':'总体校园空间参考，并非测绘底图'},
]

# Tiled atlas - each ground variation is a usable 16x16 tile, no props/trees/buildings.
BASECOL={
 'grass':('#95C679','#75AF68','#B5D994'),
 'grass_dark':('#77B16A','#619B5D','#92C680'),
 'grass_bright':('#A3CD85','#83B878','#C5E19E'),
 'grass_flower':('#96C77D','#77AC68','#B6DC91'),
 'garden':('#6C9C59','#558749','#8DB56C'),
 'sand':('#EACDA1','#D3B68D','#F6E0B8'),
 'stone':('#CCBEA0','#AEA182','#E5D6B5'),
 'plaza':('#E0BEAB','#C6A195','#F0D6C3'),
 'brick':('#CD9988','#AC786D','#E6B19D'),
 'asphalt':('#7B878A','#667579','#9DA7A9'),
 'sidewalk':('#C8C4B4','#A9A796','#E2DEC8'),
 'stairs':('#CEC3AE','#AEA28B','#E9DEC9'),
 'foundation':('#B3ADA0','#7D867C','#D2C9B5'),
 'future_pad':('#B8BCAA','#8E9D88','#D8D7C4'),
 'flower':('#A4C37B','#73A35C','#D1DF9F'),
}
# grass tiles plain: multiple variants. Other tile sets: 16 edge masks x 2 variations.
GRASS_TYPES=['grass','grass_dark','grass_bright','grass_flower','garden','flower']
PAVED_TYPES=['sand','stone','plaza','brick','asphalt','sidewalk','stairs','foundation','future_pad']
ALL_TYPES=GRASS_TYPES+PAVED_TYPES
ATLAS_COLS=16
ATLAS_TILES=[]; GID={}

HEX=lambda h:tuple(bytes.fromhex(h[1:]))

def puttile(name,mask,variant):
    idx=len(ATLAS_TILES); GID[(name,mask,variant)]=idx+1
    tile=Image.new('RGB',(T,T),HEX(BASECOL[name][0])); d=ImageDraw.Draw(tile)
    low=HEX(BASECOL[name][1]); hi=HEX(BASECOL[name][2]); bg=HEX(BASECOL[name][0]);
    rng=random.Random(152333+idx*899)
    if name in GRASS_TYPES:
        for k in range(14 if name!='garden' else 9):
            x,y=rng.randrange(1,15),rng.randrange(1,15)
            c=low if (k%3)==0 else hi
            d.point((x,y),fill=c)
            if k%4==0:d.point((min(15,x+1),y),fill=c)
        if name=='grass_flower':
            for px,py in [(5,6),(10,12)]:
                d.point((px,py),fill='#EFA39C');d.point((px+1,py),fill='#F4CE74')
        if name=='flower':
            for x,y in [(4,4),(9,6),(6,12),(12,11)]:
                d.rectangle((x,y,x+1,y+1),fill='#F7B9AE')
                d.point((x,y),fill='#FFF2BD')
        if name=='garden':
            for y in (3,10):
                d.line([(1,y),(14,y)],fill='#79A664',width=1)
        return tile
    # Specimen paver texture - low contrast small pixel scratches, readable as path
    if name in ('brick','plaza'):
        for y in [2,10]:
            d.line((0,y,15,y),fill=low,width=1)
            for x in [3+(4 if (y//8)%2 else 0),11+(4 if (y//8)%2 else 0)]:
                if x<T:d.line((x,y,x,min(15,y+6)),fill=low,width=1)
        for k in range(5):
            x,y=rng.randrange(1,15),rng.randrange(1,15);d.point((x,y),fill=hi)
    elif name in ('stone','sidewalk','stairs','foundation','future_pad'):
        if name=='stairs':
            for y in [0,5,10,15]:d.line((0,y,15,y),fill=low,width=1)
            for y in [1,6,11]:d.line((1,y,15,y),fill=hi,width=1)
        elif name in ('foundation','future_pad'):
            for x in [0,8]:d.line((x,0,x,15),fill=('#A6A996' if name=='future_pad' else low),width=1)
            for y in [0,8]:d.line((0,y,15,y),fill=('#A6A996' if name=='future_pad' else low),width=1)
            d.rectangle((2,2,5,5),outline=hi)
        else:
            d.line((0,8,15,8),fill=('#BBB29E' if name=='sidewalk' else '#BFB199'),width=1)
            d.line((8,0,8,8),fill=hi,width=1)
            d.line((1,9,1,15),fill=hi,width=1)
        for k in range(4):d.point((rng.randrange(1,15),rng.randrange(1,15)),fill=hi)
    elif name=='asphalt':
        for k in range(13):d.point((rng.randrange(1,15),rng.randrange(1,15)),fill=hi if k%3 else low)
    else: # sand
        for k in range(18):
            x,y=rng.randrange(1,15),rng.randrange(1,15)
            d.point((x,y),fill=(hi if k%4 else low))
            if k%9==0:d.point((min(15,x+1),y),fill=low)
    # edge mask: 1 north, 2 east, 4 south, 8 west. Only when neighboring GRASS.
    if name in ('foundation','future_pad'):
        edge='#7D8577';light='#E5DEC8'
    elif name=='asphalt':edge='#566C65';light='#9AA49E'
    else:edge='#78A568';light=hi
    if mask&1:
        d.line((0,0,15,0),fill=edge,width=1);d.line((0,1,15,1),fill=light,width=1)
    if mask&4:
        d.line((0,15,15,15),fill=edge,width=1);d.line((0,14,15,14),fill=light,width=1)
    if mask&8:
        d.line((0,0,0,15),fill=edge,width=1);d.line((1,0,1,15),fill=light,width=1)
    if mask&2:
        d.line((15,0,15,15),fill=edge,width=1);d.line((14,0,14,15),fill=light,width=1)
    return tile

for name in GRASS_TYPES:
    for v in range(4):ATLAS_TILES.append(puttile(name,0,v))
for name in PAVED_TYPES:
    for mask in range(16):
        for v in range(2):ATLAS_TILES.append(puttile(name,mask,v))
ROWS=math.ceil(len(ATLAS_TILES)/ATLAS_COLS)
ATLAS=Image.new('RGBA',(ATLAS_COLS*T,ROWS*T),(0,0,0,0))
for idx,tile in enumerate(ATLAS_TILES):ATLAS.paste(tile,((idx%ATLAS_COLS)*T,(idx//ATLAS_COLS)*T))
ATLAS.save(ROOT/'assets/ground_tiles_16.png')

class Zone:
    def __init__(self,scene):
        self.id,self.slug,self.name,self.subtitle,self.position=scene
        self.namefile=f'{self.id}_{self.slug}'
        self.a=[['grass']*W for _ in range(H)];self.slots=[];self.extra=[]
        self.portals=[]
        for direction,target in LINK[self.id].items():
            self.portals.append({'direction':direction,'target':target,'target_portal':OPP[direction],
                                 'name':f'exit_{direction}'})
    def mask(self,drawfn,material):
        im=Image.new('1',(W,H));d=ImageDraw.Draw(im);drawfn(d)
        for y in range(H):
            for x in range(W):
                if im.getpixel((x,y)):self.a[y][x]=material
    def r(self,mat,xy):self.mask(lambda d:d.rectangle(xy,fill=1),mat)
    def e(self,mat,xy):self.mask(lambda d:d.ellipse(xy,fill=1),mat)
    def line(self,mat,points,width):
        def draw(d):
            d.line(points,fill=1,width=width,joint='curve')
            rr=max(1,width//2)
            for x,y in points:d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=1)
        self.mask(draw,mat)
    def slot(self,xy,title,confidence='schematic',material='future_pad',note='地面预留，不是已绘制建筑；不自动阻挡角色'):
        self.r(material,xy)
        x0,y0,x1,y1=xy
        self.slots.append({'id':f'slot_{self.id}_{len(self.slots)+1:02d}','name':title,'x':x0,'y':y0,
                           'w':x1-x0+1,'h':y1-y0+1,'confidence':confidence,'note':note})
    def decorate(self):
        # terrain-only ground-cover patterns; no tree sprites, no collision objects
        rng=random.Random(772+int(self.id)*2309)
        for idx in range(160):
            x=rng.randrange(2,W-2);y=rng.randrange(2,H-2)
            if self.a[y][x]=='grass' and rng.random()<.65:
                self.a[y][x]=rng.choice(['grass_bright','grass_dark','grass_flower','grass'])
        for idx in range(20):
            x=rng.randrange(5,W-5);y=rng.randrange(5,H-5)
            if all(self.a[yy][xx]=='grass' for yy in range(y-2,y+3) for xx in range(x-2,x+3)):
                self.e(rng.choice(['grass_dark','grass_bright']),(x-2,y-1,x+2,y+1))

def make_zone(z):
    n=z.id
    # Regions are gameplay-first. Exterior vegetation is treated as WALKABLE.
    if n=='00':
        # Broad plaza and four boundary portals: north/south/east/west
        z.r('stone',(42,0,58,21))
        z.r('brick',(42,60,58,73))
        z.r('plaza',(28,44,72,64))
        z.e('plaza',(24,37,76,63))
        z.line('sand',[(0,37),(29,37),(40,45)],15)
        z.line('sand',[(99,37),(72,37),(62,46)],15)
        z.line('stone',[(50,0),(50,17),(36,26),(36,41),(48,49)],14)
        z.line('stone',[(50,0),(50,17),(64,26),(64,41),(52,49)],14)
        z.e('grass_dark',(38,19,62,41))
        z.e('garden',(40,20,60,39))
        z.e('grass_bright',(44,23,56,36))
        z.r('plaza',(42,44,58,61))
        z.r('brick',(42,59,58,73))
        # Gate columns and low masonry footprints only; no prop art
        z.slot((33,56,39,62),'一号门西侧门柱占地','verified_landmark','foundation')
        z.slot((61,56,67,62),'一号门东侧门柱占地','verified_landmark','foundation')
        z.slot((47,29,53,34),'中轴景观基座预留','schematic','future_pad')
        z.e('flower',(8,17,22,23));z.e('flower',(78,17,92,23))
    elif n=='01':
        z.r('brick',(42,0,58,21))
        z.e('plaza',(24,12,76,48))
        z.r('sidewalk',(0,46,99,53))
        z.r('asphalt',(0,54,99,68))
        z.r('sidewalk',(0,69,99,73))
        z.line('brick',[(50,0),(50,26),(50,46)],18)
        # broken center-line and pedestrian crossing as tile surface variations
        for xx in range(5,96,12):z.r('sidewalk',(xx,61,xx+5,61))
        for xx in range(43,58,4):z.r('sidewalk',(xx,54,xx+1,68))
        z.slot((7,10,24,29),'门外西侧建筑占地预留','unverified')
        z.slot((76,10,93,29),'门外东侧建筑占地预留','unverified')
        z.e('flower',(14,34,29,42));z.e('flower',(72,33,87,42))
    elif n=='02':
        z.line('sand',[(0,37),(29,37),(44,40),(68,35),(88,28)],14)
        z.line('stone',[(45,40),(57,51),(75,60)],10)
        z.e('plaza',(55,19,85,40))
        z.e('garden',(57,21,83,36))
        z.line('sand',[(48,40),(65,32),(90,28)],9)
        z.line('sand',[(56,41),(63,48),(75,60)],9)
        z.slot((9,7,26,20),'樟林边缘预留地 A','unverified')
        z.slot((75,50,91,64),'樟林东侧建筑预留','unverified')
        for bx,by in [(15,49),(27,60),(45,12),(88,12)]:z.e('grass_dark',(bx-7,by-4,bx+7,by+4))
        for bx,by in [(28,14),(36,55),(86,45)]:z.e('flower',(bx-3,by-2,bx+4,by+2))
        # Guarantee open east-facing passage across seam
        z.r('sand',(0,30,15,44))
    elif n=='03':
        z.line('sand',[(99,37),(72,37),(55,43),(30,32),(12,21)],14)
        z.line('stone',[(54,43),(39,55),(20,62)],10)
        z.e('plaza',(14,14,45,37))
        z.e('grass_dark',(17,17,39,33))
        z.line('sand',[(0,25),(14,24),(28,30),(55,42)],9)
        z.line('sand',[(51,43),(37,54),(20,61)],9)
        z.slot((9,41,26,55),'樟林西侧活动空间预留','unverified')
        z.slot((69,9,89,22),'周边建筑占地预留','unverified')
        for bx,by in [(18,11),(64,59),(76,55),(51,12)]:z.e('grass_dark',(bx-7,by-4,bx+7,by+4))
        for bx,by in [(44,23),(17,66),(64,22)]:z.e('flower',(bx-4,by-2,bx+4,by+2))
        z.r('sand',(84,30,99,44))
    elif n=='04':
        # Monument/steps region begins at 00 north and leads to 05 along main axis.
        z.r('stone',(42,0,58,73))
        z.e('plaza',(25,25,75,62))
        z.r('stone',(33,26,67,63))
        z.r('stairs',(40,17,60,24))
        z.line('stone',[(50,0),(50,15)],16)
        z.line('stone',[(50,62),(50,73)],16)
        z.e('garden',(37,35,63,57))
        z.e('grass_bright',(39,37,61,55))
        z.line('stone',[(35,58),(30,44),(37,30),(44,23)],11)
        z.line('stone',[(65,58),(70,44),(63,30),(56,23)],11)
        z.slot((46,43,54,51),'毛泽东雕像 / 景观基座预留','landmark_position_approx','foundation')
        z.slot((8,10,25,26),'西侧建筑预留地','unverified')
        z.slot((75,10,92,26),'东侧建筑预留地','unverified')
        z.e('flower',(10,34,25,45));z.e('flower',(75,34,90,45))
        z.r('stone',(42,0,58,14))
        z.r('stone',(42,64,58,73))
    elif n=='05':
        z.r('stone',(42,0,58,73))
        z.e('plaza',(25,25,75,50))
        z.r('stone',(32,31,68,44))
        z.line('stone',[(50,0),(50,73)],16)
        z.line('sand',[(0,37),(23,37),(39,37)],12)
        z.line('sand',[(99,37),(77,37),(60,37)],12)
        z.slot((9,7,32,25),'行署楼片区建筑基座预留（需实地复核）','landmark_area_approx')
        z.slot((68,8,91,26),'行署路沿线建筑预留','unverified')
        z.slot((12,53,28,65),'西侧次级建筑预留','unverified')
        z.slot((73,53,88,65),'东侧次级建筑预留','unverified')
        z.e('garden',(14,29,26,35));z.e('garden',(74,45,86,51))
        z.e('flower',(27,54,39,59));z.e('flower',(61,54,73,59))
        z.r('stone',(42,0,58,11));z.r('stone',(42,62,58,73))
    z.decorate()
    # Keep portals consistent across all 6 scene boundaries, regardless of decorative fill
    for dire in LINK[n]:
        if dire=='north':z.r('stone',(42,0,58,3))
        elif dire=='south':z.r('brick' if n=='00' else 'stone',(42,70,58,73))
        elif dire=='west':z.r('sand',(0,30,4,44))
        elif dire=='east':z.r('sand',(95,30,99,44))
    if n=='01':z.r('brick',(42,0,58,3))
    if n=='04':z.r('stone',(42,70,58,73))
    if n=='05':z.r('stone',(42,70,58,73))
    return z

def layers_for(z):
    arrays={label:[0]*(W*H) for label in ['Ground','Landscape','Roads','BuildingPads']}
    rng=random.Random(1014+int(z.id)*3547)
    for y in range(H):
        for x in range(W):
            typ=z.a[y][x];k=y*W+x
            arrays['Ground'][k]=GID[('grass',0,rng.randrange(4))]
            if typ in GRASS_TYPES:
                if typ!='grass':arrays['Landscape'][k]=GID[(typ,0,rng.randrange(4))]
                continue
            mask=0
            for dx,dy,bit in [(0,-1,1),(1,0,2),(0,1,4),(-1,0,8)]:
                tx,ty=x+dx,y+dy
                if 0<=tx<W and 0<=ty<H and z.a[ty][tx] in GRASS_TYPES:mask|=bit
            gid=GID[(typ,mask,rng.randrange(2))]
            if typ in ('foundation','future_pad'):arrays['BuildingPads'][k]=gid
            else:arrays['Roads'][k]=gid
    return arrays

# Portal objects are uniformly 14 tiles wide so crossings avoid seam mismatches.
def portal_rect(dire):
    if dire=='north': return [42,0,17,4]
    if dire=='south': return [42,70,17,4]
    if dire=='west': return [0,30,5,15]
    if dire=='east': return [95,30,5,15]
    raise ValueError(dire)

def spawn_incoming(dire):
    # position represents the player's FOOT POINT, inside the destination region
    return {'north':(50,7),'south':(50,66),'west':(10,37),'east':(89,37)}[dire]

def props_xml(parent, values):
    p=ET.SubElement(parent,'properties')
    for key,v in values.items():
        if isinstance(v,bool):ET.SubElement(p,'property',name=key,type='bool',value='true' if v else 'false')
        elif isinstance(v,int):ET.SubElement(p,'property',name=key,type='int',value=str(v))
        else:ET.SubElement(p,'property',name=key,value=str(v))

def pjson(p):
    ans=[]
    for k,v in p.items():
        typ='bool' if isinstance(v,bool) else 'int' if isinstance(v,int) else 'string'
        ans.append({'name':k,'type':typ,'value':v})
    return ans


def export_zone(z):
    arrays=layers_for(z); world_col,world_row=POS[z.id]; global_tile0=(world_col*W-CX,world_row*H-CY)
    m=ET.Element('map',{'version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal',
                        'renderorder':'right-down','width':str(W),'height':str(H),'tilewidth':str(T),'tileheight':str(T),
                        'infinite':'0','nextlayerid':'8','nextobjectid':'100','backgroundcolor':'#95C679'})
    props_xml(m,{'scene_id':z.id,'scene_name':z.name,'origin_anchor':'含弘门通道中心为世界(0,0)',
                 'world_origin_x_px':global_tile0[0]*T,'world_origin_y_px':global_tile0[1]*T,
                 'player_sprite_width':PC,'player_sprite_height':PC,'tile_scale':T,
                 'ground_only':True,'scenery_collision_layer':'not_added_yet'})
    ts=ET.SubElement(m,'tileset',{'firstgid':'1','name':'swu_terrain_16',
      'tilewidth':str(T),'tileheight':str(T),'tilecount':str(len(ATLAS_TILES)),'columns':str(ATLAS_COLS)})
    ET.SubElement(ts,'image',source='../assets/ground_tiles_16.png',width=str(ATLAS.width),height=str(ATLAS.height))
    for idx,(name,data) in enumerate(arrays.items(),1):
        L=ET.SubElement(m,'layer',{'id':str(idx),'name':name,'width':str(W),'height':str(H)})
        dt=ET.SubElement(L,'data',encoding='csv');dt.text='\n'+ '\n'.join(','.join(map(str,data[y*W:(y+1)*W]))+',' for y in range(H)).rstrip(',')+'\n'
    oid=1
    spots=ET.SubElement(m,'objectgroup',id='5',name='BuildingSlots',visible='0',color='#D9B768')
    for slot in z.slots:
        ob=ET.SubElement(spots,'object',id=str(oid),name=slot['id'],type='building_slot',x=str(slot['x']*T),y=str(slot['y']*T),width=str(slot['w']*T),height=str(slot['h']*T))
        props_xml(ob,{'display_name':slot['name'],'confidence':slot['confidence'],'note':slot['note'],
                     'future_collision':True,'currently_walkable':True})
        oid+=1
    portals=ET.SubElement(m,'objectgroup',id='6',name='Portals',visible='0',color='#4CA3D9')
    for exitob in z.portals:
        rect=portal_rect(exitob['direction']);target_id=exitob['target'];going_to=OPP[exitob['direction']]
        ex,ey=spawn_incoming(going_to)
        ob=ET.SubElement(portals,'object',id=str(oid),name=exitob['name'],type='scene_portal',
                         x=str(rect[0]*T),y=str(rect[1]*T),width=str(rect[2]*T),height=str(rect[3]*T))
        props_xml(ob,{'direction':exitob['direction'],'target_scene':target_id,'target_portal':'exit_'+going_to,
                      'spawn_x_px':ex*T,'spawn_y_px':ey*T,'trigger':'cross_map_edge','enabled':True})
        oid+=1
    sp=ET.SubElement(m,'objectgroup',id='7',name='Spawn',visible='0',color='#74B877')
    sx,sy=({ '00':(50,56),'01':(50,14),'02':(16,37),'03':(84,37),'04':(50,66),'05':(50,64) }[z.id])
    ob=ET.SubElement(sp,'object',id=str(oid),name='player_start',type='spawn',x=str(sx*T),y=str(sy*T),width='0',height='0')
    props_xml(ob,{'feet_position':True,'sprite_width':PC,'sprite_height':PC})

    targettmx=ROOT/'maps'/f'{z.namefile}.tmx'
    ET.indent(m,space='  ')
    ET.ElementTree(m).write(targettmx,encoding='utf-8',xml_declaration=True)
    jtiles=[]
    for i,(name,data) in enumerate(arrays.items(),1):
        jtiles.append({'id':i,'name':name,'type':'tilelayer','visible':True,'opacity':1,
                       'x':0,'y':0,'width':W,'height':H,'data':data})
    spobj=[]
    for j,slot in enumerate(z.slots,1):
        spobj.append({'id':j,'name':slot['id'],'type':'building_slot','x':slot['x']*T,'y':slot['y']*T,
                      'width':slot['w']*T,'height':slot['h']*T,'rotation':0,'visible':True,
                      'properties':pjson({'display_name':slot['name'],'confidence':slot['confidence'],
                      'note':slot['note'],'future_collision':True,'currently_walkable':True})})
    ptobj=[]
    for j,p in enumerate(z.portals,1+len(spobj)):
        rect=portal_rect(p['direction']);target=p['target'];going_to=OPP[p['direction']];sx2,sy2=spawn_incoming(going_to)
        ptobj.append({'id':j,'name':p['name'],'type':'scene_portal','x':rect[0]*T,'y':rect[1]*T,
           'width':rect[2]*T,'height':rect[3]*T,'rotation':0,'visible':True,
           'properties':pjson({'direction':p['direction'],'target_scene':target,'target_portal':'exit_'+going_to,
                               'spawn_x_px':sx2*T,'spawn_y_px':sy2*T,'trigger':'cross_map_edge','enabled':True})})
    pspawn={'id':len(spobj)+len(ptobj)+1,'name':'player_start','type':'spawn',
            'x':sx*T,'y':sy*T,'width':0,'height':0,'rotation':0,'visible':True,
            'properties':pjson({'feet_position':True,'sprite_width':PC,'sprite_height':PC})}
    for li,name,objects in [(5,'BuildingSlots',spobj),(6,'Portals',ptobj),(7,'Spawn',[pspawn])]:
        jtiles.append({'id':li,'name':name,'type':'objectgroup','visible':False,'opacity':1,'draworder':'topdown',
                       'x':0,'y':0,'objects':objects})
    tj={'type':'map','version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down',
        'width':W,'height':H,'tilewidth':T,'tileheight':T,'infinite':False,'compressionlevel':-1,
        'nextlayerid':8,'nextobjectid':100,'backgroundcolor':'#95c679',
        'properties':pjson({'scene_id':z.id,'scene_name':z.name,'world_origin_x_px':global_tile0[0]*T,
                             'world_origin_y_px':global_tile0[1]*T,'player_sprite_width':PC,
                             'player_sprite_height':PC,'tile_scale':T,'ground_only':True}),
        'tilesets':[{'firstgid':1,'name':'swu_terrain_16','tilewidth':T,'tileheight':T,
                     'tilecount':len(ATLAS_TILES),'columns':ATLAS_COLS,'image':'../assets/ground_tiles_16.png',
                     'imagewidth':ATLAS.width,'imageheight':ATLAS.height,'margin':0,'spacing':0}], 'layers':jtiles}
    with open(ROOT/'maps'/f'{z.namefile}.json','w',encoding='utf8') as f:json.dump(tj,f,ensure_ascii=False,separators=(',',':'))
    return tj

FONT_REG=None;FONT_BOLD=None
for fname in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/truetype/wqy/wqy-microhei.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
    if Path(fname).exists():
        try:
            FONT_REG=ImageFont.truetype(fname,24);FONT_BOLD=ImageFont.truetype(fname,32);break
        except:pass
if FONT_REG is None:FONT_REG=ImageFont.load_default();FONT_BOLD=FONT_REG

def render_zone(z,tj):
    canvas=Image.new('RGB',(W*T,H*T),HEX(BASECOL['grass'][0]))
    for layer in tj['layers']:
        if layer['type']!='tilelayer':continue
        for iy,gid in enumerate(layer['data']):
            if not gid:continue
            idx=gid-1;x=(iy%W)*T;y=(iy//W)*T
            canvas.paste(ATLAS_TILES[idx],(x,y))
    canvas.save(ROOT/'previews'/f'{z.namefile}_clean.png')
    # annotate OUTSIDE the original tile data; in-game TMX remains art-only
    ov=canvas.copy().convert('RGBA');d=ImageDraw.Draw(ov,'RGBA')
    for s in z.slots:
        r=(s['x']*T,s['y']*T,(s['x']+s['w'])*T,(s['y']+s['h'])*T)
        d.rectangle(r,outline=(76,95,91,218),width=3)
        label=s['name'].replace('（需实地复核）','').replace('建筑基座','').replace('建筑占地','')
        if len(label)>12:label=label[:11]+'…'
        textbbox=d.textbbox((0,0),label,font=FONT_REG)
        textw=textbbox[2]-textbbox[0]
        if r[2]-r[0] < textw+10:label='建筑预留地' if '建筑' in label else label[:6]
        d.text((r[0]+6,r[1]+6),label,font=FONT_REG,fill=(42,67,62,239),stroke_width=1,stroke_fill=(239,238,213,180))
    for p in z.portals:
        x,y,w,h=portal_rect(p['direction']);r=(x*T,y*T,(x+w)*T,(y+h)*T)
        d.rectangle(r,fill=(68,145,170,35),outline=(22,103,149,180),width=3)
        title={'north':'北','south':'南','east':'东','west':'西'}[p['direction']]
        text=f'出口 → {p["target"]} ({title})'
        x0=max(10,min(r[0]+8,W*T-250));y0=max(10,min(r[1]+8,H*T-45))
        d.rounded_rectangle((x0,y0,x0+220,y0+36),radius=8,fill=(31,61,62,208))
        d.text((x0+10,y0+3),text,font=FONT_REG,fill=(246,255,244,255))
    band=Image.new('RGBA',(W*T,84),(26,58,52,236));bd=ImageDraw.Draw(band)
    bd.text((25,12),f'{z.id}  {z.name}',font=FONT_BOLD,fill=(248,246,225,255))
    bd.text((25,50),z.subtitle+'  ·  16×16 tiles  /  玩家 48×48',font=FONT_REG,fill=(219,239,215,255))
    ov.alpha_composite(band,(0,0))
    ov.convert('RGB').save(ROOT/'previews'/f'{z.namefile}_annotated.png')
    thumb=ov.convert('RGB').resize((800,592),Image.Resampling.NEAREST)
    return canvas,thumb

ZONES=[make_zone(Zone(s)) for s in SCENES]
JSONS={};THUMBS={}
for z in ZONES:
    tj=export_zone(z);JSONS[z.id]=tj
    _,thumb=render_zone(z,tj);THUMBS[z.id]=thumb

# 6-scene visual contact sheet, readable scene captions & mini previews.
CW=1720;CH=1550
sheet=Image.new('RGB',(CW,CH),'#F5F3E9');d=ImageDraw.Draw(sheet)
heading='像素西大 · 一号门周边六场景  /  GROUND ONLY'
d.text((42,29),heading,font=ImageFont.truetype(FONT_REG.path,39) if hasattr(FONT_REG,'path') else FONT_BOLD,fill='#253F36')
d.text((46,83),'真实地标参考 × 游戏化矩形分区  |  48×48角色 · 16×16瓦片 · 每场景100×74格',font=FONT_REG,fill='#577364')
for i,z in enumerate(ZONES):
    col=i%3;row=i//3;x=40+col*566;y=135+row*697
    d.rounded_rectangle((x-8,y-8,x+540,y+652),radius=10,fill='#FFFFFF',outline='#B9C6AC',width=2)
    im=THUMBS[z.id].resize((520,520*H//W),Image.Resampling.NEAREST)
    sheet.paste(im,(x,y+60))
    d.text((x+4,y+5),z.id+'  '+z.name,font=FONT_BOLD,fill='#31594B')
    d.text((x+4,y+43),z.subtitle,font=FONT_REG,fill='#708477')
    p=' / '.join(f'{a.upper()}→{b}' for a,b in LINK[z.id].items())
    d.text((x+4,y+60+H*520//W+16),p,font=FONT_REG,fill='#557767')
    d.text((x+4,y+60+H*520//W+48),'底图可走 | 建筑仅占地预留 | 无碰撞物',font=FONT_REG,fill='#879385')
sheet.save(ROOT/'previews'/'six_scenes_overview.png')

# graph diagram with six rectangles and game origin.
geom={'05':(616,90),'04':(616,287),'03':(206,493),'00':(616,493),'02':(1026,493),'01':(616,700)}
G=Image.new('RGB',(1590,1060),'#F3F3E8');gd=ImageDraw.Draw(G)
gd.text((100,22),'六区场景连接图 / Scene Graph',font=ImageFont.truetype(FONT_REG.path,45) if hasattr(FONT_REG,'path') else FONT_BOLD,fill='#304F43')
for a,b in [('05','04'),('04','00'),('00','01'),('03','00'),('00','02')]:
    x,y=geom[a];xx,yy=geom[b]
    gd.line((x+165,y+86,xx+165,yy+86),fill='#759A83',width=17)
for zone in ZONES:
    x,y=geom[zone.id]
    gd.rounded_rectangle((x,y,x+330,y+173),radius=13,fill='#D6E9CE' if zone.id=='00' else '#FFFEF2',outline='#638F76',width=4)
    gd.text((x+20,y+12),zone.id,font=FONT_BOLD,fill='#31564B')
    gd.text((x+20,y+63),zone.name,font=FONT_BOLD,fill='#31564B')
    gd.text((x+20,y+113),zone.subtitle,font=FONT_REG,fill='#657969')
gd.text((284,985),'游戏世界零点：00 含弘门中心通道  |  每张图 1600 × 1184 px  |  蓝色出口为换场区域',font=FONT_REG,fill='#507263')
G.save(ROOT/'previews'/'scene_graph.png')

# user-friendly lightweight graph (exact coordinates, reciprocal edges).
manifest={'project':'像素西大 / 六场景地形地图','version':'1.0','reference_scope':'real landmarks, approximate gameplay layout',
          'is_survey_grade':False,'tile_size_px':T,'player_sprite_px':[PC,PC],
          'player_collision_footprint_px_suggestion':[22,14],
          'scene_tiles':[W,H],'scene_pixels':[W*T,H*T],
          'origin':{'scene_id':'00','anchor_tile':[CX,CY], 'world_pixel':[0,0],
                    'note':'含弘门入口通道中心为 0 点；向北世界 y 为负'},
          'design_notes':['所有草地与绿化地被默认可走','未添加树/路灯/建筑/实体碰撞','建筑仅是未来摆放的预留地面占位',
                         '矩形分区与道路距离为游戏化设计，不能作为校园导航测绘图',
                         '地图之间出口的宽度和铺地类型在边界一致'],
          'sources':SOURCES,'scenes':[]}
for z in ZONES:
    rr,cc=POS[z.id][1],POS[z.id][0]
    origin=[(cc*W-CX)*T,(rr*H-CY)*T]
    item={'id':z.id,'name':z.name,'slug':z.slug,'subtitle':z.subtitle,
          'grid_position':[cc,rr],'world_top_left_px':origin,
          'tmx':f'maps/{z.namefile}.tmx','json':f'maps/{z.namefile}.json',
          'preview':f'previews/{z.namefile}_annotated.png',
          'spawn_px':[(lambda o:o['x'])(next(o for a in JSONS[z.id]['layers'] if a['name']=='Spawn' for o in a['objects'])),(lambda o:o['y'])(next(o for a in JSONS[z.id]['layers'] if a['name']=='Spawn' for o in a['objects']))],
          'building_slots':z.slots,'portals':[]}
    for p in z.portals:
        x,y,w,h=portal_rect(p['direction'])
        sx,sy=spawn_incoming(OPP[p['direction']])
        item['portals'].append({'name':'exit_'+p['direction'],'direction':p['direction'],
                   'rect_px':[x*T,y*T,w*T,h*T], 'to':p['target'],
                   'arrival_portal':'exit_'+OPP[p['direction']], 'arrival_feet_px':[sx*T,sy*T]})
    manifest['scenes'].append(item)
with open(ROOT/'map_connections.json','w',encoding='utf8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)

# Validate tile sources, xml, json, and boundary contracts
for z in ZONES:
    xml=ET.parse(ROOT/'maps'/f'{z.namefile}.tmx');top=xml.getroot()
    layers=top.findall('layer');assert len(layers)==4
    for l in layers:
        data=l.find('data').text
        values=[int(x) for x in data.replace('\n',',').split(',') if x.strip()]
        assert len(values)==W*H,(z.id,l.attrib.get('name'),len(values))
    assert sum(1 for v in JSONS[z.id]['layers'] if v['type']=='tilelayer')==4
    for p in z.portals:
        assert p['target'] in LINK and OPP[p['direction']] in LINK[p['target']]
        assert LINK[p['target']][OPP[p['direction']]]==z.id
        # Compare border material across direction; exact widths, not random texture GIDs
        target=next(zz for zz in ZONES if zz.id==p['target'])
        if p['direction']=='north':
            assert [z.a[0][x] for x in range(42,59)]==[target.a[73][x] for x in range(42,59)]
        elif p['direction']=='south':
            assert [z.a[73][x] for x in range(42,59)]==[target.a[0][x] for x in range(42,59)]
        elif p['direction']=='east':
            assert [z.a[y][99] for y in range(30,45)]==[target.a[y][0] for y in range(30,45)]
        else:
            assert [z.a[y][0] for y in range(30,45)]==[target.a[y][99] for y in range(30,45)]
print('SUCCESS:',len(ZONES),'TMX +',len(JSONS),'JSON; atlas',ATLAS.size,';',sum(len(z.slots) for z in ZONES),'reserved slots; reciprocal portal checks OK')
