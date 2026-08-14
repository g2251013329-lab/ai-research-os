import { useSettingsStore } from '../store/useSettingsStore'
import { SUBTITLE_COLORS, SUBTITLE_FONTS } from '../theme/subtitle'

/**
 * Brand mark: a liquid droplet (LLPS) with an orbiting electron ring.
 * The gradient is theme-aware via CSS variables.
 */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="airos-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      {/* droplet */}
      <path
        d="M16 2.5 C 16 2.5 5.5 12.5 5.5 20 A 10.5 10.5 0 0 0 26.5 20 C 26.5 12.5 16 2.5 16 2.5 Z"
        fill="url(#airos-logo-g)"
      />
      {/* orbit ring */}
      <ellipse
        cx="16"
        cy="20"
        rx="14.5"
        ry="5.6"
        transform="rotate(-16 16 20)"
        stroke="url(#airos-logo-g)"
        strokeOpacity="0.65"
        strokeWidth="1.4"
      />
      {/* nucleus */}
      <circle cx="16" cy="20" r="2.3" fill="#fff" />
    </svg>
  )
}

/** Sidebar brand: droplet mark + artistic gradient wordmark + art subtitle. */
export default function BrandMark() {
  const settings = useSettingsStore((s) => s.settings)

  const subtitle = settings?.brand_subtitle?.trim() || 'LLPS'
  const font =
    SUBTITLE_FONTS.find((f) => f.id === settings?.brand_subtitle_font) ??
    SUBTITLE_FONTS[0]
  const color =
    SUBTITLE_COLORS.find((c) => c.id === settings?.brand_subtitle_color) ??
    SUBTITLE_COLORS[0]

  const isAccent = color.value === null

  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={26} />
      <div className="min-w-0">
        <div className="gradient-text truncate text-[13.5px] font-bold tracking-tight">
          AI Research OS
        </div>
        <div
          className={`truncate text-[13px] leading-tight ${isAccent ? 'gradient-text' : ''}`}
          style={{
            fontFamily: font.family,
            color: isAccent ? undefined : color.value ?? undefined,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  )
}
