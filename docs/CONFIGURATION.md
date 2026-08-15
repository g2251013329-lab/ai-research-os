# AI Research OS — 配置指南

本文档面向**新安装者**：从 GitHub 克隆后，按此清单即可完整配置运行。

## 0. 前置依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| Python | 3.12+ | 后端（FastAPI） |
| uv | 最新 | 依赖管理（或用 venv + pip） |
| Node.js | 20+ | 构建前端 |
| macOS | — | 主平台（Safari 优先） |
| Obsidian | — | 可选，笔记知识库（vault） |
| Zotero | — | 可选，文献库 |
| DeepSeek API Key | — | **必须**，AI 功能核心 |

## 1. 克隆与构建

```bash
git clone <你的仓库地址> ai-research-os
cd ai-research-os

# 后端
cd backend
uv sync                       # 安装依赖
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
# 数据目录默认 ~/Library/Application Support/AI-Research-OS，可用 AIROS_DATA_DIR 覆盖

# 前端（另一终端）
cd frontend
npm install
npm run build                 # 生产：构建后由后端托管，访问 http://127.0.0.1:8000
# 开发模式：npm run dev（http://localhost:5173，/api 代理到 8000）
```

## 2. 首次配置（打开设置页 http://127.0.0.1:8000/settings）

### 必须

1. **DeepSeek API Key** —— 设置页「DeepSeek API Key」填入
   - 存储：macOS Keychain（不可用时回退本地 0600 权限文件），**永不入库**
   - 可选：模型（默认 `deepseek-chat`）与 Base URL（可指向中转站）
2. **Obsidian Vault 路径** —— 设置页「Vault」填入你的 vault 路径（如 `~/Documents/MyVault`）
   - 学习笔记/阅读笔记/研究笔记都直接写入 vault（Markdown），Obsidian 立即可见
   - 若暂时没有 vault，可在任意空目录初始化一个（含 `.obsidian` 即可，或不填则笔记功能不可用）

### 可选集成

3. **Zotero 路径** —— 设置页填写 Zotero 数据目录（含 `zotero.sqlite`）
   - 推荐在 Zotero 设置中勾选「允许本机其他应用程序与 Zotero 通信」，获得双通道（运行时可读）
4. **One Scholar API Key** —— 设置页填入（用于文献发现的期刊 IF / 中科院分区增强；不填则跳过该信息）
5. **GitHub vault 同步** —— 设置页「同步」区配置 vault 仓库，可一键 commit/push
6. **小绿鲸 / Zotero / Obsidian 打开** —— 命令面板（⌘⇧P）可拉起本机安装的对应 App（按名称匹配）

### AI 问答通道（设置页「AI 问答通道」）

| 通道 | 配置 | 说明 |
|---|---|---|
| DeepSeek API | Key 见上 | 面板内上下文问答 + 全部执行功能 |
| GPT 网页版 | URL（默认 https://chatgpt.com） | 点击在 Safari 打开，仅问答 |
| Claude Science | URL（默认官方；本地实例可填 http://localhost:8990） | 点击在 Safari 打开，仅问答 |

## 3. 可选：macOS 自启动（launchd）

参考 `docs/autostart.md`：创建 `~/Library/LaunchAgents/com.ai-research-os.backend.plist` 后

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ai-research-os.backend.plist
```

登录即自动运行，崩溃自动重启。

## 4. 外观配置

- 设置页「界面主题」：Laboratory Light / Midnight / Graphite / Paper / Botanical 五主题
- 「强调色」：ocean / mint / sakura / grape / sunset / cyan / coral / mono 八变体
- 明暗切换：顶栏按钮；语言：中文 / English

## 5. 目录与数据

| 路径 | 内容 | 是否入库 |
|---|---|---|
| `backend/app` | 后端代码 | ✅ |
| `frontend/src` | 前端代码 | ✅ |
| `.airos-data/` | SQLite、settings.json（本机） | ❌ gitignore |
| Keychain / `secrets.json` | API 密钥 | ❌ 永不提交 |
| Obsidian vault | 笔记 | ❌ 独立仓库 |
| Zotero 数据库 | 文献 | ❌ 外部系统 |

## 6. 常见问题

- **页面打不开**：后端未运行。`uv run uvicorn app.main:app --port 8000` 或配置 launchd
- **Zotero 锁定**：Zotero 运行时需开启「允许其他应用通信」，否则请先关闭 Zotero
- **AI 无响应**：检查设置页 DeepSeek Key 状态（可测试连接）
- **时区**：所有统计按浏览器上报的本地时区计算，无需配置
- **端口冲突**：8000 被占用时改 `--port`

## 7. 本机专属工具（非通用依赖）

以下为作者本机环境，**新安装者可跳过**：
- CS Switch（Claude Science 沙箱 + DeepSeek 推理代理，端口 8990/18991）——AI 面板 Claude Science 通道自动检测并启动；无此工具时仅需将「AI 问答通道 → Claude Science」填为官方地址
- 小绿鲸英文文献阅读器——命令面板打开 PDF 阅读
