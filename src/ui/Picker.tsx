import { useMemo, useState } from 'react'
import type { DB } from '../db/schema'
import { ITEM_CATS } from '../db/seed'
import { stockOf } from '../domain/stock'
import { Icon } from './icons'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any
export type PickDef = {
  title?: string
  cols: [string, (r: Row) => string | number][]
  rows: (db: DB, rec?: Row) => Row[]
  val: (r: Row) => string
  icon?: string
}

/** 開窗查詢：重查欄位 + 比較符號 + 值，雙擊或按確定帶回。 */
export function Picker({ def, db, rec, onPick, onClose }: { def: PickDef; db: DB; rec?: Row; onPick: (r: Row) => void; onClose: () => void }) {
  const all = useMemo(() => def.rows(db, rec), [def, db, rec])
  const [col, setCol] = useState(0)
  const [op, setOp] = useState('>=')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const rows = useMemo(() => {
    if (!q) return all
    const get = def.cols[col][1]
    return all.filter((r: Row) => {
      const v = String(get(r))
      return op === '>=' ? v >= q : op === '<=' ? v <= q : op === '=' ? v === q : v.includes(q)
    })
  }, [all, q, col, op, def])
  const pick = (r?: Row) => { if (r) { onPick(r); onClose() } }

  return (
    <div className="modal-mask" onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter') pick(rows[sel]) }}>
      <div className="dlg picker" role="dialog" aria-label="開窗查詢">
        <div className="dlg-title"><Icon n="app" size={18} /><span className="grow">開窗查詢</span><button className="win-btn close" onClick={onClose}>✕</button></div>
        <div className="picker-bar">
          <button onClick={() => setSel(0)} title="第一筆"><Icon n="first" size={18} /></button>
          <button onClick={() => setSel(s => Math.max(0, s - 1))} title="上一筆"><Icon n="prev" size={18} /></button>
          <button onClick={() => setSel(s => Math.min(rows.length - 1, s + 1))} title="下一筆"><Icon n="next" size={18} /></button>
          <button onClick={() => setSel(rows.length - 1)} title="最後一筆"><Icon n="last" size={18} /></button>
          <span>重查</span>
          <select value={col} onChange={e => setCol(Number(e.target.value))}>{def.cols.map(([l], i) => <option key={l} value={i}>{l}</option>)}</select>
          <select value={op} onChange={e => setOp(e.target.value)}>{['>=', '=', '<=', '包含'].map(o => <option key={o}>{o}</option>)}</select>
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSel(0) }} />
        </div>
        <div className="picker-table">
          <table className="grid">
            <thead><tr><th className="rh" />{def.cols.map(([l], i) => <th key={l} className={i === col ? 'pk' : ''}>{l}</th>)}</tr></thead>
            <tbody>
              {rows.map((r: Row, i: number) => (
                <tr key={def.val(r) + i} className={`${i % 2 ? 'alt' : ''} ${i === sel ? 'cur' : ''}`} onClick={() => setSel(i)} onDoubleClick={() => pick(r)}>
                  <td className="rh">{i === sel ? '▶' : ''}</td>
                  {def.cols.map(([l, f]) => <td key={l}>{f(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="picker-count"><span>資料筆數</span><b>{rows.length}</b><span>欄位數</span><b>{def.cols.length}</b></div>
        <div className="dlg-buttons">
          <button onClick={() => pick(rows[sel])} disabled={!rows.length}><Icon n="ok" size={18} />確定</button>
          <button onClick={onClose}><Icon n="cancel" size={18} />取消</button>
        </div>
      </div>
    </div>
  )
}

// ---------- 常用開窗 ----------
export const WH_KIND: Record<string, string> = { 1: '1:存貨倉', 2: '2:非存貨倉' }
const name = <T extends { id: string }>(arr: T[], id: string, f: (x: T) => string) => { const x = arr.find(a => a.id === id); return x ? f(x) : '' }

export const PK = {
  customer: { icon: 'customer', cols: [['客戶代號', r => r.id], ['簡稱', r => r.short], ['電話', r => r.tel], ['聯絡人', r => r.contact], ['統一編號', r => r.taxId], ['公司全名', r => r.name]], rows: db => db.customers, val: r => r.id } as PickDef,
  supplier: { icon: 'supplier', cols: [['廠商代號', r => r.id], ['簡稱', r => r.short], ['電話(一)', r => r.tel], ['聯絡人', r => r.contact], ['統一編號', r => r.taxId], ['公司全名', r => r.name]], rows: db => db.suppliers, val: r => r.id } as PickDef,
  item: { icon: 'pick', cols: [['品號', r => r.id], ['品名', r => r.name], ['規格', r => r.spec], ['單位', r => r.unit], ['主要庫別', r => r.mainWarehouse]], rows: db => db.items, val: r => r.id } as PickDef,
  employee: { icon: 'person', cols: [['人員代號', r => r.id], ['人員名稱', r => r.name], ['部門', r => r.dept]], rows: db => db.employees, val: r => r.id } as PickDef,
  plant: { icon: 'plant', cols: [['廠別代號', r => r.id], ['廠別名稱', r => r.name]], rows: db => db.plants, val: r => r.id } as PickDef,
  warehouse: { icon: 'plant', cols: [['庫別代號', r => r.id], ['庫別名稱', r => r.name], ['廠別代號', r => r.plant], ['庫存性質', r => WH_KIND[r.kind] ?? '']], rows: db => db.warehouses, val: r => r.id } as PickDef,
  itemCat: { icon: 'pick', cols: [['品號類別代號', r => r.id], ['品號類別名稱', r => r.name]], rows: () => ITEM_CATS.map(([id, name]) => ({ id, name })), val: r => r.id } as PickDef,
  currency: { icon: 'money', cols: [['幣別', r => r.id], ['幣別名稱', r => r.name], ['匯率', r => r.rate]], rows: db => db.currencies, val: r => r.id } as PickDef,
  /** 稅別碼：銷售系統用 S 開頭、採購系統用 P 開頭 */
  tax: (k: string) => ({ icon: 'pick', cols: [['稅別碼', r => r.id], ['名稱', r => r.name], ['課稅別', r => r.taxType], ['營業稅率', r => r.rate]], rows: db => db.taxCodes.filter(t => t.id.startsWith(k)), val: r => r.id }) as PickDef,
  user: { icon: 'person', cols: [['登入者代號', r => r.id], ['登入者名稱', r => r.name]], rows: db => db.users, val: r => r.id } as PickDef,
  docType: (kind: string): PickDef => ({ icon: 'tree', cols: [['單別', r => r.id], ['單據名稱', r => r.name]], rows: db => db.docTypes.filter(t => t.kind === kind), val: r => r.id }),
  itemStock: { icon: 'pick', cols: [['品號', r => r.id], ['品名', r => r.name], ['規格', r => r.spec], ['單位', r => r.unit]], rows: db => db.items, val: r => r.id } as PickDef,
} satisfies Record<string, PickDef | ((k: string) => PickDef)>

export const names = {
  customer: (db: DB, id: string) => name(db.customers, id, x => x.short),
  supplier: (db: DB, id: string) => name(db.suppliers, id, x => x.short),
  employee: (db: DB, id: string) => name(db.employees, id, x => x.name),
  plant: (db: DB, id: string) => name(db.plants, id, x => x.name),
  warehouse: (db: DB, id: string) => name(db.warehouses, id, x => x.name),
  itemCat: (id: string) => ITEM_CATS.find(([c]) => c === id)?.[1] ?? '',
  currency: (db: DB, id: string) => name(db.currencies, id, x => x.name),
  tax: (db: DB, id: string) => name(db.taxCodes, id, x => x.name),
  docType: (db: DB, id: string) => name(db.docTypes, id, x => x.name),
  user: (db: DB, id: string) => name(db.users, id, x => x.name),
  stock: (db: DB, item: string, wh?: string) => stockOf(db, item, wh),
}
