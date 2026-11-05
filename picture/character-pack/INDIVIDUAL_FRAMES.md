# 独立帧文件

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
