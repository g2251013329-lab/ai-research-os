# AI Research OS

**Personal Research Operating System** — 面向个人科研工作者的本地优先 AI 研究操作系统。

> 一个轻量级的个人 AI 科研工作空间，整合学习、研究、知识管理、实验记录与写作，
> 通过 AI 辅助编排连接已有的专业工具（Zotero / Obsidian / 小绿鲸 / GitHub / DeepSeek）。

- 📄 需求文档：[`docs/PRD_v1.0.md`](docs/PRD_v1.0.md)
- 🏗️ 架构说明：[`docs/architecture.md`](docs/architecture.md)
- 🎯 范围：P0 + P1（P2 明确排除）

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python 3.12 · FastAPI · SQLModel (SQLite, WAL) |
| 前端 | Vite · React · TypeScript · Tailwind CSS · Zustand · TanStack Query |
| AI | DeepSeek API（OpenAI 兼容，流式） |
| 集成 | Zotero（本地库只读）· Obsidian（vault Markdown）· GitHub（git CLI）· 小绿鲸（`open` 拉起） |

## 快速开始（开发模式）

### 后端

```bash
cd backend
uv sync                        # 安装依赖（需 Python 3.12，可用 uv 管理）
uv run uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173（/api 代理到 8000）
```

生产模式：`npm run build` 后由 FastAPI 直接托管 `frontend/dist`，访问 `http://127.0.0.1:8000`。

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `AIROS_DATA_DIR` | 数据目录（SQLite、settings.json） | `~/Library/Application Support/AI-Research-OS` |
| `AIROS_VAULT_PATH` | Obsidian vault 路径 | `~/ai-research-vault` |

## 数据安全

- DeepSeek API Key 存入 **macOS Keychain**（不可用时回退到本地 0600 权限文件），永不入库、永不提交。
- 笔记直接存 Obsidian vault（Markdown + frontmatter），app 只存索引与关系。
- 大体积科研数据不进 GitHub（PRD §16.2）。

## 开发阶段

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 基建：仓库、脚手架、设置页 | ✅ 已完成 |
| Phase 1 | 核心 UI 壳（⌘K 全局搜索 / ⌘⇧L 命令面板 / 404） | ✅ 已完成 |
| Phase 2 | Dashboard（Today 任务 / 收件箱 / 专注模式 / 时间线） | ✅ 已完成 |
| Phase 3 | Learning（LLPS 路线图 / 日历 / 打卡 / 学习笔记） | ✅ 已完成 |
| Phase 4 | Research | ⏳ |
| Phase 5 | 集成（Zotero/Obsidian/GitHub/小绿鲸） | ⏳ |
| Phase 6 | AI 层 | ⏳ |
| Phase 7 | P1 特性 | ⏳ |
| Phase 8 | 测试与优化 | ⏳ |
