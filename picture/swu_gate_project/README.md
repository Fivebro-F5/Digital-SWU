# 像素西大 · 一号门「含弘门」可编辑地图工程

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
