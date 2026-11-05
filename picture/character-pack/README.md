# 校园角色资源包

男女各 10 套服装配色，加鸟角色原色，共 21 套。每套含用户要求的 7 个文件。

目录：boy/<配色>/、girl/<配色>/、bird/original/。

## 使用

直接打开 preview.html 查看动作。palette-preview.png 为配色总览。
所有帧为 96×96，透明背景。idle 和 sit_chair 图为 384×96；walk 和 run 为 384×384。
方向顺序：down、left、up、right。站立/坐姿每方向一帧；行走/跑步每方向四帧。
animations.json 提供精确矩形与帧索引，walk 默认 8 fps、run 12 fps；不是物理移动速度。
角色脚底锚点为帧内 (48,88)。坐姿需根据椅子座面另外设置摆放位置。

## Phaser 接入示意

```js
// 在 preload 中，按每套 animations.json.sheets 加载对应 PNG：
this.load.spritesheet('girl-walk', 'girl/01-teal/walk.png', {
  frameWidth: 96, frameHeight: 96
});
// 在 create 中：
this.anims.create({key:'girl-walk-down',
  frames:[0,1,2,3].map(frame=>({key:'girl-walk',frame})),
  frameRate:8,repeat:-1});
const player=this.add.sprite(200,200,'girl-walk').setOrigin(0.5,88/96);
player.play('girl-walk-down');
```

不同角色/配色的 texture 和 animation key 应加角色前缀，避免覆盖。
character.json 是本项目的配置，不可导入 LPC 生成器。

## 制作与限制

基础图由内置 imagegen 生成；用户授权 Python 进行透明边缘清理、最近邻缩放、底部对齐和服装换色。原始图保留在工作区 assets/characters。
程序验证文件齐全、帧矩形有效、每帧非空；没有完成 Phaser 实机播放验证。底部对齐不等同于步态完全无抖动，生成图仍有动作细节变化。坐姿仅静态，不含坐下起身过渡。
credits.txt 记录真实来源，不虚构 LPC 作者或 CC0 授权。

提示词概要：匹配参考角色黑发、蓝绿外套、米白内搭、深蓝裤、白鞋；四方向站立、四方向四帧行走与跑步、四方向无椅子坐姿；透明底粗像素描边。鸟角色保留银白青发、紫眼、头饰和鸟类身体，步行/跑步交替迈脚，坐姿收腿栖坐。
