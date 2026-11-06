from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from lxml import etree as ET
import numpy as np, random, math, json, csv, os, shutil, zipfile

ROOT=Path(__file__).resolve().parent
A=ROOT/'assets'; A.mkdir(exist_ok=True)
SRC=A/'original_generated_sheet.png'
source=Image.open(SRC).convert('RGBA')
# Generated pixel-art assets, segmented from original alpha PNG.
regions={
 'statue_garden':(78,21,664,391,300,189),
 'historic_building_concept':(672,47,1523,387,468,187),
 'gate_left':(44,399,518,992,190,238),
 'gate_right':(636,400,1107,991,190,238),
 'broadleaf_tree':(1050,430,1367,752,104,105),
 'cypress':(1374,420,1496,758,44,121),
 'stone_sign':(1116,809,1517,979,230,96),
}
sprites={}
for name,(x1,y1,x2,y2,w,h) in regions.items():
 crop=source.crop((x1,y1,x2,y2))
 arr=np.array(crop)
 arr[:,:,3][arr[:,:,3]<40]=0
 crop=Image.fromarray(arr,'RGBA')
 # BOX is the most faithful reduction while retaining texture and edge readability.
 crop=crop.resize((w,h),Image.Resampling.BOX)
 # 东侧门柱裁切框带入了邻近树冠，清除残片并保留原画布尺寸。
 if name=='gate_right':
  crop.paste((0,0,0,0),(170,32,190,99))
 crop.save(A/f'{name}.png')
 sprites[name]=(w,h)

# Pixel-style sidewalk props and top-down terrain drawn with exact-color pixels.
random.seed(24)
PAL={
 'grass':'#91bd77','grass2':'#9bc684','grass3':'#85b372', 'deep':'#6a995d',
 'cream':'#dec9a7','cream2':'#ead3b1','cobble':'#c9bda3', 'pave':'#b9b5a7',
 'stone':'#9fa3a0','stone2':'#8c9295','red':'#c86e62', 'red2':'#d77d6f',
 'red_dark':'#ae6159','asphalt':'#777b7b','hedge':'#487a41','hedge2':'#60924c',
 'flower':'#da95b6','flower2':'#f3d08d','water':'#478a9f','soil':'#b68a64'
}
ATLAS_COLS=16; ATLAS_ROWS=8; TILE=16
atlas=Image.new('RGBA',(ATLAS_COLS*TILE,ATLAS_ROWS*TILE),(0,0,0,0))

def tile_at(index,base,detail=None,seed=0):
 t=Image.new('RGBA',(16,16),base); d=ImageDraw.Draw(t); r=random.Random(seed+index*31)
 if detail=='grass':
  for j in range(11):
   x,y=r.randint(0,15),r.randint(0,15)
   c=r.choice(['#78aa68','#acd28d','#71a463','#b2d493']);d.point((x,y),fill=c)
   if j%3==0 and x<15:d.point((x+1,y),fill=c)
 if detail=='ground':
  for j in range(6):
   x,y=r.randint(0,15),r.randint(0,15);d.line([(x,y),(min(15,x+2),y)],fill=r.choice(['#c6c0b0','#d6d0be','#afa99a']),width=1)
 if detail=='stone':
  for x in [0,8,15]:d.line((x,0,x,15),fill='#9ca09d',width=1)
  d.line((0,7,15,7),fill='#989d9b',width=1)
 if detail=='red':
  for _ in range(8):d.point((r.randrange(16),r.randrange(16)),fill=r.choice(['#a95652','#e38b78','#bd685e']))
 if detail=='soil':
  for _ in range(9):d.point((r.randrange(16),r.randrange(16)),fill=r.choice(['#a67d5c','#cd9d72']))
 if detail=='hedge':
  d.rectangle((0,2,15,15),fill='#447c3f');d.rectangle((1,0,14,11),fill='#61984b')
  for _ in range(12):d.point((r.randrange(16),r.randrange(12)),fill=r.choice(['#7daa5c','#326c37','#8cb966']))
 if detail=='flower':
  d.rectangle((0,0,15,15), fill=PAL['deep'])
  for _ in range(10):
   x,y=r.randrange(16),r.randrange(16);d.ellipse((x,y,x+2,y+2),fill=r.choice(['#e5a2ca','#f1bfd2','#f4dc86']))
 if detail=='brick':
  d.line((0,7,15,7),fill='#b86156');d.line((8,0,8,7),fill='#b86156');d.line((0,8,0,15),fill='#b86156');
 if detail=='stairs':
  d.rectangle((0,0,15,4),fill='#e3d6c2');d.rectangle((0,5,15,8),fill='#aba79f');d.rectangle((0,9,15,12),fill='#d5d0c3');d.rectangle((0,13,15,15),fill='#8e8f8d')
 if detail=='gravel':
  for j in range(10):d.point((r.randrange(16),r.randrange(16)), fill='#c0b39d')
 if detail=='crossing':
  d.rectangle((3,0,7,15),fill='#ece8dd');d.rectangle((11,0,15,15),fill='#ece8dd')
 if detail=='curb':
  d.rectangle((0,0,15,3),fill='#e6d8c4');d.rectangle((0,4,15,6),fill='#a9a69e')
 if detail=='puddle':
  d.ellipse((3,5,13,11),fill='#6693a5');d.ellipse((5,6,11,8),fill='#8fb3c0')
 if detail=='leaf':
  for i in range(10):
   x,y=r.randrange(16),r.randrange(16);d.rectangle((x,y,x+2,y+1),fill=r.choice(['#5c8f50','#73a965','#a2c96c']))
 if detail=='grid':
  d.rectangle((0,0,15,15),outline='#e5dac7');d.line((0,7,15,7),fill='#b9ae9c')
 atlas.alpha_composite(t,((index%16)*16,(index//16)*16))

spec=[
 ('#92bc79','grass'),('#9ac381','grass'),('#89b572','grass'),('#9bc585','grass'),('#75a96b','grass'),
 ('#6b985c','grass'),('#d8c2a3','ground'),('#e5d2b4','ground'),('#b5b6af','stone'),('#9ca4a1','stone'),
 ('#ca7265','red'),('#d17b6d','red'),('#b96c63','red'),('#797c7c','ground'),('#b48d6c','soil'),('#a4bc78','grass'),
 ('#cfbd9f','ground'),('#e2d0b1','ground'),('#b4b0a5','ground'),('#c8c2b5','ground'),('#6a9858','grass'),
 ('#477b3d','hedge'),('#5b8c47','hedge'),('#628f4b','hedge'),('#6c9959','flower'),('#6c9959','flower'),
 ('#bd8b67','soil'),('#988f81','ground'),('#bd8970','red'),('#ddcaa8','ground'),('#a3b778','grass'),('#bed49d','grass'),
 ('#90b873','leaf'),('#96c183','leaf'),('#b1c894','leaf'),('#889f68','grass'),('#c9b495','gravel'),
 ('#dfd5c3','grid'),('#d0c9b9','grid'),('#b8a994','ground'),('#d8d1c5','stairs'),('#d5cdbf','stairs'),
 ('#b7b3a6','ground'),('#9b958c','ground'),('#b4ae9e','ground'),('#9e9c90','stone'),('#d2c6ad','curb'),('#bfbaa5','curb'),
 ('#a18f81','brick'),('#c6b9a5','brick'),('#ac9d8c','brick'),('#d5c7b1','brick'),('#c9bcaa','gravel'),('#c6aa89','ground'),
 ('#7ca46e','leaf'),('#56884d','hedge'),('#eccebb','flower'),('#b5c58e','grass'),('#649c67','leaf'),('#59884d','hedge'),
 ('#d9be9f','ground'),('#a4a4a4','stone'),('#dad0be','curb'),('#d8a997','red'),('#bb705e','red'),
 ('#97a580','grass'),('#d6c59e','gravel'),('#bd9a7d','soil'),('#aaa79a','stone'),('#909389','ground'),('#8c956e','grass'),
 ('#ccaa8a','soil'),('#9baf78','grass'),('#a5c17b','grass'),('#bcb7aa','grid'),('#a4ac94','grass'),
 ('#f0d4b6','ground'),('#eac9a1','ground'),('#c8c0ab','stone'),('#a8ada4','stone'),('#b5b9a9','ground'),
 ('#889b83','grass'),('#d8c1ae','ground'),('#cbbeaa','ground'),('#86847e','stone'),('#b6a997','ground'),
 ('#bdc69b','grass'),('#a9bc8e','grass'),('#cd9e80','soil'),('#c89a77','soil'),('#dad3c1','ground'),
 ('#c7c0b1','grid'),('#eee5d4','crossing'),('#eddfc2','ground'),('#788778','leaf'),('#6f886e','grass'),
 ('#90a27f','grass'),('#b0be94','grass'),('#a6b894','grass'),('#a29c8b','stone'),('#cdc1ac','curb'),
 ('#d1bda4','ground'),('#a39e8f','ground'),('#b4bd91','grass'),('#8ca26e','grass'),('#c8bda5','ground'),
 ('#bb9d81','ground'),('#8e8a84','stone'),('#e1d5bd','ground'),('#aca796','ground'),('#a2a990','grass'),
 ('#89987d','grass'),('#f0d6bc','ground'),('#eee0ca','ground'),('#b1b4a7','ground'),('#b6b39e','ground'),
 ('#b0be90','grass'),('#a8af8e','grass'),('#c5bba3','ground'),('#d3c2ae','ground'),('#e0d5c0','ground'),
 ('#89976f','grass'),('#c7beae','ground'),('#bfb8a7','ground'),('#b9c6a2','grass'),('#e8d8c5','ground')]
spec=(spec + [('#91bd77','grass')]*128)[:128]
for i,(bg,dt) in enumerate(spec):tile_at(i,bg,dt,35)
atlas.save(A/'terrain_tileset.png')

# Supplementary top-down props rendered in genuine 1px pixel resolution.
def make_prop(name,w,h,draw_fn):
 im=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(im);draw_fn(d);im.save(A/name);sprites[name[:-4]]=(w,h)

def bench(d):
 d.rectangle((4,6,40,17),fill='#805a43');d.rectangle((5,5,39,8),fill='#b78c62');d.rectangle((5,11,39,13),fill='#c99c6d');
 for x in [9,35]:d.rectangle((x,17,x+2,23),fill='#4b5654')
make_prop('bench.png',48,24,bench)
def lamppost(d):
 d.ellipse((15,0,25,10),fill='#faf0bc',outline='#6d6556',width=2);d.rectangle((18,8,21,42),fill='#4c5453');d.rectangle((15,39,25,44),fill='#343e3d')
make_prop('lamppost.png',40,48,lamppost)
def flowerbed(d):
 d.ellipse((1,9,82,40),fill='#a48c6c',outline='#e2d6bf',width=3);d.ellipse((6,6,77,33),fill='#488143')
 r=random.Random(17)
 for i in range(47):
  x=r.randrange(11,76);y=r.randrange(10,32)
  if ((x-41)/38)**2 + ((y-20)/14)**2 < 1:
   d.rectangle((x,y,x+3,y+2),fill=r.choice(['#e4adc5','#f1d27c','#f0b4bd','#c9dd84']))
make_prop('flowerbed.png',84,44,flowerbed)
def notice(d):
 d.rectangle((19,2,27,39),fill='#536b57');d.rectangle((1,2,45,27),fill='#536f60',outline='#f0deae',width=2);d.rectangle((6,8,40,23),fill='#e9ddbd');
 for y in [11,15,19]:d.line((10,y,37,y),fill='#ab8e6f',width=1)
make_prop('noticeboard.png',48,42,notice)

# World map terrain geometry: entrance axis reconstructed for gameplay, not geodetic.
W,H=96,84;PXW=W*16;PXH=H*16
rng=random.Random(2026)
ground=[[1+rng.randrange(4) for x in range(W)] for y in range(H)]
paths=[[0]*W for _ in range(H)]
decor=[[0]*W for _ in range(H)]

def put_rect(layer,x1,y1,x2,y2,val):
 for yy in range(max(0,y1),min(H,y2)):
  for xx in range(max(0,x1),min(W,x2)):layer[yy][xx]=val

def put_ellipse(layer,cx,cy,rx,ry,val):
 for y in range(max(0,int(cy-ry)-1),min(H,int(cy+ry)+2)):
  for x in range(max(0,int(cx-rx)-1),min(W,int(cx+rx)+2)):
   if ((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1:layer[y][x]=val

# Outer woodland gradients
for y in range(H):
 for x in range(W):
  if x<30 or x>66:
   ground[y][x]=[4,5,20,15][rng.randrange(4)] if y<69 else [1,2,3][rng.randrange(3)]
  if y<8:ground[y][x]=[3,4,5,20][rng.randrange(4)]
# historic building forecourt and central approach
put_rect(paths,34,11,62,25,7)
put_rect(paths,42,24,54,31,17)
put_rect(paths,44,29,52,38,16)
put_rect(paths,42,35,54,42,16)
# grand stair near north end
put_rect(paths,39,28,57,33,40)
# paths left right of landscape island
put_rect(paths,32,38,40,64,18)
put_rect(paths,56,38,64,64,18)
put_rect(paths,35,36,61,39,7)
# roundabout ellipse apron behind gate
put_ellipse(paths,48,53,21,13,17)
# garden island to be sprite-drawn on surface
put_ellipse(paths,48,51,11.6,9.0,0)
# Keep left/right walking loops connected
put_rect(paths,34,55,40,69,18)
put_rect(paths,56,55,62,69,18)
# small central lane to statue/front access to gate
put_rect(paths,43,59,53,73,17)
# paved southern courtyard behind gateway
put_rect(paths,23,63,73,73,7)
# outer street, red pavement, white painted stripes
put_rect(paths,0,73,96,84,11)
put_rect(paths,0,74,96,75,12)
put_rect(paths,0,82,96,84,10)
# main passage through gate avoids adding fence collision
put_rect(paths,39,67,57,77,10)
# alternating visual walkway marker
for yy in range(74,78):
 for xx in range(37,59):
  if 36<xx<59 and yy==75:decor[yy][xx]=0
# flower gardens beside formal axis
for cx,cy,rx,ry in [(31,35,8,4),(65,35,8,4),(28,46,7,10),(68,46,7,10), (24,66,8,4),(72,66,8,4)]:
 put_ellipse(decor,cx,cy,rx,ry,22)
 put_ellipse(decor,cx,cy,rx-1,ry-1,23)
# center lawn, ring-shaped trimmed hedge border
for yy in range(42,60):
 for xx in range(36,60):
  d=((xx+.5-48)/11)**2+((yy+.5-51)/8.5)**2
  if .76<d<1.0:decor[yy][xx]=22
# Square alternating paving near historic building
for xx in range(37,59):
 for yy in range(19,26):
  if (xx+yy)%7==0:decor[yy][xx]=30

# 1-index TMX tile GIDs. 0 blank. Internals represented as atlas zero-based tile index.
TILESET_START=1
sheets={'Ground':ground,'Paths':paths,'GardenDetails':decor}
for nm,layer in sheets.items():
 for y in range(H):
  for x in range(W):
   if nm=='Ground':layer[y][x]=layer[y][x]+1
   elif layer[y][x]:layer[y][x]+=1

# Pixel-object positions and collision polygons/interaction zones. Sprite anchor top-left in editor data.
objects=[];oid=1

def obj(sprite,x,y,scale=1,prop=None,layer='LandmarkSprites'):
 global oid
 w,h=sprites[sprite]
 rec={'oid':oid,'sprite':sprite,'x':int(x),'y':int(y),'width':int(w*scale),'height':int(h*scale),'layer':layer,'properties':prop or {}}
 objects.append(rec);oid+=1
 return rec

# Slender trees row behind main garden, visible in photo
for x,y in [(302,356),(388,333),(471,346),(1040,348),(1128,335),(1225,360),(518,447),(973,445),
            (406,513),(1097,501),(406,620),(1116,639),(355,779),(1155,796)]:
 obj('cypress',x,y,1.0,layer='Vegetation')
# Symmetrical broadleaf tree groves, without blocking central route
left_trees=[(140,202),(240,156),(65,350),(165,370),(265,420),(82,525),(185,570),(270,664),
 (40,730),(137,820),(220,910),(46,1000),(305,1035),(320,180),(104,1090)]
right_trees=[(1240,196),(1350,192),(1430,320),(1240,397),(1350,465),(1430,595),(1260,642),
 (1365,731),(1250,856),(1412,912),(1160,1012),(1366,1030),(1090,185),(1190,1025),(1410,1095)]
for x,y in left_trees+right_trees:obj('broadleaf_tree',x,y,1.0,layer='Vegetation')
# Tree shadow and trimmed formal lawn included within statue sprite.
obj('historic_building_concept',534,122,1.0,{'accuracy':'schematic_from_aerial','name_zh':'台阶后方建筑（外观示意，未核实名称）'},layer='LandmarkSprites')
obj('statue_garden',618,647,1.0,{'name_zh':'一号门内中央雕像花园','accuracy':'photo_inspired'},layer='LandmarkSprites')
for x,y in [(454,486),(1045,486),(474,780),(1006,780),(375,1079),(1080,1079)]:obj('flowerbed',x,y,1.0,layer='SmallProps')
for x,y in [(521,545),(978,545),(520,845),(972,845),(446,955),(1040,955)]:obj('lamppost',x,y,1.0,layer='SmallProps')
for x,y in [(548,810),(930,810),(342,1088),(1145,1088)]:obj('bench',x,y,1.0,layer='SmallProps')
obj('noticeboard',1038,1133,1.0,{'name_zh':'校门导览牌（示意）'},layer='SmallProps')
# Monumental gate foremost lower on screen, adjusted post positions for central opening.
obj('gate_left',505,949,1.0,{'name_zh':'含弘门西侧门柱','source':'西南大学官网实景'},layer='EntranceGate')
obj('gate_right',833,949,1.0,{'name_zh':'含弘门东侧门柱','source':'西南大学官网实景'},layer='EntranceGate')

# Collision rectangles (Tiled non-visible layer), mark blocking walls, landscaping, gates and trees.
collisions=[]
def box(x,y,w,h,kind='solid'):
 collisions.append({'x':int(x),'y':int(y),'width':int(w),'height':int(h),'kind':kind})
box(570,235,395,83,'building')
box(623,655,283,175,'garden')
# Stone pillars and perimeter irons, center gap at x~710-830.
box(620,1088,69,98,'gate_post');box(890,1088,66,98,'gate_post')
box(506,1117,118,52,'fence');box(948,1117,81,52,'fence')
# Tree trunk hitboxes (narrow, low on sprite rather than whole canopy)
for o in objects:
 if o['sprite']=='broadleaf_tree':box(o['x']+42,o['y']+84,20,17,'tree')
 elif o['sprite']=='cypress':box(o['x']+17,o['y']+102,11,17,'tree')
# Flower beds and shrubs near stairs are optional decorative.

interactions=[
 {'name':'gate_intro','x':711,'y':1129,'width':118,'height':57,'action':'dialog','title':'含弘门 · 一号门','message':'欢迎来到西南大学！含弘门是北碚校区标志性入口。沿两侧道路可参观中央雕像花园。'},
 {'name':'statue_garden','x':726,'y':822,'width':90,'height':43,'action':'dialog','title':'入口雕像花园','message':'中央雕像、环形绿化和两侧通道构成了一号门的迎宾景观。'},
 {'name':'stairs','x':697,'y':495,'width':145,'height':74,'action':'dialog','title':'校园景观台阶','message':'沿景观轴继续向北，前往校园内部。台阶后的建筑外观目前是示意绘制。'},
 {'name':'building','x':708,'y':300,'width':115,'height':45,'action':'dialog','title':'前方建筑（待核实）','message':'此处建筑依据实景航拍轮廓做概念化像素绘制，具体名称与外观待校内实拍校对。'},
 {'name':'notice','x':1033,'y':1161,'width':75,'height':44,'action':'dialog','title':'校园地图说明','message':'本区域依据西南大学含弘门照片制作，路线和距离为了游戏性作了简化；并非测绘地图。'}
]
spawn={'x':768,'y':1220}

# Build TMX with standard file image collection and actual XML tile and object layers.
ns={'version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down','width':str(W),'height':str(H),'tilewidth':'16','tileheight':'16','infinite':'0','nextlayerid':'16','nextobjectid':str(oid+len(collisions)+len(interactions)+2)}
root=ET.Element('map',attrib=ns)
prop=ET.SubElement(root,'properties')
for k,v in {'project':'像素西大 · 含弘门', 'source_notice':'参考西南大学官网实景；道路比例和未知建筑为示意','region':'SWU Gate No.1 / Hanhong Gate','tile_size':'16px','walk_direction':'four-way'}.items():ET.SubElement(prop,'property',name=k,value=v)
ts=ET.SubElement(root,'tileset',{'firstgid':'1','name':'swu_terrain','tilewidth':'16','tileheight':'16','tilecount':'128','columns':'16'})
ET.SubElement(ts,'image',{'source':'assets/terrain_tileset.png','width':'256','height':'128'})
asset_idx={name:i for i,name in enumerate(sprites)}
TS_SPRITES=129
maxw=max(v[0] for v in sprites.values());maxh=max(v[1] for v in sprites.values())
ts2=ET.SubElement(root,'tileset',{'firstgid':str(TS_SPRITES),'name':'swu_photo_inspired_landmarks','tilewidth':str(maxw),'tileheight':str(maxh),'tilecount':str(len(sprites)),'columns':'0'})
ET.SubElement(ts2,'grid',{'orientation':'orthogonal','width':'1','height':'1'})
for name,i in asset_idx.items():
 tile=ET.SubElement(ts2,'tile',id=str(i))
 w,h=sprites[name]
 ET.SubElement(tile,'image',source='assets/'+name+'.png',width=str(w),height=str(h))

layerid=1
for lname,data in sheets.items():
 lay=ET.SubElement(root,'layer',id=str(layerid),name=lname,width=str(W),height=str(H));layerid+=1
 node=ET.SubElement(lay,'data',encoding='csv')
 node.text='\n'+',\n'.join(','.join(str(gid) for gid in row) for row in data)+'\n'

# object tiles inside Tiled use bottom-left y anchor; draworder="index" respects list order.
for lname in ['Vegetation','LandmarkSprites','SmallProps','EntranceGate']:
 group=ET.SubElement(root,'objectgroup',id=str(layerid),name=lname,draworder='index');layerid+=1
 for o in objects:
  if o['layer']!=lname:continue
  w,h=o['width'],o['height']
  attrs={'id':str(o['oid']),'name':o['properties'].get('name_zh',o['sprite']), 'gid':str(TS_SPRITES+asset_idx[o['sprite']]),'x':str(o['x']),'y':str(o['y']+h),'width':str(w),'height':str(h)}
  e=ET.SubElement(group,'object',attrs)
  if o['properties']:
   p=ET.SubElement(e,'properties')
   for k,v in o['properties'].items():ET.SubElement(p,'property',name=k,value=v)

# object overlays hidden by default, collisions are read by gameplay.
group=ET.SubElement(root,'objectgroup',id=str(layerid),name='Collisions',visible='0');layerid+=1
baseid=oid
for i,b in enumerate(collisions):
 e=ET.SubElement(group,'object',id=str(baseid+i),name=b['kind'],type='solid',x=str(b['x']),y=str(b['y']),width=str(b['width']),height=str(b['height']))
baseid+=len(collisions)
group=ET.SubElement(root,'objectgroup',id=str(layerid),name='Interactions',visible='0');layerid+=1
for i,b in enumerate(interactions):
 e=ET.SubElement(group,'object',id=str(baseid+i),name=b['name'],type='trigger',x=str(b['x']),y=str(b['y']),width=str(b['width']),height=str(b['height']))
 p=ET.SubElement(e,'properties')
 for k in ['action','title','message']:ET.SubElement(p,'property',name=k,value=b[k])
baseid+=len(interactions)
group=ET.SubElement(root,'objectgroup',id=str(layerid),name='Spawn',visible='0');layerid+=1
ET.SubElement(group,'object',id=str(baseid),name='player_start',type='point',x=str(spawn['x']),y=str(spawn['y']))
root.set('nextlayerid',str(layerid));root.set('nextobjectid',str(baseid+1))
tmxfile=ROOT/'SWU_Gate1_Hanhong.tmx'
ET.ElementTree(root).write(str(tmxfile),xml_declaration=True,encoding='utf-8',pretty_print=True)

# Map metadata also exported for simple play demo, images loaded from project-relative assets paths.
payload={'project':'SWU Gate No.1 / Hanhong Gate','tilewidth':TILE,'tileheight':TILE,'width':W,'height':H,
 'layers':sheets,'asset_tileset':'assets/terrain_tileset.png','assets':{n:{'src':'assets/'+n+'.png','width':w,'height':h} for n,(w,h) in sprites.items()},
 'objects':objects,'collisions':collisions,'interactions':interactions,'spawn':spawn,'source':'https://www.swu.edu.cn/info/1149/2090.htm','notes':'Illustrative spatial reconstruction, NOT real survey'}
(ROOT/'map_game.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),'utf-8')

# render preview from exact TMX object placements for visual inspection
preview=Image.new('RGBA',(PXW,PXH),(0,0,0,255))
for i,layer in enumerate(sheets.values()):
 for y,row in enumerate(layer):
  for x,gid in enumerate(row):
   if gid:
    ti=gid-1
    t=atlas.crop(((ti%16)*16,(ti//16)*16,(ti%16+1)*16,(ti//16+1)*16))
    preview.alpha_composite(t,(x*TILE,y*TILE))
for lname in ['Vegetation','LandmarkSprites','SmallProps','EntranceGate']:
 for o in objects:
  if o['layer']!=lname:continue
  sprite=Image.open(A/(o['sprite']+'.png')).convert('RGBA')
  if sprite.size!=(o['width'],o['height']):sprite=sprite.resize((o['width'],o['height']),Image.Resampling.NEAREST)
  preview.alpha_composite(sprite,(o['x'],o['y']))
# Save player placeholder at spawn as overlay in visual only.
player=Image.new('RGBA',(20,29),(0,0,0,0));d=ImageDraw.Draw(player)
d.ellipse((5,1,15,10),fill='#a0644c');d.rectangle((5,10,15,17),fill='#f0c39f')
d.rectangle((3,16,17,24),fill='#3e6fbc');d.rectangle((4,25,8,28),fill='#363c4c');d.rectangle((12,25,16,28),fill='#363c4c')
player.save(A/'player.png')
preview.alpha_composite(player,(spawn['x']-10,spawn['y']-14))
preview.convert('RGB').save(ROOT/'preview_full.png')
preview.resize((768,672),Image.Resampling.NEAREST).convert('RGB').save(ROOT/'preview_small.png')

# legend and alpha tile previews
sprite_page=Image.new('RGBA',(1000,920),'#eeeae1');sd=ImageDraw.Draw(sprite_page)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
positions=[('gate_left',15,22),('gate_right',235,22),('statue_garden',455,22),('historic_building_concept',450,300),('broadleaf_tree',40,400),('cypress',200,400),('stone_sign',40,610),('bench',470,560),('lamppost',570,560),('flowerbed',670,560),('noticeboard',790,560)]
for name,x,y in positions:
 img=Image.open(A/(name+'.png'))
 sprite_page.alpha_composite(img,(x,y))
 sd.text((x,y+img.height+4),name,font=font,fill='#243a2b')
sprite_page.convert('RGB').save(ROOT/'assets_contact_sheet.png')

# Shared comprehensive readme and sources, with attribution and exact callouts.
readme='''# 像素西大 · 一号门「含弘门」可编辑地图工程

这个项目是一张 **Tiled 可以直接打开的完整 TMX 地图**，并非西南大学北碚校区的全校精确测绘地图。地图将一号门入口广场、双柱门、中心雕像花园、两侧林荫道、景观台阶以及背景建筑组合成可玩游戏场景。

## 文件

- `SWU_Gate1_Hanhong.tmx`：**主工程**，在 Tiled 中打开它（请保留整个文件夹的相对路径）。
- `assets/terrain_tileset.png`：16×16 地形瓦片图集，共128块。
- `assets/gate_left.png`、`gate_right.png`：根据一号门真实照片绘制的两侧标志性旗柱与铁艺门。
- `assets/statue_garden.png`：中央雕像花园像素素材。
- `assets/historic_building_concept.png`：景观台阶后建筑的**外观示意**，未核实其名称及细节。
- `assets/broadleaf_tree.png`、`cypress.png`、`flowerbed.png`、`bench.png`、`lamppost.png` 等：可复用装饰素材。
- `assets/player.png`：占位人物，方便调试出生点。
- `map_game.json`：同一场景数据的前端友好格式。
- `play_demo.html`：无需 Phaser 的简单浏览器走动演示；使用本地HTTP服务打开。
- `preview_full.png`、`preview_small.png`：地图效果预览。
- `assets_contact_sheet.png`：图片素材一览。
- `build_project.py`：工程生成源代码，方便修改尺寸、物品摆放并重建。

## 打开 TMX

1. 安装 Tiled：https://www.mapeditor.org/
2. 把整个 ZIP 解压到一个目录，**不要只提取单独的 .tmx**。
3. `File → Open → SWU_Gate1_Hanhong.tmx`。
4. 图层说明：`Ground` 为地面，`Paths` 为广场道路，`GardenDetails` 为草地花坛，`Vegetation` 为树木，`LandmarkSprites` 为中央雕像与示意建筑，`EntranceGate` 为一号门柱，`Collisions` 为不能走的范围，`Interactions` 为对话触发区，`Spawn` 为玩家出生位置。
5. 后三层默认隐藏以免遮挡预览，可在图层面板将其设置为可见，以编辑矩形位置和触发信息。
6. `File → Export As` 可以导出 JSON 格式；注意集成到 Phaser 时，可选择用 `map_game.json` 的 image object 数据加载实体图片。

## 测试行走

在当前目录运行：

```bash
python -m http.server 8000
```

浏览器打开 `http://localhost:8000/play_demo.html`。

WASD / 方向键移动，按 E 与临近互动点对话。这个演示使用 Canvas 和 JSON 数据，不依赖外部 CDN；它旨在帮助前端队友验证像素素材位置、行走路线、出生点和碰撞。正式游戏建议换成 Phaser / Pixi。

## 真实度说明（请留意）

**有实景依据：** 校门叫含弘门（西南大学一号门）；主门柱为白色石质、顶部旗帜、黑色铁艺门；门内有中心雕像花园、分绕两侧的道路、对称绿化、后方长台阶和树荫。

**仅美术示意：** 建筑窗户造型、园区微观道路、花草与树木数量、地图长宽尺寸、台阶具体位置、部分装饰与提示牌。地图没有地理坐标，不可用于导航。真实校门运行通道与门禁请由现场人员校对。

## 实景依据与致谢

- 西南大学官方「含弘门（1号门）」：https://www.swu.edu.cn/info/1149/2090.htm
- 西南大学官方校园风光（一号门照片）：https://sce.swu.edu.cn/info/1068/2562.htm
- 西南大学官网鸟瞰入口： https://www.swu.edu.cn/index.htm
- 西南大学学校简介（入口航拍）： https://swu.edu.cn/xxgk/xxjj.htm

项目内的像素图片是新创作素材，不直接打包学校官方网站的照片。生成的建筑图用于项目草稿，后续可以根据你们自己的实拍替换修正。项目不代表学校官方作品。
'''
(ROOT/'README.md').write_text(readme,'utf-8')
print('Built',tmxfile,'tileset',atlas.size,'objects',len(objects),'collisions',len(collisions),'interactions',len(interactions))
print('Assets:',[x.name for x in A.iterdir()])
