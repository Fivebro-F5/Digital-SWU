from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from collections import deque
import json, shutil
from scipy import ndimage

ROOT=Path(__file__).parent/'assets/campus-environment'
GEN=Path('C:/Users/zhaoyaning/.codex/generated_images/01a1a536-64e3-7d43-a39a-c346ff9a5279')

def remove_bg(im, extra=None):
    a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].astype(int)
    mask=(rgb.min(2)>170)&((rgb.max(2)-rgb.min(2))<28)
    h,w=mask.shape; seen=np.zeros((h,w),bool); q=deque()
    for x in range(w): q.extend([(0,x),(h-1,x)])
    for y in range(h): q.extend([(y,0),(y,w-1)])
    if extra:q.append((extra[1],extra[0]))
    while q:
        y,x=q.popleft()
        if not(0<=y<h and 0<=x<w) or seen[y,x] or not mask[y,x]:continue
        seen[y,x]=True
        q.extend([(y-1,x),(y+1,x),(y,x-1),(y,x+1)])
    a[seen,3]=0
    a[:,:,3]=np.where(a[:,:,3]<160,0,255)
    return Image.fromarray(a)

def split(filename,category,names,cols,rows,clean=False):
    src=GEN/filename; shutil.copy(src,ROOT/'source'/f'{category}.png')
    im=Image.open(src).convert('RGBA'); entries=[]
    for i,name in enumerate(names):
        col,row=i%cols,i//cols
        box=(round(col*im.width/cols),round(row*im.height/rows),round((col+1)*im.width/cols),round((row+1)*im.height/rows))
        part=im.crop(box)
        if clean:part=remove_bg(part,(380,240) if name=='teaching-ring' else None)
        else:
            a=np.array(part);a[:,:,3]=np.where(a[:,:,3]<160,0,255);part=Image.fromarray(a)
        a=np.array(part); labels,n=ndimage.label(a[:,:,3]>0)
        counts=np.bincount(labels.ravel()); counts[0]=0
        keep=counts>=max(30,int(counts.max()*0.005))
        a[~keep[labels],3]=0;part=Image.fromarray(a)
        bbox=part.getbbox();assert bbox
        part=part.crop(bbox)
        canvas=Image.new('RGBA',(part.width+16,part.height+16));canvas.alpha_composite(part,(8,8))
        file=ROOT/category/f'{name}.png';canvas.save(file)
        entries.append({'id':name,'file':file.relative_to(ROOT).as_posix(),'width':canvas.width,'height':canvas.height,'suggestedOrigin':[0.5,1],'sourceCrop':box})
    return entries

def main():
    items=split('exec-f7c9c9a6-0078-49f5-887c-49f575b630e7.png','buildings',['library','teaching-straight','teaching-ring','teaching-diagonal'],2,2,True)
    items+=split('exec-d81f36ba-e57c-4027-a197-08989d10a0f7.png','vegetation',['tree-broadleaf','tree-ginkgo','tree-conifer','tree-cherry','shrub','hedge','flowerbed','potted-plant'],4,2)
    furniture=ROOT/'furniture-source-name.txt'
    if furniture.exists():items+=split(furniture.read_text().strip(),'furniture',['student-desk','teacher-desk','bookshelf-tall','bookcase-low','chair-down','chair-right','chair-up','chair-left'],4,2)
    (ROOT/'manifest.json').write_text(json.dumps({'assets':items,'status':'prototype artwork; placement and collisions require scene-specific configuration'},ensure_ascii=False,indent=2),encoding='utf-8')
    preview=Image.new('RGB',(1000,((len(items)+3)//4)*230),(211,223,220));d=ImageDraw.Draw(preview)
    for i,e in enumerate(items):
        p=Image.open(ROOT/e['file']);p.thumbnail((230,195),Image.Resampling.NEAREST);x=(i%4)*250+(250-p.width)//2;y=(i//4)*230+5
        preview.paste(p,(x,y),p);d.text(((i%4)*250+10,(i//4)*230+207),e['id'],fill=(30,45,40))
    preview.save(ROOT/'asset-preview.png')
    print('Exported',len(items),'individual objects')

if __name__=='__main__':main()
