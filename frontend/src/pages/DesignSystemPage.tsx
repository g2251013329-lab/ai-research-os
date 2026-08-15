import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  BookOpen,
  CheckCircle2,
  FileText,
  FlaskConical,
  Inbox,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import Button from '../components/ui/Button'
import Tag from '../components/ui/Tag'
import StatusBadge from '../components/ui/StatusBadge'
import Progress from '../components/ui/Progress'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import Section from '../components/ui/Section'
import Kbd from '../components/ui/Kbd'

const THEMES = ['laboratory', 'graphite', 'paper', 'botanical', 'midnight']

const SEMANTIC_SWATCHES = [
  { name: 'background', var: '--background' },
  { name: 'foreground', var: '--foreground' },
  { name: 'surface', var: '--surface' },
  { name: 'surface-elevated', var: '--surface-elevated' },
  { name: 'border', var: '--border' },
  { name: 'primary', var: '--primary' },
  { name: 'accent', var: '--accent' },
  { name: 'success', var: '--success' },
  { name: 'warning', var: '--warning' },
  { name: 'danger', var: '--danger' },
  { name: 'info', var: '--info' },
  { name: 'learning', var: '--domain-learning' },
  { name: 'research', var: '--domain-research' },
  { name: 'leisure', var: '--domain-leisure' },
  { name: 'literature', var: '--obj-literature' },
  { name: 'experiment', var: '--obj-experiment' },
  { name: 'question', var: '--obj-question' },
  { name: 'hypothesis', var: '--obj-hypothesis' },
  { name: 'result', var: '--obj-result' },
]

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-display text-[13px] font-semibold text-foreground/70">{title}</h3>
      {children}
    </div>
  )
}

export default function DesignSystemPage() {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h1 font-semibold">{t('design.title')}</h1>
          <p className="mt-1 text-small text-foreground/50">{t('design.subtitle')}</p>
        </div>
        <div className="flex gap-1.5">
          {THEMES.map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => update({ ui_theme: th })}
              className={`rounded-lg border px-2.5 py-1 text-[12px] transition-colors ${
                settings?.ui_theme === th
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-foreground/60 hover:border-accent'
              }`}
            >
              {th}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Typography */}
        <Block title="Typography · 字体排印">
          <div className="space-y-3">
            <div className="font-display text-display font-semibold">Display 32px</div>
            <div className="font-display text-h1 font-semibold">H1 26px — 研究空间</div>
            <div className="font-display text-h2 font-semibold">H2 20px — 学习路线图</div>
            <div className="font-display text-h3 font-semibold">H3 15px — 实验记录</div>
            <div className="text-body">Body 14px — 正文排印，行高 1.6，中英文混排示例。</div>
            <div className="text-small text-foreground/70">Small 13px — 列表与次要正文</div>
            <div className="text-caption text-foreground/55">Caption 12px — 说明文字</div>
            <div className="font-mono text-code">Code 13px — JetBrains Mono · 路径与代码</div>
            <div className="font-mono text-data text-foreground/70">Data 13px — 09:30 · 42% · 128 min</div>
            <div className="font-serif text-body">Serif 14px — Source Serif · 阅读与笔记</div>
          </div>
        </Block>

        {/* Colors */}
        <Block title="Semantic Tokens · 语义色">
          <div className="grid grid-cols-3 gap-2">
            {SEMANTIC_SWATCHES.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="h-6 w-6 shrink-0 rounded-md border border-border"
                  style={{ background: `var(${s.var})` }}
                />
                <span className="truncate font-mono text-[10px] text-foreground/60">{s.name}</span>
              </div>
            ))}
          </div>
        </Block>

        {/* Buttons */}
        <Block title="Buttons · 按钮">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="icon" variant="secondary">
              <Search size={14} />
            </Button>
            <Button variant="accent" disabled>
              Disabled
            </Button>
            <Button variant="accent">
              <Loader2 size={13} className="animate-spin" /> Loading
            </Button>
          </div>
        </Block>

        {/* Tags & badges */}
        <Block title="Tags · Badges · Status">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone="literature">文献</Tag>
            <Tag tone="experiment">实验</Tag>
            <Tag tone="question">问题</Tag>
            <Tag tone="hypothesis">假设</Tag>
            <Tag tone="result">结果</Tag>
            <Tag tone="learning">学习</Tag>
            <Tag tone="research">研究</Tag>
            <Tag tone="leisure">休闲</Tag>
            <Tag tone="success">已完成</Tag>
            <Tag tone="warning">进行中</Tag>
            <Tag tone="danger">已拒绝</Tag>
            <Tag tone="info">信息</Tag>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <StatusBadge tone="success">Experiment completed</StatusBadge>
            <StatusBadge tone="warning">Hypothesis testing</StatusBadge>
            <StatusBadge tone="danger">Hypothesis rejected</StatusBadge>
            <StatusBadge tone="research" icon={<BookOpen size={11} />}>
              Paper · 2026
            </StatusBadge>
          </div>
        </Block>

        {/* Progress */}
        <Block title="Progress · 进度">
          <div className="space-y-3">
            <Progress value={72} />
            <Progress value={38} tone="success" />
            <Progress value={15} tone="warning" />
            <Progress value={100} tone="info" />
            <div className="flex gap-1.5">
              <Tag tone="success">72%</Tag>
              <span className="text-caption text-foreground/50">Concept mastery</span>
            </div>
          </div>
        </Block>

        {/* Inputs */}
        <Block title="Inputs · 输入">
          <div className="space-y-2">
            <input
              placeholder="普通输入框"
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none transition-colors focus:border-accent"
            />
            <input
              placeholder="Focus 状态（点击可见焦点环）"
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none transition-colors focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <Kbd>⌘K</Kbd>
              <Kbd>⌘⇧P</Kbd>
              <Kbd>Esc</Kbd>
              <span className="text-caption text-foreground/50">Kbd 组件</span>
            </div>
          </div>
        </Block>

        {/* Modal */}
        <Block title="Modal · 弹窗">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            打开示例弹窗
          </Button>
        </Block>

        {/* States */}
        <Block title="States · 状态">
          <EmptyState
            icon={<Inbox size={18} />}
            title="收件箱是空的"
            description="记录想法、论文、链接，稍后统一整理。"
            action={<Button size="sm">新建条目</Button>}
          />
          <div className="mt-2 flex flex-col gap-1.5 border-t border-border-subtle pt-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-[12px] text-danger">
            <div className="flex items-center gap-1.5 font-medium">
              <TriangleAlert size={13} /> 无法同步 Zotero
            </div>
            <p className="mt-1 text-danger/80">本地数据是安全的。[重试]</p>
          </div>
        </Block>

        {/* Section & misc */}
        <Block title="Section · Timeline · AI">
          <Section
            title="最近活动"
            icon={<Bell size={13} className="text-accent" />}
            right={<Tag tone="accent">12</Tag>}
          >
            <div className="divide-y divide-border-subtle">
              {[
                { icon: FileText, text: '文献发现导入：Synthetic protein…', tag: '文献' },
                { icon: FlaskConical, text: '实验记录：FRAP 定量分析', tag: '实验' },
                { icon: CheckCircle2, text: '任务完成：阅读 review', tag: '完成' },
              ].map((e) => (
                <div key={e.text} className="flex items-center gap-2 px-4 py-2 text-[12.5px]">
                  <e.icon size={13} className="shrink-0 text-foreground/40" />
                  <span className="min-w-0 flex-1 truncate">{e.text}</span>
                  <Tag tone="neutral">{e.tag}</Tag>
                </div>
              ))}
            </div>
          </Section>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent/25 bg-accent-soft p-3 text-[12.5px] text-accent">
            <Sparkles size={13} />
            上下文 AI：这篇论文与「异常凝聚体」项目的关系是？
            <Button size="sm" variant="secondary" className="ml-auto">
              分析证据
            </Button>
          </div>
        </Block>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="示例弹窗"
        icon={<Lightbulb size={14} className="text-accent" />}
      >
        <p className="text-[13px] leading-relaxed text-foreground/70">
          语义 token 驱动的统一弹窗：圆角 16、shadow-floating、Esc/点击遮罩关闭、焦点环可见。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button onClick={() => setModalOpen(false)}>确认</Button>
        </div>
      </Modal>
    </div>
  )
}
