from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage
import json,shutil
base=Path('C:/Users/zhaoyaning/.codex/generated_images/01a1a536-64e3-7d43-a39a-c346ff9a5279')
out=Path('assets/campus-buildings-20');out.mkdir(exist_ok=True)
records=[]
def save(im,box,kind,index,threshold):
 a=np.array(im.crop(box));rgb=a[:,:,:3].astype(int)
 a[:,:,3]=np.where(a[:,:,3]>=threshold,255,0)
 artifact=((rgb.max(2)-rgb.min(2)>180)&(rgb.min(2)<40))
 a[artifact,3]=0
 labels,n=ndimage.label(a[:,:,3]>0);counts=np.bincount(labels.ravel());counts[0]=0
 a[~(counts>max(20,counts.max()*.005))[labels],3]=0
 p=Image.fromarray(a);assert p.getbbox();p=p.crop(p.getbbox())
 c=Image.new('RGBA',(p.width+16,p.height+16));c.alpha_composite(p,(8,8))
 folder=out/kind;folder.mkdir(exist_ok=True);name=f'{kind}-{index:02}.png';c.save(folder/name)
 records.append({'id':name[:-4],'file':f'{kind}/{name}','width':c.width,'height':c.height,'origin':[.5,1],'fictional':True})
im=Image.open(base/'exec-2fc15192-54fd-4b9f-8648-f88bdc723dc9.png').convert('RGBA')
for i,box in enumerate([(15,90,550,500),(610,20,950,500),(1025,130,1525,500),(10,625,500,955),(530,580,1005,955),(1025,575,1525,955)]):save(im,box,'teaching',i+1,245)
im=Image.open(base/'exec-6f4ff582-d30d-44a9-ac71-4311c43387df.png').convert('RGBA')
edges=[0,265,480,733,980,1245,1540,1774]
for i in range(7):save(im,(edges[i],80,edges[i+1],445),'teaching' if i<6 else 'dormitory',i+7 if i<6 else 1,200)
edges=[0,235,450,697,992,1265,1565,1774]
for i in range(7):save(im,(edges[i],455,edges[i+1],855),'dormitory',i+2,200)
(out/'manifest.json').write_text(json.dumps({'assets':records,'count':20,'collisionConfigured':False},ensure_ascii=False,indent=2),encoding='utf-8')
preview=Image.new('RGB',(1200,1000),(215,226,219));draw=ImageDraw.Draw(preview)
for i,r in enumerate(records):
 p=Image.open(out/r['file']);p.thumbnail((220,210),Image.Resampling.NEAREST);x=i%5*240;y=i//5*250;preview.paste(p,(x+(240-p.width)//2,y+5),p);draw.text((x+10,y+225),r['id'],fill=(25,40,30))
preview.save(out/'preview.png')
(out/'README.txt').write_text('20 栋独立建筑 PNG：teaching/12 栋教学楼，dormitory/8 栋宿舍楼。编号是素材编号，不是真实校内楼号。内置 imagegen 生成，Python 裁切及透明边缘清理。提示词：参考已确认的像素校园外观，奶油色古典柱廊与现代灰色楼，增加 L/U 形、连廊、红砖与阳台宿舍变化。manifest.json 提供文件路径尺寸。素材未配置碰撞、入口或真实地图定位；不同楼的比例需在地图中统一。',encoding='utf-8')
assert len(records)==20
for r in records:
 p=Image.open(out/r['file']);assert p.mode=='RGBA' and p.getextrema()[3][0]==0
shutil.make_archive('campus-buildings-20','zip',root_dir=out.parent,base_dir=out.name)
print('Saved and validated 20 buildings')
