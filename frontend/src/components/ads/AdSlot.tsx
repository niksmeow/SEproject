import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

type AdFormat = 'auto' | 'rectangle' | 'horizontal' | 'vertical'

interface AdSlotProps {
  /** Your AdSense client id, e.g. ca-pub-XXXXXXXXXXXXXXXX */
  client: string
  /** Your ad unit slot id from AdSense UI */
  slot: string
  /** Responsive by default */
  responsive?: boolean
  /** Optional: ad format */
  format?: AdFormat
  /** Optional: full width responsive */
  fullWidthResponsive?: boolean
  /** Optional: extra className */
  className?: string
  /** Optional: min height wrapper for layout stability */
  minHeightPx?: number
}

function loadAdSenseScriptOnce(client: string) {
  if (!client) return
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-adsense="true"]'
  )
  if (existing) return

  const script = document.createElement('script')
  script.async = true
  script.setAttribute('data-adsense', 'true')
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    client
  )}`
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
}

export default function AdSlot({
  client,
  slot,
  responsive: _responsive = true,
  format = 'auto',
  fullWidthResponsive = true,
  className,
  minHeightPx = 250,
}: AdSlotProps) {
  const insRef = useRef<HTMLModElement | null>(null)
  const location = useLocation()

  useEffect(() => {
    if (!client || !slot) return
    loadAdSenseScriptOnce(client)
  }, [client, slot])

  useEffect(() => {
    // SPA caveat: ads need to be pushed after navigation for slots to render
    if (!client || !slot) return

    // If script hasn't loaded yet, this will no-op; it will work on next render
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // Ad blockers / script timing can cause this; ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, client, slot])

  if (!client || !slot) {
    // Dev-friendly placeholder if env vars not set
    return (
      <div
        className={className}
        style={{ minHeight: minHeightPx }}
      >
        <div className="h-full rounded border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
          AdSlot not configured
        </div>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ minHeight: minHeightPx }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
        data-adtest={import.meta.env.DEV ? 'on' : undefined}
      />
    </div>
  )
}

