from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage
import json,shutil
out=Path('assets/campus-buildings-signed');out.mkdir(exist_ok=True)
src=Image.open('C:/Users/zhaoyaning/.codex/generated_images/01a1a536-64e3-7d43-a39a-c346ff9a5279/exec-647e9a75-a928-40c3-ba1c-25e3a478f118.png').convert('RGBA')
entries=[]
def save(im,relative,sign=None):
 im=im.copy().convert('RGBA'); w,h=im.size
 if sign is None:
  sw=max(70,min(round(w*.42),300));sh=max(22,round(sw*.20));x=(w-sw)//2;y=max(8,h-sh-max(18,round(h*.17)))
  d=ImageDraw.Draw(im);d.rectangle((x,y,x+sw,y+sh),fill='#514237');d.rectangle((x+3,y+3,x+sw-3,y+sh-3),fill='#e9d7ad');sign=[x+6,y+6,sw-12,sh-12]
 p=out/relative;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
 data={'file':relative,'width':w,'height':h,'sign':{'x':sign[0],'y':sign[1],'width':sign[2],'height':sign[3],'text':'','color':'#302a23','align':'center'},'coordinateSystem':'image pixels from top-left','placementStatus':'default plaque position; tune per building in scene'}
 p.with_suffix('.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');entries.append(data)
# Canteen signs measured in original atlas. Keep their built-in signs.
signs=[(285,292,211,35),(981,331,222,35),(306,795,220,34),(931,823,216,33)]
for i in range(4):
 x=i%2*768;y=i//2*512;a=np.array(src.crop((x,y,x+768,y+512)));a[:,:,3]=np.where(a[:,:,3]>=245,255,0)
 lab,n=ndimage.label(a[:,:,3]>0);counts=np.bincount(lab.ravel());counts[0]=0;a[lab!=counts.argmax(),3]=0
 im=Image.fromarray(a);box=im.getbbox();im=im.crop(box);s=signs[i];save(im,f'canteen/canteen-{i+1:02}.png',[s[0]-x-box[0],s[1]-y-box[1],s[2],s[3]])
groups=[('assets/campus-buildings-20/teaching','teaching'),('assets/campus-buildings-20/dormitory','dormitory'),('assets/campus-environment/buildings','original-buildings'),('assets/campus-environment/buildings-simple','simple'),('assets/campus-environment/buildings-simple-extra','simple-extra'),('assets/campus-environment/buildings-photo','photo-based')]
for directory,group in groups:
 for p in Path(directory).glob('*.png'):
  if p.stem in ('preview','source'):continue
  save(Image.open(p),f'{group}/{p.name}')
(out/'manifest.json').write_text(json.dumps({'assets':entries,'count':len(entries)},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'README.txt').write_text('独立 PNG + 同名 JSON，manifest.json 总清单。每栋设有空白挂牌区域。JSON sign 为图片左上角坐标系下的文字区域，可动态绘制楼名。此前原文件保留；本目录是挂牌新版。普通楼使用默认立面位置，复杂建筑建议在游戏中微调；牌子可能覆盖局部窗户。食堂采用原生入口牌。生成：内置 imagegen；后处理：用户授权 Python。提示词：四种像素大学食堂、玻璃入口、空白门牌、米色/红砖/白蓝/L形变化。未设碰撞或入口逻辑。',encoding='utf-8')
preview=Image.new('RGB',(1000,700),(218,228,218))
for i,e in enumerate(entries[:4]):
 im=Image.open(out/e['file']);im.thumbnail((480,320),Image.Resampling.NEAREST);preview.paste(im,(i%2*500+(500-im.width)//2,i//2*350),im)
preview.save(out/'canteen-preview.png')
for e in entries:
 s=e['sign'];assert 0<=s['x']<e['width'] and 0<=s['y']<e['height'];assert s['x']+s['width']<=e['width'] and s['y']+s['height']<=e['height']
shutil.make_archive('campus-buildings-signed','zip',root_dir=out.parent,base_dir=out.name)
print('Saved',len(entries),'buildings with individual PNG + JSON')
