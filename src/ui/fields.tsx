import { useEffect, useRef, useState } from 'react'
import { isDate, today } from '../domain/docs'
import { Icon } from './icons'

type Base = { ro?: boolean; cls?: string; w?: number | string; title?: string; align?: 'left' | 'right' }
const css = (b: Base, extra = '') => `fld ${b.cls ?? ''} ${b.ro ? 'ro' : ''} ${extra}`

export function TextBox({ value, onChange, ...b }: Base & { value: string; onChange?: (v: string) => void }) {
  return <input className={css(b)} style={{ width: b.w, textAlign: b.align }} value={value ?? ''} readOnly={b.ro} title={b.title}
    onChange={e => onChange?.(e.target.value)} />
}

export function NumBox({ value, onChange, ...b }: Base & { value: number; onChange?: (v: number) => void }) {
  const [s, setS] = useState(String(value ?? 0))
  useEffect(() => { if (Number(s) !== value) setS(String(value ?? 0)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return <input className={css(b, 'num')} style={{ width: b.w }} value={s} readOnly={b.ro} inputMode="decimal"
    onChange={e => {
      const t = e.target.value
      if (!/^-?\d*\.?\d*$/.test(t)) return
      setS(t)
      onChange?.(t === '' || t === '-' || t === '.' ? 0 : Number(t))
    }} />
}

export function DateBox({ value, onChange, ...b }: Base & { value: string; onChange?: (v: string) => void }) {
  const hidden = useRef<HTMLInputElement>(null)
  const bad = !!value && !isDate(value)
  return (
    <span className="fld-wrap">
      <input className={css(b, `date ${bad ? 'bad' : ''}`)} style={{ width: b.w ?? 116 }} value={value || (b.ro ? '  /  /  ' : '')} readOnly={b.ro}
        placeholder="YYYY/MM/DD" title={bad ? '日期格式：YYYY/MM/DD' : undefined}
        onChange={e => onChange?.(e.target.value)}
        onBlur={e => { // 允許輸入 20261109 這種格式
          const t = e.target.value.trim()
          if (/^\d{8}$/.test(t)) onChange?.(`${t.slice(0, 4)}/${t.slice(4, 6)}/${t.slice(6)}`)
        }} />
      {b.ro ? <span className="cal-gap" /> : (
        <button type="button" className="fld-icon" title="選擇日期" onClick={() => {
          const h = hidden.current
          if (!h) return
          h.value = (isDate(value) ? value : today()).replace(/\//g, '-')
          try { h.showPicker() } catch { h.click() }
        }}>
          <Icon n="cal" size={18} />
        </button>
      )}
      <input ref={hidden} type="date" className="hidden-date" tabIndex={-1} aria-hidden
        onChange={e => e.target.value && onChange?.(e.target.value.replace(/-/g, '/'))} />
    </span>
  )
}

export function Check({ value, onChange, label, ro }: { value: boolean; onChange?: (v: boolean) => void; label: string; ro?: boolean }) {
  return (
    <label className={`chk ${ro ? 'ro' : ''}`}>
      <input type="checkbox" checked={!!value} disabled={ro} onChange={e => onChange?.(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Select({ value, onChange, opts, ro, w }: { value: string; onChange?: (v: string) => void; opts: [string, string][]; ro?: boolean; w?: number }) {
  return (
    <select className={`fld ${ro ? 'ro' : ''}`} style={{ width: w }} value={value} disabled={ro} onChange={e => onChange?.(e.target.value)}>
      <option value="" />
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
