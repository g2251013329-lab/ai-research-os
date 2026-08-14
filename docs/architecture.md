# AI Research OS — 架构文档

## 1. 定位

AI Research OS 是**编排层**，不是替代品（PRD §2.1）：

- 文献管理 → Zotero（app 只读集成）
- PDF 阅读/标注 → 小绿鲸（app 拉起）
- 长期知识库 → Obsidian（笔记 = vault 内 Markdown 文件）
- 版本控制 → Git / GitHub（私有仓）
- AI 层 → DeepSeek API（Key 存 Keychain）

app 只存储：**关系、元数据、工作流状态、索引**（PRD §27）。

## 2. 总体架构

```
Safari (唯一客户端)
   │  HTTP + SSE（AI 流式、git 同步事件）
   ▼
FastAPI (uvicorn 单进程, 目标 <120MB)
   ├── SQLite (WAL) —— 实体/关系/索引/设置
   ├── Obsidian vault —— Markdown 笔记读写（frontmatter 存元数据）
   ├── Git 子进程 —— GitHub 同步（commit/push，用户确认）
   ├── Zotero —— 本地库只读（zotero.sqlite / 本地 API）
   ├── 小绿鲸 —— open 命令拉起 PDF
   ├── Europe PMC / Semantic Scholar —— P1 文献发现
   └── DeepSeek API —— 上下文感知 AI（流式）
```

## 3. 数据架构

### SQLite 实体（P0+P1）

| 实体 | 说明 |
|---|---|
| Project | 研究组织层（对应 vault 项目文件夹） |
| ResearchQuestion | 一等对象，状态机 Open→Exploring→Testing→Supported/Rejected→Resolved |
| Hypothesis | 归属 RQ，含支持/矛盾证据链 |
| Paper | 文献元数据，关联 Zotero itemKey |
| Experiment | 结构化 13 字段模板（Objective…Next Step） |
| Task | Goal→Month→Week→Day→Task 层级 |
| InboxItem | 未整理捕获层 |
| LearningConcept | 学习路线图节点，状态 Not Started→Mastered |
| StudySession / FocusSession | 打卡与专注记录 |
| Book | 休闲阅读 |
| TimelineEvent | 研究溯源（"我如何得出这个结论"） |
| AIContextEntry | AI 记忆（可检查、可编辑、可删除） |

### 笔记模型

- 笔记 = vault 内 Markdown 文件，YAML frontmatter 存 `id/type/project/rq/tags/links`
- SQLite 存文件索引与关系，打开时解析 frontmatter
- Obsidian 实时可见；冲突时提示用户，不做静默覆盖

### 数据目录

默认 `~/Library/Application Support/AI-Research-OS/`（`AIROS_DATA_DIR` 可覆盖）：
`airos.db`、`settings.json`、`secrets.json`（仅 Keychain 不可用时的回退）。

## 4. 集成设计

| 集成 | 方式 | 阶段 |
|---|---|---|
| Zotero | 读 `~/Zotero/zotero.sqlite`（只读，分页按需） | P0 |
| Obsidian | vault 文件读写 + frontmatter；手动/打开时扫描 | P0 |
| GitHub | git 子进程；状态/commit/push 均需用户确认；秘密永不提交 | P0 |
| 小绿鲸 | `open -a "小绿鲸英文文献阅读器" <pdf>` | P0 |
| 检索外链 | Safari 打开 Google Scholar / PubMed / Semantic Scholar / Europe PMC | P0 |
| 文献发现 | Europe PMC REST + Semantic Scholar API → 聚合去重 → DeepSeek 排序 | P1 |
| DeepSeek | openai SDK，base_url=https://api.deepseek.com，流式 SSE | P1 |

## 5. AI 安全约束（PRD §32）

- 所有 AI 写入走 `预览 → 用户确认 → 应用` 三段式
- 系统提示词强约束：不得编造引用、不得把 AI 推测表述为实验事实
- AI 记忆可检查可删除；AI 建议不自动成为实验结论

## 6. 性能与内存策略（PRD §26）

- 单 uvicorn 进程 + SQLite WAL，零常驻服务进程
- 前端路由级代码分割；d3/日历等重型库按需加载
- 零轮询：SSE 事件推送；列表虚拟滚动；Zotero 分页按需
- AI 仅按需调用 + 流式输出
- 目标：后端 <120MB，前端首屏 <300KB gzip

## 7. 目录结构

```
ai-research-os/
├── backend/
│   ├── app/
│   │   ├── main.py            # 入口
│   │   ├── core/              # config / db / security
│   │   ├── api/               # 路由（按空间分模块）
│   │   ├── models/            # SQLModel 实体
│   │   ├── services/          # zotero / obsidian / github / ai
│   │   └── ai/                # prompts / context / memory
│   └── tests/
├── frontend/
│   └── src/
│       ├── pages/             # Dashboard / Learning / Research / Leisure / Inbox / Settings
│       ├── components/        # layout / 通用组件
│       ├── stores/            # Zustand
│       ├── i18n/              # zh / en
│       └── api/               # 客户端封装
└── docs/
```

## 8. 已知限制

- DeepSeek 公开 API 无视觉输入 → Figure Explanation 降级为 caption+上下文模式（后续可换多模态）
- 小绿鲸深链（URL scheme）能力未知 → 先走 `open` 命令，best-effort
