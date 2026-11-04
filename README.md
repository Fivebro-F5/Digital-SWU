# 数字西大

基于 Web 的西南大学数字校园游戏化平台。项目目标是融合校园导览、社交互动和校园服务，逐步建设可探索、可交互、可扩展的虚拟校园。

当前仓库已有前后端基础工程和共享类型。首期以一个局部校园场景打通前端、后端、数据库、插件和多人同步的技术链路；这些业务能力仍待后续开发。

## 本地启动

需要 Node.js 24.15+、npm；本地 PostGIS 需要 Docker Compose。当前仅健康检查和 Phaser 占位画布可用。

```powershell
Copy-Item .env.example .env
npm ci
docker compose -f infra/compose.yaml up -d
npm run db:generate
npm run db:migrate
npm run dev:api
```

在另一个终端运行 `npm run dev:web`，打开 Vite 提示的本地地址。API 健康检查路径为 `/api/health`。如只验证页面和 API，可暂时不启动 Docker，也无需执行数据库迁移。详情见[工程初始化说明](docs/project/工程初始化说明.md)。

## 文档入口

- [文档索引](docs/README.md)
- [项目概述](docs/project/数字西大-项目概述.md)：原始需求与技术方向
- [项目约束](docs/project/项目约束.md)：范围、技术、安全、质量与交付要求
- [架构与接口约定](docs/architecture/架构与接口约定.md)：模块边界与接口设计基线
- [待决策事项](docs/project/待决策事项.md)：尚未确定的方案
- [工程初始化说明](docs/project/工程初始化说明.md)：目录、版本与命令
- [AI 开发总提示词](docs/ai/开发总提示词.md)与[任务提示词模板](docs/ai/任务提示词模板.md)

开发代理请先阅读 [AGENTS.md](AGENTS.md)。

## 许可

本仓库使用 [Apache License 2.0](LICENSE)。
