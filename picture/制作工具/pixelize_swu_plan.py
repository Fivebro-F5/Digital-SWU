from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import json, shutil

out=Path('assets/campus-map/plan-aligned-v1');out.mkdir(parents=True,exist_ok=True)
src=Image.open('D:/BaiduNetdiskDownload/v2-a844242393677a20b0e951951d335f49_r.jpg').convert('RGB')
src.save(out/'reference.png')
# Preserve source canvas coordinates, orientation and footprints; no inferred geometry.
small=src.resize((1000,1074),Image.Resampling.BOX)
a=np.asarray(small).astype(float)
source=np.array([[255,255,255],[207,230,201],[167,215,238],[185,185,185],[255,161,129],[241,167,226],[249,197,139],[253,239,154],[113,210,102],[162,244,145],[254,216,164],[68,67,60]],float)
target=np.array([[245,242,227],[145,179,105],[92,164,195],[173,171,160],[186,117,80],[169,135,113],[200,163,107],[207,185,116],[83,145,69],[120,174,82],[199,156,102],[76,77,66]],np.uint8)
dist=((a[:,:,None,:]-source[None,None,:,:])**2).sum(3)
ids=dist.argmin(2)
mapped=target[ids]
pixel=Image.fromarray(mapped).resize(src.size,Image.Resampling.NEAREST)
pixel.save(out/'swu-plan-pixel.png')
blend=Image.blend(src,pixel,0.5);blend.save(out/'alignment-overlay.png')
# Keep exact positions in export tiles, including edge dimensions.
tiles=out/'tiles';tiles.mkdir(exist_ok=True);records=[]
for y in range(0,src.height,512):
 for x in range(0,src.width,512):
  name=f'x{x:04d}-y{y:04d}.png';tile=pixel.crop((x,y,min(x+512,src.width),min(y+512,src.height)));tile.save(tiles/name)
  records.append({'file':'tiles/'+name,'x':x,'y':y,'width':tile.width,'height':tile.height})
(out/'map.json').write_text(json.dumps({'width':src.width,'height':src.height,'coordinateSystem':'source image pixels; origin top-left; x right; y down','sourcePixelToOutputPixel':1,'pixelBlockSize':2,'tiles':records,'georeferenced':False,'collisionData':False,'buildingIdentificationVerified':False},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'README.md').write_text('''# 西南大学平面图对齐像素底图 v1

本版以用户提供的 2000×2148 平面示意图为唯一几何依据，保持画布、朝向与坐标；用 2×2 像素块和有限色板转换为校园像素配色。没有重画或臆造建筑位置。

- swu-plan-pixel.png：整张像素化底图，包含原图标题与图例区域。
- reference.png：原图副本。
- alignment-overlay.png：原图与结果各 50% 叠加，便于检查位置。
- tiles/：25 张地图切片，坐标见 map.json。

精度边界：这是原图相对坐标对齐的栅格风格转换，不是完整建筑语义描摹、三维建筑复原或地理测绘。像素化有最多约一个原图像素的采样边界变化。原图文字仍为图像，可能因量化变得难读；颜色不能直接当作建筑识别结果。没有逐栋核验名称、现状、楼号，不能自动把此前的 25/44 教学楼贴到未确认位置。尚无可走区域、碰撞或建筑交互数据。

下一阶段应在这张固定底图上逐区描摹建筑多边形与道路，核实楼号后再替换为匹配的像素建筑，保留真实占地形状与中心位置。中图的外观参考已收到，但其地图定位仍需核实。
''',encoding='utf-8')
shutil.make_archive('swu-plan-aligned-v1','zip',root_dir=out.parent,base_dir=out.name)
print('Saved aligned pixel map, overlay, 25 tiles and coordinate manifest')
