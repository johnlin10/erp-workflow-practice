import { useSyncExternalStore } from 'react'
import { Icon } from './icons'

// Windows 樣式的訊息框。msgbox() 回傳 Promise，按「是／確定」為 true。
type Box = { id: number; text: string; title: string; icon: string; yesNo: boolean; resolve: (v: boolean) => void }
let boxes: Box[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

export function msgbox(text: string, opts: { title?: string; icon?: 'info' | 'warn' | 'error' | 'question'; yesNo?: boolean } = {}) {
  return new Promise<boolean>(resolve => {
    boxes = [...boxes, { id: ++seq, text, title: opts.title ?? 'ERP 流程練習室', icon: opts.icon ?? (opts.yesNo ? 'question' : 'info'), yesNo: !!opts.yesNo, resolve }]
    emit()
  })
}
export const ask = (text: string) => msgbox(text, { yesNo: true })
export const err = (e: unknown) => msgbox(e instanceof Error ? e.message : String(e), { icon: 'warn' })

export function MessageHost() {
  const list = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => boxes)
  const close = (b: Box, v: boolean) => { boxes = boxes.filter(x => x !== b); emit(); b.resolve(v) }
  return (
    <>
      {list.map(b => (
        <div key={b.id} className="modal-mask" onKeyDown={e => { if (e.key === 'Escape') close(b, false) }}>
          <div className="msgbox" role="alertdialog" aria-label={b.title}>
            <div className="msgbox-title">{b.title}</div>
            <div className="msgbox-body">
              <Icon n={b.icon} size={34} />
              <div className="msgbox-text">{b.text}</div>
            </div>
            <div className="msgbox-buttons">
              {b.yesNo ? (
                <>
                  <button autoFocus onClick={() => close(b, true)}>是(<u>Y</u>)</button>
                  <button onClick={() => close(b, false)}>否(<u>N</u>)</button>
                </>
              ) : (
                <button autoFocus onClick={() => close(b, true)}>確定</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
