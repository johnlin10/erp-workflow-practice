import { useRef, type ReactNode } from 'react'
import { Icon } from './icons'

export type WinState = { id: number; code: string; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean }

type Props = {
  win: WinState; title: string; active: boolean; children: ReactNode
  onFocus: () => void; onClose: () => void; onChange: (patch: Partial<WinState>) => void
}

/** 作業視窗：可拖曳、縮放、最小化、最大化，可同時開好幾個。 */
export function Window({ win, title, active, children, onFocus, onClose, onChange }: Props) {
  const drag = useRef<{ mx: number; my: number; x: number; y: number; w: number; h: number; mode: 'move' | 'size' } | null>(null)

  const start = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    if (win.max || e.button !== 0) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { mx: e.clientX, my: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h, mode }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.mx, dy = e.clientY - d.my
    const area = (e.currentTarget as HTMLElement).closest('.winlayer') as HTMLElement
    // 可以自由拖出畫面、往上蓋過頂部欄；只保留標題列在瀏覽器範圍內，才拖得回來
    if (d.mode === 'move') onChange({ x: Math.min(Math.max(d.x + dx, 80 - d.w), area.clientWidth - 80), y: Math.min(Math.max(-area.getBoundingClientRect().top, d.y + dy), area.clientHeight - 30) })
    else onChange({ w: Math.max(420, d.w + dx), h: Math.max(260, d.h + dy) })
  }
  const end = () => { drag.current = null }

  if (win.min) return null
  const style = win.max
    ? { left: 0, top: 0, width: '100%', height: '100%', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <div className={`win ${active ? 'active' : ''}`} style={style} onPointerDownCapture={onFocus} role="dialog" aria-label={title}>
      <div className="win-title" onPointerDown={start('move')} onPointerMove={move} onPointerUp={end}
        onDoubleClick={() => onChange({ max: !win.max })}>
        <Icon n="app" size={18} />
        <span className="win-title-text">{title}</span>
        <button className="win-btn" title="最小化" onPointerDown={e => e.stopPropagation()} onClick={() => onChange({ min: true })}>─</button>
        <button className="win-btn" title={win.max ? '還原' : '最大化'} onPointerDown={e => e.stopPropagation()} onClick={() => onChange({ max: !win.max })}>{win.max ? '❐' : '☐'}</button>
        <button className="win-btn close" title="關閉" onPointerDown={e => e.stopPropagation()} onClick={onClose}>✕</button>
      </div>
      <div className="win-body">{children}</div>
      {!win.max && <div className="win-grip" onPointerDown={start('size')} onPointerMove={move} onPointerUp={end} />}
    </div>
  )
}
