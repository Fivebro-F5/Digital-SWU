from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import colorsys, json, shutil, zipfile

ROOT = Path(__file__).parent
OUT = ROOT / 'character-pack'
DIRS = ['down', 'left', 'up', 'right']
COLORS = [('01-teal','蓝绿','#277582'),('02-burgundy','酒红','#963c52'),('03-navy','藏蓝','#354d85'),('04-forest','森林绿','#398058'),('05-mustard','芥末黄','#b49131'),('06-violet','紫罗兰','#8052ad'),('07-coral','珊瑚橙','#ce704d'),('08-sky','浅蓝','#65a8cb'),('09-rose','玫瑰粉','#c36a94'),('10-graphite','石墨灰','#646975')]
N=96

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def split_sheet(path, action):
    im=Image.open(path).convert('RGBA'); a=np.array(im)
    # Remove faint generation fringes before measuring silhouettes.
    a[:,:,3]=np.where(a[:,:,3]>=160,255,0)
    im=Image.fromarray(a); rows=4 if action in ('walk','run') else 1
    result=[]
    for row in range(rows):
        for col in range(4):
            cell=im.crop((round(col*im.width/4), round(row*im.height/rows),round((col+1)*im.width/4),round((row+1)*im.height/rows)))
            box=cell.getbbox()
            if not box: raise ValueError(f'Empty cell {path} {row} {col}')
            result.append(cell.crop(box))
    # Uniform action-wide scale retains stride width and frame height differences.
    scale=min(76/max(x.width for x in result),78/max(x.height for x in result))
    frames=[]
    for cell in result:
        sz=(max(1,round(cell.width*scale)),max(1,round(cell.height*scale)))
        cell=cell.resize(sz,Image.Resampling.NEAREST)
        canvas=Image.new('RGBA',(N,N)); canvas.alpha_composite(cell,((N-cell.width)//2,88-cell.height))
        frames.append(canvas)
    return frames, rows

def recolor(im, color):
    a=np.array(im); rgb=a[:,:,:3].astype(float)/255
    target=colorsys.rgb_to_hsv(*(int(color[i:i+2],16)/255 for i in (1,3,5)))
    # Restrict to chromatic teal jacket pixels; hair, skin, trousers stay untouched.
    mask=(rgb[:,:,1]>rgb[:,:,0]*1.30)&(rgb[:,:,2]>rgb[:,:,0]*1.25)&(rgb[:,:,1]>0.12)&(np.abs(rgb[:,:,1]-rgb[:,:,2])<0.23)&(a[:,:,3]>0)
    ys,xs=np.where(mask)
    for y,x in zip(ys,xs):
        h,s,v=colorsys.rgb_to_hsv(*rgb[y,x])
        v=min(1,v*(target[2]/0.51))
        a[y,x,:3]=np.array(colorsys.hsv_to_rgb(target[0],target[1],v))*255
    return Image.fromarray(a)

def package(kind, source, variants):
    bases={act:split_sheet(source/(act+'.png'),act) for act in ['idle','walk','run','sit_chair']}
    for ident,label,color in variants:
        folder=OUT/kind/ident; folder.mkdir(parents=True,exist_ok=True)
        animations={}; sheets={}
        for action,(frames,rows) in bases.items():
            sheet=Image.new('RGBA',(N*4,N*rows))
            for i,frame in enumerate(frames):
                if color: frame=recolor(frame,color)
                sheet.alpha_composite(frame,((i%4)*N,(i//4)*N))
            sheet.save(folder/(action+'.png'))
            sheets[action]={'file':action+'.png','frameWidth':N,'frameHeight':N,'columns':4,'rows':rows,'margin':0,'spacing':0}
            for d,direction in enumerate(DIRS):
                indices=list(range(d*4,d*4+4)) if rows==4 else [d]
                animations[action+'_'+direction]={'sheet':action,'frames':[{'index':i,'x':i%4*N,'y':i//4*N,'width':N,'height':N} for i in indices],'frameRate':8 if action=='walk' else 12 if action=='run' else 1,'repeat':-1 if rows==4 else 0}
        write_json(folder/'animations.json',{'schemaVersion':1,'frameSize':{'width':N,'height':N},'origin':{'x':0.5,'y':88/N},'directions':DIRS,'sheets':sheets,'animations':animations})
        write_json(folder/'character.json',{'schemaVersion':1,'id':kind+'-'+ident,'kind':kind,'variant':ident,'outfitLabel':label,'jacketColor':color,'source':'OpenAI imagegen + user-authorized Python processing','lpcGeneratorImportCompatible':False,'configurationType':'campus-character-pack','animations':'animations.json','defaultAnimation':'idle_down','frameSize':[N,N],'anchorPixels':[48,88],'processing':'alpha threshold 160; nearest-neighbor resizing; silhouette centered; bottom aligned; teal jacket recolor','status':'prototype; animation timing and foot sliding require in-game tuning','sitDescription':'bird perched, chair excluded' if kind=='bird' else 'chair sitting pose, chair excluded'})
        (folder/'credits.txt').write_text('素材来源：用户提供参考形象，OpenAI 内置 imagegen 生成，Python 切帧、对齐及换色。\n没有使用 LPC 生成器素材，不能将此素材标记为 LPC、CC0 或附加虚构作者。\n未对原始参考图的权利归属作独立核验。AI 输出适用服务条款；参考作品的第三方权利仍需单独考虑。\n此文件是来源记录，不是版权清权证明或新的许可证。\n',encoding='utf-8')
    return bases

def main():
    OUT.mkdir(exist_ok=True)
    for kind,src in [('boy','student-male'),('girl','student-female')]:
        package(kind,ROOT/'assets/characters'/src,COLORS)
    package('bird',ROOT/'assets/characters/feather-bird',[('original','原色',None)])
    write_json(OUT/'manifest.json',{'characters':[{'id':f'{kind}-{v[0]}','path':f'{kind}/{v[0]}/character.json'} for kind in ['boy','girl'] for v in COLORS]+[{'id':'bird-original','path':'bird/original/character.json'}]})
    preview=Image.new('RGB',(960,260),(235,236,240)); draw=ImageDraw.Draw(preview)
    for r,kind in enumerate(['boy','girl']):
        for c,(ident,_,_) in enumerate(COLORS):
            im=Image.open(OUT/kind/ident/'idle.png').crop((0,0,96,96))
            preview.paste(im,(c*96,r*130),im); draw.text((c*96+4,r*130+101),kind+' '+ident[:2],fill=(20,20,30))
    preview.save(OUT/'palette-preview.png')
    # Validate exact file set, image geometry, frame rectangles and opacity in every frame.
    count=0
    for cfg in OUT.rglob('character.json'):
        folder=cfg.parent
        for f in ['idle.png','walk.png','run.png','sit_chair.png','animations.json','character.json','credits.txt']: assert (folder/f).is_file()
        meta=json.loads((folder/'animations.json').read_text(encoding='utf-8'))
        for anim in meta['animations'].values():
            im=Image.open(folder/(anim['sheet']+'.png'))
            for f in anim['frames']:
                assert f['x']+N<=im.width and f['y']+N<=im.height
                assert im.crop((f['x'],f['y'],f['x']+N,f['y']+N)).getbbox()
                count+=1
    write_json(OUT/'validation.json',{'characterVariants':21,'pngSheets':84,'checkedFrameReferences':count,'geometryAndNonemptyFrames':'passed','enginePlayback':'not tested'})
    print('Built and validated',count,'frame references across 21 variants')

if __name__=='__main__': main()
