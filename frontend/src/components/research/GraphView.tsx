import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

interface GraphNode {
  id: string
  type: string
  label: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: { source: string; target: string; type: string }[]
}

const TYPE_COLORS: Record<string, string> = {
  project: '#3b82f6',
  question: '#8b5cf6',
  hypothesis: '#f59e0b',
  experiment: '#10b981',
  paper: '#ec4899',
  concept: '#14b8a6',
}

const TYPE_KEYS = ['project', 'question', 'hypothesis', 'experiment', 'paper', 'concept']

export default function GraphView({ onOpenProject }: { onOpenProject: (id: number) => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const onOpenRef = useRef(onOpenProject)
  onOpenRef.current = onOpenProject

  const { data } = useQuery({
    queryKey: ['graph'],
    queryFn: () => api<GraphData>('/api/graph'),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!data || !ref.current) return
    const el = ref.current
    let disposed = false

    void (async () => {
      const d3 = await import('d3')
      if (disposed || !el.isConnected) return
      if (el.querySelector('svg')) return // already rendered (idempotent)
      const width = el.clientWidth || 800
      const height = 560

      const svg = d3
        .select(el)
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)

      // zoomable layer: everything goes inside this <g>
      const zoomG = svg.append('g')

      const simulation = d3
        .forceSimulation(data.nodes as never)
        .force('link', d3.forceLink(data.edges as never).id((d: any) => d.id).distance(95))
        .force('charge', d3.forceManyBody().strength(-240))
        .force('center', d3.forceCenter(width / 2, height / 2))

      const link = zoomG
        .append('g')
        .selectAll('line')
        .data(data.edges)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.45)
        .attr('stroke-width', 1)

      const node = zoomG
        .append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .call(
          (d3
            .drag()
            .on('start', (event: any, d: any) => {
              if (!event.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x ?? event.x
              d.fy = d.y ?? event.y
            })
            .on('drag', (event: any, d: any) => {
              d.fx = event.x
              d.fy = event.y
            })
            .on('end', (event: any, d: any) => {
              if (!event.active) simulation.alphaTarget(0)
              d.fx = null
              d.fy = null
            }) as never) as any,
        )

      node
        .append('circle')
        .attr('r', 8)
        .attr('fill', (d: any) => TYPE_COLORS[d.type] ?? '#888')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.2)

      node
        .append('text')
        .text((d: any) => (d.label.length > 22 ? d.label.slice(0, 22) + '…' : d.label))
        .attr('x', 12)
        .attr('y', 4)
        .attr('font-size', 11)
        .attr('class', 'fill-neutral-500 dark:fill-neutral-300')

      node
        .on('click', (_event: unknown, d: any) => {
          if (d.type === 'project') {
            const id = Number(d.id.slice(1))
            if (Number.isFinite(id)) onOpenRef.current(id)
          }
        })
        .style('cursor', (d: any) => (d.type === 'project' ? 'pointer' : 'default'))
        .append('title')
        .text((d: any) => d.label)

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source?.x ?? 0)
          .attr('y1', (d: any) => d.source?.y ?? 0)
          .attr('x2', (d: any) => d.target?.x ?? 0)
          .attr('y2', (d: any) => d.target?.y ?? 0)
        node.attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })

      // ---- zoom & pan ----
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 6])
        .on('zoom', (event: any) => {
          zoomG.attr('transform', event.transform.toString())
        })
      svg.call(zoom)

      // zoom controls (+ / − / reset)
      const controls = document.createElement('div')
      controls.className =
        'absolute right-2 top-2 z-10 flex gap-1 rounded-md border border-neutral-200 bg-white/90 p-0.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/90'
      const mk = (label: string, fn: () => void) => {
        const b = document.createElement('button')
        b.textContent = label
        b.className =
          'h-6 w-6 rounded text-[12px] leading-none text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-accent dark:text-neutral-300 dark:hover:bg-neutral-800'
        b.addEventListener('click', fn)
        controls.appendChild(b)
      }
      mk('＋', () => {
        svg.transition().duration(180).call(zoom.scaleBy, 1.35)
      })
      mk('－', () => {
        svg.transition().duration(180).call(zoom.scaleBy, 1 / 1.35)
      })
      mk('⟳', () => {
        svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity)
      })
      el.appendChild(controls)
    })()

    return () => {
      disposed = true
    }
  }, [data])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {TYPE_KEYS.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: TYPE_COLORS[k] }}
            />
            {t(`graph.types.${k}`)}
          </span>
        ))}
        <span className="text-[11px] text-neutral-400">{t('graph.hint')}</span>
      </div>
      <div
        ref={ref}
        className="relative mt-2 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      />
    </div>
  )
}
