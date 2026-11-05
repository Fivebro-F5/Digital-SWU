from pathlib import Path
from PIL import Image
import json
import shutil

root = Path(__file__).parent / 'character-pack'
total = 0
for config in sorted(root.rglob('character.json')):
    folder = config.parent
    meta = json.loads((folder / 'animations.json').read_text(encoding='utf-8'))
    entries = {}
    for key, animation in meta['animations'].items():
        action = animation['sheet']
        direction = key[len(action) + 1:]
        source = Image.open(folder / meta['sheets'][action]['file']).convert('RGBA')
        dest = folder / 'frames' / action / direction
        dest.mkdir(parents=True, exist_ok=True)
        paths = []
        for number, frame in enumerate(animation['frames']):
            x, y, w, h = (frame[n] for n in ['x', 'y', 'width', 'height'])
            image = source.crop((x, y, x + w, y + h))
            path = dest / f'{number:03d}.png'
            image.save(path)
            with Image.open(path) as check:
                assert check.size == (96, 96) and check.mode == 'RGBA'
                assert check.tobytes() == image.tobytes()
            paths.append(path.relative_to(folder).as_posix())
            total += 1
        animation['frameFiles'] = paths
        entries[key] = {'files': paths, 'frameRate': animation['frameRate'], 'repeat': animation['repeat']}
    (folder / 'animations.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    (folder / 'frames.json').write_text(json.dumps({'frameSize': [96,96], 'origin': meta['origin'], 'animations': entries}, ensure_ascii=False, indent=2), encoding='utf-8')
    char = json.loads(config.read_text(encoding='utf-8'))
    char['individualFrames'] = 'frames.json'
    config.write_text(json.dumps(char, ensure_ascii=False, indent=2), encoding='utf-8')

readme = root / 'INDIVIDUAL_FRAMES.md'
readme.write_text('''# 独立帧文件

每个角色/配色文件夹增加 frames/，保留原有图集。

```text
boy/01-teal/frames/
├─ idle/down/000.png
├─ idle/left/000.png
├─ idle/up/000.png
├─ idle/right/000.png
├─ walk/<方向>/000.png ... 003.png
├─ run/<方向>/000.png ... 003.png
└─ sit_chair/<方向>/000.png
```

girl 和 bird 使用相同结构。每套 40 张，21 套共 840 张。
每张为 96×96 透明 PNG，保留帧内空白与锚点，避免按内容紧裁造成位置跳动。
frames.json 给出文件路径和播放速度；animations.json 也追加了 frameFiles。
独立帧与图集对应矩形像素完全一致，已程序核验。原有动作质量和引擎验证限制不变。
''', encoding='utf-8')
shutil.make_archive(str(root), 'zip', root_dir=root.parent, base_dir=root.name)
print(f'Exported and pixel-verified {total} individual RGBA frames; ZIP updated.')
