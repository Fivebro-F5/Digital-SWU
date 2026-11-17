import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const root=process.cwd(), build=path.join(root,'.ppt-build');
const skill='C:/Users/zhaoyaning/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations';
const runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={paper:'#F4F1DF',ink:'#213D31',green:'#52734A',gold:'#B6873D',muted:'#687562'};
function txt(s,t,x,y,w,h,size=26,color=C.ink,bold=false){let a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});a.text=t;a.text.style={typeface:'Microsoft YaHei',fontSize:size,color,bold};return a;}
async function img(s,file,x,y,w,h,fit='contain'){let b=await fs.readFile(path.join(root,file));s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',position:{left:x,top:y,width:w,height:h},fit,alt:'数字西大项目像素素材'});}
async function base(n,title,who){n=p.slides.items.length+1;let s=p.slides.add();s.background.fill=C.paper;txt(s,`DIGITAL SWU   /   ${String(n).padStart(2,'0')}`,64,34,700,28,18,C.green,true);txt(s,title,64,90,1150,90,48,C.ink,true);txt(s,who,64,654,1050,28,17,C.muted);txt(s,String(n).padStart(2,'0'),950,651,60,34,22,C.green,true);s.speakerNotes.text='模板说明：所有正文均可编辑；方括号内容需替换。项目素材仅作视觉示例，不代表测试结果。正式汇报前核对功能状态。';return s;}
let s=await base(1,'数字西大','成员 01  /  项目需求与方案选择  /  约 50 秒');
await img(s,'swu_gate_project/preview_small.png',600,0,680,620,'cover');
txt(s,'在像素世界中\n探索校园',64,230,500,180,50,C.ink,true);txt(s,'校园游戏化探索平台\n项目汇报 · 可编辑模板',64,445,500,85,25);txt(s,'[小组名称]   [五位成员]   [日期]',64,570,510,44,20,C.muted);
s=await base(2,'从用户需求到方案选择','成员 01  /  约 70 秒');
txt(s,'01  谁需要？',64,210,440,55,30,C.green,true);txt(s,'[目标用户与使用场景]\n[访谈或观察依据]',64,280,470,120,27);txt(s,'02  为什么选择像素探索？',650,210,550,55,30,C.green,true);txt(s,'[候选方案 A / B / C]\n需求匹配 · 可用性 · 开发周期\n[补充筛选结论与依据]',650,280,550,160,27);txt(s,'需求：[具体需求]     功能：[对应功能]     验证：[测试任务]',64,535,1140,70,24,C.gold,true);
s=await base(3,'人物与校园的视觉语言','成员 02  /  人物设计与地图绘制  /  约 70 秒');
await img(s,'character-pack/palette-preview.png',64,205,740,370);txt(s,'视觉设计说明',860,210,350,55,30,C.green,true);txt(s,'[人物识别特征]\n\n[角色与建筑比例]\n\n[素材风格统一方法]',860,280,340,300,26);txt(s,'素材示例：替换为本组最终人物与地图设计稿',64,592,770,35,18,C.muted);
s=await base(4,'品牌表达与推广计划','成员 02  /  约 50 秒');
await img(s,'campus-buildings-signed/campus-buildings-signed/teaching/teaching-01.png',800,205,400,360);
txt(s,'数字西大',64,210,700,75,48,C.green,true);txt(s,'[一句话品牌主张]',64,300,700,55,30);txt(s,'目标受众    [首批体验者]\n推广渠道    [体验链接 / 落地页]\n推进步骤    [试用、反馈、改进]\n行动入口    [体验二维码或 URL]',64,390,710,220,26);
s=await base(5,'地图组合与用户探索流程','成员 03  /  地图搭建和组合  /  约 45 秒');
await img(s,'pixel_swu_ground_6zones_v1/previews/six_scenes_overview.png',64,205,740,390);
txt(s,'一次探索',860,205,330,55,32,C.green,true);txt(s,'01  进入校园\n02  操控角色\n03  跨区探索\n04  查看小地图\n05  阅读地点说明',860,285,350,300,28);
s=await base(6,'原型演示','成员 03  /  约 75 秒');
await img(s,'swu_gate_project/preview_small.png',64,195,780,420,'contain');txt(s,'演示路线',895,205,300,55,30,C.green,true);txt(s,'[出生点]\n\n[跨区行走]\n\n[定位与交互]',895,285,300,260,28);txt(s,'替换为运行截图或插入演示视频',64,610,780,30,19,C.muted);
s=await base(7,'技术实现与团队协作','成员 04  /  引擎与技术实现  /  约 45 秒');
const rows=[['界面','Vue 3','页面、组件与状态展示'],['场景','Phaser','渲染、角色、镜头与交互'],['地图','Tiled','地图、图层与对象编辑'],['后端','NestJS','[填写已实现模块]']];
rows.forEach((r,i)=>{let y=215+i*87;txt(s,r[0],64,y,140,50,29,C.green,true);txt(s,r[1],260,y,240,50,29,C.ink,true);txt(s,r[2],565,y,620,60,26);});txt(s,'个人贡献：[具体模块]     关键问题：[问题与处理方式]',64,585,1140,50,23,C.gold);
s=await base(8,'用户测试与迭代改进','成员 04  /  约 75 秒');
txt(s,'测试发现',64,210,520,60,32,C.green,true);txt(s,'[参与人数 / 日期 / 任务]\n\n[任务完成情况]\n\n[用户原话或观察证据]',64,290,520,260,27);txt(s,'对应改进',670,210,520,60,32,C.green,true);txt(s,'[修改前截图或描述]\n\n[修改后截图或描述]\n\n[复测结果 / 待复测]',670,290,520,260,27);txt(s,'仅填写真实记录；未完成测试时将标题改为“用户测试计划”',64,590,1140,40,20,C.gold);
s=await base(9,'商业模式与成本假设','成员 05  /  项目可行性  /  约 60 秒');
txt(s,'谁使用，谁支持？',64,215,550,60,32,C.green,true);txt(s,'使用者    [用户群体]\n支持方    [待验证对象]\n价值      [核心价值主张]\n渠道      [触达方式]',64,300,560,240,27);txt(s,'成本从哪里来？',690,215,510,60,32,C.green,true);txt(s,'开发与美术    [工时与依据]\n部署服务      [预算与期间]\n内容维护      [更新成本]\n收入模式      [待验证假设]',690,300,520,240,27);txt(s,'现金支出与劳动投入分开记录，假设不作为已获得的收入。',64,590,1140,40,21,C.gold);

s=await base(11,'核心需求与验收标准','扩展内容 / 需求与验证');
txt(s,'探索连续性',64,215,370,55,30,C.green,true);txt(s,'角色沿道路跨越相邻区域\n[记录路线与异常情况]',64,285,500,120,27);
txt(s,'定位与交互',675,215,500,55,30,C.green,true);txt(s,'使用小地图判断当前位置\n打开、阅读并退出地点说明',675,285,520,120,27);
txt(s,'验收记录：[测试版本]  [测试环境]  [通过条件]  [实际结果]',64,500,1100,90,24,C.gold);
s=await base(12,'概念筛选与方案取舍','扩展内容 / 方案选择');
const opts=[['静态校园介绍','内容展示直接','互动与探索空间有限'],['交互校园地图','地点查询清晰','需要验证内容与定位体验'],['像素校园探索','角色与校园场景结合','素材制作与联调投入较多']];
opts.forEach((r,i)=>{let x=64+i*390;txt(s,r[0],x,225,360,60,30,C.green,true);txt(s,r[1]+'\n\n'+r[2],x,320,350,170,25);});
txt(s,'比较维度：需求匹配、可用性、开发周期、维护成本。评分与结论由小组补充。',64,550,1110,70,22,C.gold);
s=await base(13,'用户测试记录','扩展内容 / 测试证据');
const tests=[['任务 01','从出生点走到指定区域'],['任务 02','用小地图判断当前位置'],['任务 03','找到并阅读地点说明']];
tests.forEach((r,i)=>{let y=220+i*105;txt(s,r[0],64,y,180,55,28,C.green,true);txt(s,r[1],260,y,520,55,27);txt(s,'[完成数 / 用时 / 求助]',800,y,400,55,24);});txt(s,'参与者：[人数与特点]    日期：[日期]    版本：[版本号]',64,570,1100,50,23,C.gold);
s=await base(14,'团队分工与交付物','扩展内容 / 五人协作');
const team=[['成员 01','[第五位成员职责]','[具体成果]'],['成员 02','人物设计与地图绘制','角色素材、地图美术'],['成员 03','地图搭建与组合','分区布局、区域拼接'],['成员 04','[引擎或服务端模块]','[代码模块与演示]'],['成员 05','后端搭建与地图完善','工程基础、地图修整']];
team.forEach((r,i)=>{let y=210+i*74;txt(s,r[0],64,y,180,45,26,C.green,true);txt(s,r[1],280,y,460,50,26);txt(s,r[2],780,y,420,50,24);});
s=await base(15,'风险识别与应对措施','扩展内容 / 项目可行性');
const risk=[['资源加载异常','探索流程中断','[检查与恢复措施]'],['地图信息不准确','用户误解空间信息','校对来源，标注示意范围'],['功能范围扩张','开发延期、联调困难','优先完成核心探索与测试']];
txt(s,'潜在风险',64,210,300,55,28,C.green,true);txt(s,'可能影响',450,210,300,55,28,C.green,true);txt(s,'应对方式',825,210,370,55,28,C.green,true);
risk.forEach((r,i)=>{let y=300+i*90;txt(s,r[0],64,y,350,65,25);txt(s,r[1],450,y,350,65,25);txt(s,r[2],825,y,370,65,24);});
txt(s,'FMEA 记录可补充：严重度、发生度、探测度及改进责任人。',64,585,1100,45,21,C.gold);

s=await base(10,'下一关：完善体验，验证价值','成员 05  /  风险与下一步  /  约 60 秒');
txt(s,'主要风险',64,215,560,55,32,C.green,true);txt(s,'[风险 1]   [控制措施]\n\n[风险 2]   [控制措施]\n\n[风险 3]   [控制措施]',64,295,610,250,26);txt(s,'接下来的三个步骤',755,215,450,55,30,C.green,true);txt(s,'01  完成用户测试\n\n02  修复并复测\n\n03  推进后续技术链路',755,295,450,250,27);txt(s,'谢谢观看',64,575,600,60,38,C.ink,true);
const plants=['tree-ginkgo','tree-conifer','tree-cherry','tree-broadleaf','potted-plant','flowerbed','shrub','hedge','tree-ginkgo','tree-cherry'];
const frames=await fs.readdir(path.join(root,'角色单帧'),{recursive:true});
const people=frames.filter(f=>f.endsWith('-idle-down-000.png') && !f.includes('bird')).sort();
for(let i=0;i<p.slides.items.length;i++){
 const slide=p.slides.items[i];
 if(i>0) await img(slide,'assets/campus-environment/vegetation/'+plants[i%plants.length]+'.png',1110,24,104,130);
 await img(slide,path.join('角色单帧',people[0]),1030,623,65,65);
 await img(slide,'角色单帧/girl/09-rose/idle/girl-09-rose-idle-down-000.png',1095,623,65,65);
 await img(slide,'角色单帧/bird/original/idle/bird-original-idle-down-000.png',1160,623,65,65);
}
await img(p.slides.items[1],'assets/campus-environment/vegetation/tree-ginkgo.png',480,410,72,95);
await img(p.slides.items[7],'assets/campus-environment/vegetation/flowerbed.png',1100,500,90,70);

for(let i=0;i<p.slides.items.length;i++){let png=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()));}
await (await PresentationFile.exportPptx(p)).save(path.join(build,'candidate.pptx'));
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
console.log(await finalizePresentation({workspaceDir:root,candidatePath:path.join(build,'candidate.pptx'),finalPath:path.join(root,'output/ppt/数字西大_15页三人物版.pptx'),pythonExecutable:runtime+'/python/python.exe',integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Microsoft YaHei']},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation-v3.json')}));




