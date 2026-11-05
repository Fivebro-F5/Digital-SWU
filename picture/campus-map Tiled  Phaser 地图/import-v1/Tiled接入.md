# 西南大学主校区地图交付
campus.tmj 为 Tiled JSON 格式。保持 campus-tiles.png 与其同目录。原点左上，1 地图单位对应原图 1 像素，500 × 537 格，每格 4 × 4 px。ground 为草地、道路、建筑底色等；collision 非零格表示校外、建筑或水域；道路和草地均可通行。objects 中 spawn 为点，entrance 为矩形触发区，entityId 关联 entities.json。foreground 为可遮挡角色的示意屋檐，绘制深度应高于角色。地图是按原图分类绘制的功能底图。
## Phaser 3 接入片段
preload 中加载地图及其图片（路径随部署目录调整）。
```js
this.load.tilemapTiledJSON('swu','maps/campus.tmj')
this.load.image('campus','maps/campus-tiles.png')
```
在 Scene.create 中用以下代码替换背景绘制。player 是已有 Arcade Physics 角色。世界单位很小，应将脚部碰撞体设置为约 2 × 2 世界像素，并调整角色缩放、移动速度和镜头 zoom。
```js
const map = this.make.tilemap({key:'swu'})
const tiles = map.addTilesetImage('campus','campus')
map.createLayer('ground',tiles).setDepth(0)
const walls = map.createLayer('collision',tiles).setVisible(false)
walls.setCollisionByExclusion([-1])
this.physics.add.collider(player,walls)
map.createLayer('foreground',tiles).setDepth(2)
player.setDepth(1)
const objects = map.getObjectLayer('objects').objects
const spawn = objects.find(o => o.name === 'spawn')
player.setPosition(spawn.x,spawn.y)
this.physics.world.setBounds(0,0,map.widthInPixels,map.heightInPixels)
player.setCollideWorldBounds(true)
this.cameras.main.setBounds(0,0,map.widthInPixels,map.heightInPixels).startFollow(player)
for (const o of objects.filter(o => o.type === 'entrance')) {
  const trigger = this.add.zone(o.x+o.width/2,o.y+o.height/2,o.width,o.height)
  this.physics.add.existing(trigger,true)
  const id = o.properties.find(p => p.name === 'entityId').value
  this.physics.add.overlap(player,trigger,() => {
    if (Phaser.Input.Keyboard.JustDown(interactKey)) this.events.emit('building-interact',id)
  })
}
```
interactKey 应在创建触发区前绑定到交互键。服务端可读取 objects 与 collision 进行位置/交互校验，碰撞格索引为 floor(y/4)*500+floor(x/4)。入口为生成的可达候选格，需在 Tiled 中核实位置并更新 verified；相邻建筑的候选触发区可能重叠。出生点与候选入口均按单格角色验证连通性。