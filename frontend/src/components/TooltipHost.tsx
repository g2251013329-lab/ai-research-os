import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Tip {
  text: string
  x: number
  y: number
  below: boolean
}

/**
 * Global hover tooltip: listens for mouseover on any [data-tip] element and
 * renders a styled bubble (portal, fixed position) — instant, reliable,
 * unlike the native `title` attribute which Safari often fails to show.
 */
export default function TooltipHost() {
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: Element | null = null

    const show = (el: Element) => {
      const text = el.getAttribute('data-tip')
      if (!text) return
      const rect = el.getBoundingClientRect()
      current = el
      setTip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
        below: rect.top < 90,
      })
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null
      const el = target?.closest?.('[data-tip]') ?? null
      if (!el) {
        current = null
        setTip(null)
        return
      }
      if (el === current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => show(el), 300)
    }

    const onOut = (e: MouseEvent) => {
      const target = e.target as Element | null
      const to = e.relatedTarget as Element | null
      if (target?.closest?.('[data-tip]') && !to?.closest?.('[data-tip]')) {
        window.clearTimeout(timer)
        current = null
        setTip(null)
      }
    }

    const hide = () => {
      window.clearTimeout(timer)
      current = null
      setTip(null)
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('click', hide)
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('click', hide)
    }
  }, [])

  if (!tip) return null

  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] max-w-[420px] rounded-md bg-neutral-900 px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-lg dark:bg-surface-hover dark:text-neutral-900"
      style={{
        left: tip.x,
        top: tip.below ? tip.y + 10 : tip.y - 10,
        transform: tip.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
    >
      {tip.text}
    </div>,
    document.body,
  )
}
