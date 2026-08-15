# AI Research OS — Visual Audit + Design Direction + Design System Proposal

**版本:** v1.0（待确认）  
**依据:** `docs/PRD_v1.0.md` · `UI_DESIGN_BRIEF.md` · `DESIGN_SYSTEM.md`  
**状态:** 提案稿 — 确认设计方向后再进入实现

---

# 第一部分 · Visual Audit（现状审计）

## 1.1 当前实现事实（基线）

- **Shell**：左侧栏 w-56（品牌 + 7 个导航项 + 设置）+ 顶栏 h-12（搜索/语言/明暗切换）+ 主工作区 + 右侧可折叠 AI 上下文面板（`AiContextPanel`）
- **主题**：8 个 accent 色相（ocean/mint/sakura/grape/sunset/cyan/coral/mono）× light/dark 两态；`--accent/--accent-2` 驱动按钮、激活导航、渐变品牌字
- **字体**：Outfit 400–700（拉丁）+ PingFang SC 回退；品牌副标题 Great Vibes/Dancing Script；`h1-h3` 显示字体 + 收紧字距；全局 `tabular-nums`
- **表面**：几乎全部 `rounded-lg border bg-white` 卡片 + `shadow-card`；环境光双角径向渐变背景（`app-bg`）
- **图标**：lucide 单一家族（strokeWidth 1.8 为主）
- **交互**：全局 `data-tip` 悬停提示、Toast、⌘K 搜索 / ⌘⇧L 命令面板、两步删除确认、`focus-visible` 焦点环、按钮按压反馈
- **页面**：Dashboard（今日/研究概览/学习概览/最近活动）、Learning（roadmap/calendar/checkin/notes 四 tab）、Research（项目卡 + 项目详情 tab 集）、Literature（我的文献/Zotero/AI 发现）、Inbox、Leisure（阅读 + 三个外链卡）、Settings（纵向卡片堆叠）

## 1.2 主要问题清单（对照两份文档逐条）

### A. 色彩系统

| # | 问题 | 证据 | 文档要求 |
|---|---|---|---|
| A1 | **只有单一 accent，无语义色系统** | 成功/警告/危险/信息全靠 Tailwind 硬编码（emerald/amber/red/blue）散落在各文件 | DS §3 要求语义类别：Success/Warning/Danger/Info + 领域色 |
| A2 | **状态色被重复硬编码** | `KIND_STYLES`（Dashboard）、`SCHEDULE_COLORS`（Calendar）、`STATUS_STYLES`（Roadmap/Status）、`KIND_STYLES`（Links/Inbox）等 6+ 处各自定义同一套"任务类型色" | DS §56 禁止逐页硬编码颜色 |
| A3 | **领域无身份色** | Learning/Research/Leisure 三空间共用同一 accent，无空间人格 | Brief §5 / DS §10 要求空间人格差异 |
| A4 | **科学对象色未系统化** | 文献/实验/问题/假设/结果没有稳定语义映射 | DS §11 建议 Literature→blue、Experiment→teal、Question→amber、Hypothesis→violet、Result→green |
| A5 | **8 个 accent 是色相旋转，不是主题** | 无 Laboratory Light / Midnight / Graphite / Paper / Botanical 五主题 | Brief §12 / DS §5–9 要求真实语义主题系统 |
| A6 | 暗色背景为近黑 `#0a0a0a`，偏"纯黑" | `.dark { --app-bg: #0a0a0a }` | Brief §12 要求 near-black **blue**（偏蓝近黑） |

### B. 字体排印

| # | 问题 | 证据 | 文档要求 |
|---|---|---|---|
| B1 | **无显式 Type Scale** | H1=20px、页内节标题 13px、正文 13px、元数据 11px，均为散点，无 Display/H1/H2/H3/Body/Caption 层级定义 | DS §13 要求完整层级（Display 40–48 → Meta 11–12） |
| B2 | **标题缺乏存在感** | 页面标题仅 20px semibold；节标题 13px 与正文几乎同号 | Brief §3 Editorial Intelligence |
| B3 | **无衬线编辑字体** | Leisure/阅读/写作没有 editorial 字体（Source Serif/Noto Serif） | Brief §13 / DS §12 |
| B4 | **科学数据无专用等宽** | 仅个别处 `font-mono`（时间/百分比），无 JetBrains/IBM Plex Mono 体系 | DS §12 Code/Scientific Data |
| B5 | 行高/字距未按层级配置 | 全局 `-0.015em`，正文行高 1.5 未系统化 | DS §13 "use contrast in size, weight, spacing…" |

### C. 布局与空间

| # | 问题 | 证据 | 文档要求 |
|---|---|---|---|
| C1 | **卡片过载** | Dashboard 4 大区、Settings 10+ 卡、Research 项目卡——"每段都装框" | Brief §20 / DS §25 反模式"card overload"；用 divider/table/timeline 替代 |
| C2 | **无密度模式** | 全应用统一 12–13px 密度，无 Compact（文献/实验）/ Comfortable（仪表盘/学习）/ Focused（写作）之分 | Brief §3 / DS §45 |
| C3 | **无状态/活动底栏** | Brief 壳层含 Status/Activity 条，当前无 | Brief §4 |
| C4 | 间距无 4px 节奏声明 | p-2/p-2.5/p-3/p-4 混用，无 spacing scale 常量 | DS §14 |
| C5 | 无圆角层级 | rounded-md/lg/xl 混用无规则（6/8/10–12/12–16/16/999） | DS §15 |
| C6 | 无分割线式区块 | 列表/分区几乎全用卡片边界，少用 border-subtle 分隔 | DS §16 |

### D. 组件体系

| # | 问题 | 证据 | 文档要求 |
|---|---|---|---|
| D1 | **无统一组件库** | Tag/Badge/Progress/EmptyState/DataTable 全部内联实现且互不一致 | DS §53 组件命名与复用 |
| D2 | **文献列表非表格** | MyPapersList 是图标行列表，无筛选器/源选择器/排序 | Brief §8 要求专业科学数据库感 |
| D3 | **Loading 无骨架屏** | 全部 spinner；无 skeleton | DS §42 |
| D4 | **Empty/Error 态简陋** | 仅一行灰字；无"原因+可做什么+数据安全"结构 | DS §41/§43 |
| D5 | **无 Motion Token** | 过渡时长散乱；无 `prefers-reduced-motion` | DS §50 |
| D6 | **快捷键与规范不一致** | 命令面板用 ⌘⇧L；文档规定 ⌘⇧P（并建议 ⌘N） | Brief §23 / DS §48 |
| D7 | 状态指示依赖颜色为主 | 部分 chip 有文字（✓），但无统一"色+图标+文字"规范组件 | DS §30 |
| D8 | 无 Design Playground | `/design-system` 路由不存在 | Brief §17 / DS §52 |

### E. 壳层与页面级

| # | 问题 | 证据 | 文档要求 |
|---|---|---|---|
| E1 | 侧边栏无分区与空间身份 | 导航平铺 7 项；无 Dashboard/空间/系统分组 | DS §21 |
| E2 | 顶栏信息少 | 无面包屑/当前空间上下文/专注入口 | DS §22 |
| E3 | Dashboard 非"指挥中心" | 三列卡组，无今日优先级/当前焦点层次 | Brief §6 |
| E4 | 实验页非"实验记录本" | 表单化；无 OBJECTIVE/HYPOTHESIS/PROTOCOL/RESULTS/INTERPRETATION/NEXT STEP 编辑层级 | Brief §9 |
| E5 | Leisure 无编辑感 | 与主界面同质；缺衬线/留白/封面呈现 | Brief §11 |

### F. 已达标项（保留）

- 单图标家族（lucide）✓；焦点环 ✓；两步确认 ✓；AI 为上下文化（侧栏+上下文弹窗）而非常驻大聊天 ✓；玻璃仅用于顶栏/侧栏 ✓；环境光背景克制 ✓；阴影 token 化（shadow-card/lift）✓；`data-tip` 悬浮提示体系 ✓；按钮按压反馈 ✓

---

# 第二部分 · Design Direction（设计方向）

## 2.1 总体气质

> **个人科学仪器**——精密、克制、有编辑感、安静智能。拒绝通用 SaaS 仪表盘、拒绝黑紫霓虹 AI 风、拒绝卡片堆砌。

三个关键词落到可执行规则：

1. **Scientific Precision**：对齐、节奏、强排印、语义色、结构化数据呈现；装饰最小化
2. **Editorial Intelligence**：正文为主的内容布局——有力标题、有意义留白、元数据层级、分隔线
3. **Calm Intelligence**：quiet 的 AI；contextual actions 而非大聊天面板

## 2.2 空间人格（三空间差异化）

| 空间 | 人格 | 色彩倾向 | 排版密度 | 布局倾向 |
|---|---|---|---|---|
| **Learning** | Knowledge · Growth · Clarity | 蓝/teal/柔绿 | Comfortable | 路线图、日历、进度、知识关系 |
| **Research** | Precision · Depth · Investigation | 深蓝/cyan/石墨 | Compact + Comfortable | 时间线、证据面板、双栏、密集元数据 |
| **Leisure** | Calm · Personal · Editorial | 暖中性/草木/纸感 | Spacious/Editorial | 留白、衬线、封面、个人笔记 |

## 2.3 每屏不是三列卡片

页面布局从"卡片网格"转向：分区 + 分隔线 + 表格 + 时间线 + 分栏 + 文档布局。卡片只用于"摘要对象/项目预览/指标/重要动作"。

---

# 第三部分 · Design System Proposal

## 3.1 Token 架构（三层）

```
Primitive Tokens（中性色阶、原始色）
   ↓
Semantic Tokens（背景/前景/表面/边框/主要/强调/状态/领域）
   ↓
Component Tokens（按钮、输入、标签、进度…的局部映射）
   ↓
Page
```

实现方式：沿用 Tailwind v4 `@theme` + CSS 变量。**现有 `--accent` 体系迁移为语义 token 的一部分**（accent 保留为"强调色变体"，用户可选 accent 作为主题上的叠加层）。

### 3.1.1 语义色类别（新增/落地）

```text
--bg / --fg / --surface / --surface-elevated / --surface-hover
--border / --border-subtle / --border-strong
--primary / --primary-fg / --accent / --accent-soft
--success / --warning / --danger / --info
--domain-learning / --domain-research / --domain-leisure
--obj-literature / --obj-experiment / --obj-question / --obj-hypothesis / --obj-result
```

### 3.1.2 科学对象色映射（统一，禁止再硬编码）

```text
文献 Literature  → blue
实验 Experiment  → teal
问题 Question    → amber
假设 Hypothesis  → violet/blue
结果 Result      → green
警告 Warning     → orange
拒绝 Rejected    → muted red
已解决 Resolved  → green
```

现有 6+ 处 `KIND_STYLES`/`SCHEDULE_COLORS`/`STATUS_STYLES` 全部收敛到 token。

## 3.2 主题系统（五主题 × accent 变体）

| 主题 | 定位 | 背景 | 主色 | 强调 | 说明 |
|---|---|---|---|---|---|
| **Laboratory Light** | 默认亮色 | cool neutral-50 | 深蓝 | teal/cyan | 保留现有 accent 选择器作为变体 |
| **Midnight Laboratory** | 默认暗色 | near-black **blue**（#0b1220 系） | 柔蓝 | cyan-teal | 替换现有 `#0a0a0a` 纯黑 |
| **Graphite** | 研究/实验 | 石墨灰 | 灰蓝 | 柔绿 | |
| **Paper / Editorial** | 文献/写作/休闲 | 暖纸色 | 灰蓝 | 暗红/棕 | |
| **Botanical** | 生命科学 | 深林绿 | sage | 柔 cyan | 克制，不装饰化 |

主题切换 = 语义 token 整组替换（CSS 变量），accent 变体在主题上叠加（用户现有 mint 偏好保留为默认 accent）。主题持久化到 settings。

## 3.3 字体体系

| 层级 | 字体 | 字号 | 说明 |
|---|---|---|---|
| **Display** | Outfit 600–700 | 32–36px / -0.02em | 页面标题、仪表盘大数字 |
| **H1** | Outfit 600 | 24–28px | 空间页标题 |
| **H2** | Outfit 600 | 18–22px | 区块标题 |
| **H3 / Section** | Outfit 500–600 | 14–16px | 节标题（当前 13px 提升） |
| **Body** | 系统栈（SF Pro/PingFang）| 14px / 1.6 | 正文（macOS 原生感） |
| **Body Small** | 系统栈 | 13px | 列表正文 |
| **Caption / Metadata** | 系统栈 500 | 11–12px / +0.02em | 元数据、时间戳 |
| **Code** | JetBrains Mono | 12–13px | 代码、路径 |
| **Scientific Data** | JetBrains Mono + tabular | 12–13px | 时间、百分比、实验数值 |

**决策点**：正文从 Outfit 切回系统栈（SF Pro 原生质感）还是保留 Outfit（个性几何感）？→ 推荐：**正文系统栈 + 标题 Outfit**，兼顾 macOS 原生与品牌个性。等确认。

## 3.4 间距 / 圆角 / 边框 / 阴影 / 玻璃

- **间距**：4px 基准，显式 token（4/8/12/16/20/24/32/40/48/64/80/96）；页面容器 p-6→p-8，节间距 24/32
- **圆角**：控件 6 / 输入 8 / 卡片 10 / 面板 12–14 / 浮层 16 / 胶囊 999
- **边框**：`border-subtle/default/strong` 三级；分区多用 border-subtle 分隔而非卡片
- **阴影**：none/subtle/medium/floating 四级（现有 shadow-card/lift 归入）
- **玻璃**：仅顶栏、命令面板、popover、临时上下文面板（现状已符合，规范化 token）

## 3.5 Motion

```text
--motion-fast 120ms   hover/按压/小状态
--motion-normal 200ms 面板展开、弹窗、tab 切换
--motion-slow 320ms   主题切换、专注模式过渡
@media (prefers-reduced-motion) { 全部禁用 }
```

原则：transform/opacity 驱动；不做粒子/视差/辉光。

## 3.6 组件体系（新建 ui/ 目录，收敛内联实现）

**Core：**
```text
AppShell  Sidebar  Header  WorkspaceHeader  Section  Panel  Card
DataTable  Timeline  Tag  Badge  Progress  EmptyState  LoadingState(Skeleton)  ErrorState
AIAction  AISuggestion  StatusDot  Kbd  Tooltip(data-tip 现有)  Modal
```

**收敛清单（现有内联 → 组件）：**

| 现状散点 | 收敛为 |
|---|---|
| 6+ 处 KIND_STYLES/COLORS | `Tag`（语义色 token） |
| 各页状态 chip | `StatusBadge`（色+图标+文字） |
| 各处空态一行字 | `EmptyState`（图标+标题+说明+CTA） |
| spinner 散点 | `LoadingState`（skeleton 优先） |
| 文献列表行 | `DataTable`（紧凑/舒适两密度、行 hover、sticky 头、排序预留） |
| 进度条 3 处 | `Progress`（bar/ring） |
| 弹窗 10+ 个手写 | `Modal` 基座（半径/遮罩/动效统一） |

## 3.7 壳层方案（对应 Brief §4 / DS §20–22）

```
┌──────────────────────────────────────────────────────────┐
│ Header: 面包屑/空间标识 · 搜索 ⌘K · 命令 ⌘⇧P · 专注 · AI · 设置 │
├────────────┬─────────────────────────────┬───────────────┤
│ Sidebar    │ Main Workspace             │ Context/AI    │
│ 品牌        │ (按页面布局自由组合)         │ (可折叠)       │
│ Dashboard  │                            │               │
│ ── 空间 ──   │                            │               │
│ Learning   │                            │               │
│ Research   │                            │               │
│ Literature │                            │               │
│ Leisure    │                            │               │
│ ── 系统 ──   │                            │               │
│ Inbox · 设置 │                            │               │
├────────────┴─────────────────────────────┴───────────────┤
│ Status 条: 专注计时 / 最近活动 / 同步状态（轻量，可折叠）        │
└──────────────────────────────────────────────────────────┘
```

- 侧边栏：分组（Command/Dashboard / 空间 / 系统）+ 空间身份色（当前空间高亮带色点）
- 顶栏：面包屑（空间 → 页面）、搜索、⌘⇧P、专注入口、AI、设置
- **快捷键对齐**：命令面板改为 **⌘⇧P**（保留 ⌘⇧L 别名兼容）；新增 ⌘N 新建
- Status 底栏：默认收窄为一条 28px 细条（专注/同步/最近事件），可折叠

## 3.8 页面级设计方案

| 页面 | 方案要点 |
|---|---|
| **Dashboard** | 指挥中心：左侧"今日 + 焦点"主列（任务、当前专注、今日完成），右侧"研究/学习概览"元数据列；顶部 4 个大数字（今日完成/专注分钟/连续天数/进行中实验）；最近活动用时间线而非卡片 |
| **Learning** | Comfortable：顶部进度条（概念掌握）+ 连续天数 + 本周专注；四 tab 保留；roadmap 节点加密度优化；日历保持三视图 |
| **Research** | Compact：项目行（非大卡片）+ 右侧预览；项目详情 = 研究问题→假设→文献→实验的**垂直证据链时间线**（Brief §7 关系流） |
| **Literature** | 专业数据库：搜索 + 来源筛选器（全部/PubMed/Scholar/S2/Europe PMC/Zotero）+ 状态筛选 + DataTable 紧凑密度；行内元数据（IF/分区/年份/项目） |
| **Experiment** | 实验记录本：`EXPERIMENT #N` 头部 + Objective/Hypothesis/Protocol/Results/Interpretation/Next Step 分节编辑（分区 + 分隔线，非表单堆） |
| **Leisure** | Editorial：暖纸底色、衬线标题、书卡（进度环）、阅读笔记竖排；音乐/视频/口语卡片保留但融入主题 |
| **Inbox** | 保持捕获感：单行输入 + 列表；类型 Tag 语义化 |
| **Settings** | 左侧节导航（外观/集成/同步/密钥）+ 右侧面板，替代纵向卡片堆 |
| **Focus Mode** | 按 DS §46：仅任务+计时+退出，全屏沉浸层 |

## 3.9 实现顺序（对应 Brief §21）

```text
1. Token 层（中性阶 + 语义色 + 领域色）      → index.css 重构
2. 主题引擎（5 主题 × accent 变体 + 迁移旧 accent 设置）
3. 字体体系（正文系统栈 + 标题 Outfit + Mono + 字号层级）
4. 壳层（Sidebar 分组 / Header 面包屑 / Status 条 / ⌘⇧P）
5. ui/ 组件库（Tag/Badge/Progress/EmptyState/Loading/Modal/DataTable…）
6. /design-system Playground
7. 页面改造：Dashboard → Research → Literature → Experiment → Learning → Leisure → Inbox/Settings → Focus
8. Motion token + reduced-motion
9. Visual QA 循环（截图自查，配合已装好的 vision-toolkit 插件做像素级验收）
10. 性能复查（骨架屏、列表虚拟化按需）
```

## 3.10 治理规范（落地 DS §55）

- 新组件前 7 问（是否已有组件可组合 / 是否需新 token / 全主题可用 / 密度模式 / 状态完备 / 可访问 / 复杂度合理）
- 颜色只允许引用语义 token；禁止页面级硬编码色值
- 状态必须"色 + 图标 + 文字"三要素
- 代码评审项：`grep` 禁止新增 `bg-emerald|amber|red|blue-…` 类直接用于状态

---

# 待确认的决策点

1. **正文字体**：系统栈（SF Pro，macOS 原生，推荐）还是保留 Outfit？
2. **五主题 vs 现 accent 体系**：保留"主题 × accent 变体"双维度（推荐，mint 偏好保留）？
3. **Scope**：一次性全量（token→壳层→组件→9 页→playground），还是分两批（先 token+壳层+组件库+playground，后页面改造）？
4. **快捷键**：⌘⇧P 替换 ⌘⇧L（保留别名）确认？
5. **Status 底栏**：是否值得加（+28px 高度换信息密度）？
