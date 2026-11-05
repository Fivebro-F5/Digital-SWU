# 像素校园环境素材

20 个独立透明 PNG + 1 张完整教室背景。由内置 imagegen 生成，Python 切分、清理背景与边缘，保留原始大图于 source/。

- buildings/library.png：图书馆。
- buildings/teaching-straight.png：直线形教学楼。
- buildings/teaching-ring.png：圆环教学楼，中央庭院透明。
- buildings/teaching-diagonal.png：斜向教学楼。
- vegetation/：阔叶树、银杏、针叶树、樱花树、灌木、绿篱、花坛、盆栽。
- furniture/：学生课桌、教师桌、高书架、矮书柜、四方向椅子。方向指坐在椅子上的人的朝向。
- backgrounds/classroom.png：完整教室背景，包含 16 套课桌椅、黑板、投影幕、讲台、教师桌、书柜和绿植。
- manifest.json：单体文件路径、尺寸、建议原点。原点为摆放建议，不是实测碰撞区域。
- asset-preview.png：单体总览。

这是校园原型美术设计，并非西南大学真实建筑复原。不同原稿的视角与像素密度有差异，接入场景时需统一缩放；教室是整体背景，不是可拆墙面/家具图层的 Tilemap。遮挡、座位锚点、碰撞与寻路尚未设置。

建议使用 nearest-neighbor 缩放，并在目标地图中检查角色、门与桌椅比例。

生成提示词概要：暖米色/砖红校园建筑、青蓝玻璃，四种建筑外形；八种校园绿植；蜂蜜木色桌面、青色桌椅框架、彩色书本；完整教室具备黑板、整齐桌椅、中央过道、门窗、书柜，像素游戏风格无人物无文字。单体透明背景。

来源记录：OpenAI imagegen 生成及本地处理；没有使用第三方素材库，不附加虚构 CC0 或 LPC 授权。输出适用生成服务条款。
