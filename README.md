# 数字西大

基于 Web 的西南大学数字校园游戏化平台。项目目标是融合校园导览、社交互动和校园服务，逐步建设可探索、可交互、可扩展的虚拟校园。

当前仓库已有前后端基础工程和共享类型。首期以一个局部校园场景打通前端、后端、数据库、插件和多人同步的技术链路；这些业务能力仍待后续开发。

## 本地启动

需要 Node.js 24.15+、npm；本地 PostGIS 需要 Docker Compose。当前可单独运行原创掌机风格单人游戏原型：384×240 逻辑像素画板、32×24 俯视网格地图、逐格移动、疾跑、实体交互与建筑室内示例；场景仍使用虚构示意数据。

Windows 可双击 [启动开发.cmd](启动开发.cmd) 或 [启动调试.cmd](启动调试.cmd)。首次运行会自动执行 `npm ci`。其他系统或终端使用：

```text
npm ci
npm run dev          # 同时启动 Web 与 API
npm run dev:debug    # 同时启动，并开放本机 API 调试端口 9229
```

打开 `http://127.0.0.1:5173`；按 Ctrl+C 停止两个服务。调试模式可用 VS Code 等调试器附加到 `127.0.0.1:9229`。详细说明见[启动与调试](docs/project/启动与调试.md)。只体验单人原型也可运行 `npm run dev:web`。

需要本地 PostGIS 时，再执行：

```powershell
Copy-Item .env.example .env
docker compose -f infra/compose.yaml up -d
npm run db:generate
npm run db:migrate
```

API 健康检查路径为 `/api/health`。当前原型无需 Docker 或数据库迁移。玩法见[游戏原型说明](docs/project/游戏原型说明.md)。详情见[工程初始化说明](docs/project/工程初始化说明.md)。

## 文档入口

- [文档索引](docs/README.md)
- [项目概述](docs/project/数字西大-项目概述.md)：原始需求与技术方向
- [项目约束](docs/project/项目约束.md)：范围、技术、安全、质量与交付要求
- [架构与接口约定](docs/architecture/架构与接口约定.md)：模块边界与接口设计基线
- [待决策事项](docs/project/待决策事项.md)：尚未确定的方案
- [工程初始化说明](docs/project/工程初始化说明.md)：目录、版本与命令
- [游戏原型说明](docs/project/游戏原型说明.md)：玩法、数据性质与后续接入边界
- [启动与调试](docs/project/启动与调试.md)：一键脚本和调试端口
- [AI 开发总提示词](docs/ai/开发总提示词.md)与[任务提示词模板](docs/ai/任务提示词模板.md)

开发代理请先阅读 [AGENTS.md](AGENTS.md)。

## 许可

本仓库使用 [Apache License 2.0](LICENSE)。
