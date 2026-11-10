/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import type { DB } from '../db/schema'
import { useDb } from '../db/store'
import { fail } from '../domain/docs'
import { stockOf } from '../domain/stock'
import { DocProgram, type DocConfig } from '../ui/DocProgram'
import { Check, Select } from '../ui/fields'
import { Icon } from '../ui/icons'
import { names, PK, type PickDef } from '../ui/Picker'
import type { ProgProps } from '../ui/session'
import { PROGRAMS } from './index'
import { ph, roText } from './common'

type R = any
type Coll = 'users' | 'perms' | 'items' | 'customers'

/** 基本資料共用：以 id（權限是 userId）為主鍵，新增時檢查重複，刪除前檢查有沒有被單據用到 */
function masterBase(coll: Coll, id: string, label: string, usedBy?: (db: DB, key: string) => boolean): Pick<DocConfig, 'records' | 'key' | 'save' | 'remove'> {
  return {
    records: db => db[coll] as R[],
    key: r => r[id],
    save: (d, r, isNew) => {
      const key = String(r[id] ?? '').trim()
      if (!key) fail(`請輸入${label}`)
      r[id] = key
      const arr = d[coll] as R[]
      const i = arr.findIndex(x => x[id] === key)
      if (isNew && i >= 0) fail(`${label} ${key} 已存在`)
      if (isNew) arr.push(r)
      else arr[i] = r
      return r
    },
    remove: (d, r) => {
      if (usedBy?.(d, r[id])) fail(`${label} ${r[id]} 已被單據使用，不可刪除`)
      const arr = d[coll] as R[]
      arr.splice(arr.findIndex(x => x[id] === r[id]), 1)
    },
  }
}
const allDocs = (db: DB): R[] => [...db.quotes, ...db.orders, ...db.requisitions, ...db.purchases, ...db.receipts, ...db.sales]

// ---------- ADMI10 登入者代號建立作業 ----------
const userBase = masterBase('users', 'id', '登入者代號', (db, k) => allDocs(db).some(d => d.creator === k || d.confirmer === k))
const userCfg: DocConfig = {
  code: 'ADMI10',
  ...userBase,
  blank: () => ({ id: '', name: '', email: '', password: '', password2: '', locked: false, expiry: '', companies: '學生區' }),
  header: [
    [{ k: 'id', label: '登入者代號', pk: true, w: 120 }, { k: 'name', label: '登入者名稱', req: true, w: 200 }],
    [{ k: 'password', label: '密碼', t: 'pw', w: 200 }, { k: 'password2', label: '確認密碼', t: 'pw', w: 200 }],
  ],
  tabs: [
    { label: '基本資料', rows: [
      [{ k: 'email', label: '電子郵件', w: 300 }, { k: 'locked', label: '鎖定', t: 'check' }],
      [{ k: 'expiry', label: '有效日期', t: 'date' }, { k: 'companies', label: '可登入公司', w: 200 }],
    ] },
    ph('進階設定'),
  ],
  save: (d, r, isNew, user) => {
    if (!r.name.trim()) fail('請輸入登入者名稱')
    if ((r.password2 ?? r.password) !== r.password) fail('兩次輸入的密碼不一致')
    const { password2: _, ...u } = r
    return userBase.save!(d, u, isNew, user)
  },
  browse: [['登入者代號', r => r.id], ['登入者名稱', r => r.name], ['鎖定', r => (r.locked ? 'Y' : 'N')], ['有效日期', r => r.expiry], ['可登入公司', r => r.companies]],
  query: [['登入者代號', r => r.id], ['登入者名稱', r => r.name]],
}

// ---------- ADMI05 使用者權限建立作業 ----------
const progPick: PickDef = {
  icon: 'tree', title: '開窗查詢 - 程式',
  cols: [['程式代號', r => r.code], ['程式名稱', r => r.name]],
  rows: () => PROGRAMS.filter(p => p.code !== 'QUEUE'),
  val: r => r.code,
}
const ACTS: [string, string][] = [['add', '新增'], ['query', '查詢'], ['edit', '修改'], ['del', '刪除'], ['confirm', '確認'], ['unconfirm', '取消確認'], ['void', '作廢'], ['output', '輸出']]
const VIS: [string, string][] = [['general', '一般'], ['readonly', '唯讀'], ['hidden', '隱藏']]
const fullLine = (program = '') => ({ program, run: true, ...Object.fromEntries(ACTS.map(([k]) => [k, true])), cost: 'general', price: 'general' })

function PermSide({ rec, line, editable, setLine }: { rec: R; line: number; editable: boolean; setLine: (p: R) => void }) {
  const l = rec.lines[line]
  if (!l) return <div className="perm-side dim">在左邊選一列程式，<br />這裡設定可以使用的功能。</div>
  const all = (v: boolean) => setLine({ run: v, ...Object.fromEntries(ACTS.map(([k]) => [k, v])) })
  return (
    <div className="perm-side">
      <div className="perm-title">{l.program} {PROGRAMS.find(p => p.code === l.program)?.name}</div>
      <Check label="執行" value={l.run} ro={!editable} onChange={v => setLine({ run: v })} />
      <div className="perm-grid">{ACTS.map(([k, n]) => <Check key={k} label={n} value={l[k]} ro={!editable} onChange={v => setLine({ [k]: v })} />)}</div>
      <div className="perm-vis"><span>成本</span><Select value={l.cost} ro={!editable} opts={VIS} w={90} onChange={v => setLine({ cost: v })} /></div>
      <div className="perm-vis"><span>單價</span><Select value={l.price} ro={!editable} opts={VIS} w={90} onChange={v => setLine({ price: v })} /></div>
      {editable && <div className="perm-btns"><button onClick={() => all(true)}>全選</button><button onClick={() => all(false)}>全不選</button></div>}
    </div>
  )
}
const permBase = masterBase('perms', 'userId', '使用者代號')
const permCfg: DocConfig = {
  code: 'ADMI05',
  ...permBase,
  blank: () => ({ userId: '', group: '', dept: '', remark: '', superuser: false, lines: [] }),
  header: [
    [{ k: 'userId', label: '使用者代號', pk: true, w: 120, pick: PK.user, name: (db, r) => names.user(db, r.userId) }, { k: 'superuser', label: '超級使用者', t: 'check' }],
    [{ k: 'group', label: '群組代號', w: 120 }, { k: 'dept', label: '部門代號', w: 120 }],
    [{ k: 'remark', label: '備註', w: 300, span: 2 }],
  ],
  lines: {
    cols: [{ k: 'program', label: '程式代號', w: 100, req: true, pick: progPick },
      { k: '_name', label: '程式名稱', w: 220, ro: true, show: l => PROGRAMS.find(p => p.code === l.program)?.name ?? '' },
      { k: 'run', label: '執行', w: 50, t: 'check' },
      { k: '_acts', label: '可用功能', w: 260, ro: true, show: l => (l.program ? ACTS.filter(([k]) => l[k]).map(([, n]) => n).join('、') : '') }],
    blank: () => fullLine(),
    height: 300,
  },
  side: p => <PermSide {...p} />,
  save: (d, r, isNew, user) => {
    if (!d.users.some(u => u.id === r.userId)) fail(`登入者代號 ${r.userId} 不存在，請先到「登入者代號建立作業」建立`)
    const seen = new Set<string>()
    r.lines = r.lines.filter((l: R) => l.program)
    r.lines.forEach((l: R) => {
      if (!PROGRAMS.some(p => p.code === l.program)) fail(`程式代號 ${l.program} 不存在`)
      if (seen.has(l.program)) fail(`程式代號 ${l.program} 重複`)
      seen.add(l.program)
    })
    return permBase.save!(d, r, isNew, user)
  },
  browse: [['使用者代號', r => r.userId], ['使用者名稱', (r, db) => names.user(db, r.userId)], ['超級使用者', r => (r.superuser ? 'Y' : 'N')], ['程式數', r => r.lines.length]],
  query: [['使用者代號', r => r.userId]],
}

// ---------- INVI02 品號資料建立作業 ----------
const itemCfg: DocConfig = {
  code: 'INVI02',
  ...masterBase('items', 'id', '品號', (db, k) => allDocs(db).some(d => d.lines.some((l: R) => l.item === k))),
  blank: () => ({ id: '', name: '', spec: '', unit: '', mainWarehouse: '', mainSupplier: '', leadDays: 0, price: 0, cost: 0, remark: '' }),
  header: [
    [{ k: 'id', label: '品號', pk: true, w: 160 }, { k: 'name', label: '品名', req: true, w: 260 }],
    [{ k: 'spec', label: '規格', w: 260 }, { k: 'unit', label: '庫存單位', req: true, w: 70 }],
  ],
  tabs: [
    { label: '基本資料', rows: [
      [{ k: 'mainWarehouse', label: '主要庫別', req: true, pick: PK.warehouse, w: 80, name: (db, r) => names.warehouse(db, r.mainWarehouse) }, { k: '_stock', label: '庫存數量', t: 'ro', w: 100, show: (r, db) => (r.id ? stockOf(db, r.id) : '') }],
      [{ k: 'remark', label: '備註', w: 300 }, null],
    ] },
    { label: '採購/生管', rows: [
      [{ k: 'mainSupplier', label: '主供應商', pick: PK.supplier, w: 100, name: (db, r) => names.supplier(db, r.mainSupplier) }, { k: 'leadDays', label: '固定前置天數', t: 'num', w: 80 }],
      [{ k: 'cost', label: '標準進價', t: 'num', w: 120, mask: 'cost' }, null],
    ] },
    { label: '業務', rows: [[{ k: 'price', label: '標準售價', t: 'num', w: 120, mask: 'price' }]] },
    ph('品管'), ph('其他'),
  ],
  save: (d, r, isNew, user) => {
    if (!r.name.trim()) fail('請輸入品名')
    if (!r.unit.trim()) fail('請輸入庫存單位')
    if (!d.warehouses.some(w => w.id === r.mainWarehouse)) fail('請輸入正確的主要庫別')
    if (r.mainSupplier && !d.suppliers.some(s => s.id === r.mainSupplier)) fail('主供應商不存在')
    return masterBase('items', 'id', '品號').save!(d, r, isNew, user)
  },
  browse: [['品號', r => r.id], ['品名', r => r.name], ['規格', r => r.spec], ['單位', r => r.unit], ['主要庫別', r => r.mainWarehouse], ['主供應商', r => r.mainSupplier], ['庫存數量', (r, db) => stockOf(db, r.id)]],
  query: [['品號', r => r.id], ['品名', r => r.name]],
}

// ---------- COPI01 客戶資料建立作業 ----------
const custCfg: DocConfig = {
  code: 'COPI01',
  ...masterBase('customers', 'id', '客戶代號', (db, k) => [...db.quotes, ...db.orders, ...db.sales].some(d => d.customer === k)),
  blank: () => ({ id: '', short: '', name: '', enName: '', owner: '', contact: '', tel: '', fax: '', email: '', taxId: '', currency: 'NTD', taxCode: 'S02', payTerm: '', sales: '', dept: '', creditLimit: 0, address: '' }),
  header: [
    [{ k: 'id', label: '客戶代號', pk: true, w: 120 }, { k: 'short', label: '客戶簡稱', req: true, w: 160 }],
    [{ k: 'name', label: '客戶全名', w: 300 }, { k: 'enName', label: '英文全名', w: 260 }],
  ],
  tabs: [
    { label: '基本資料', rows: [
      [{ k: 'owner', label: '負責人', w: 120 }, { k: 'taxId', label: '統一編號', w: 120 }],
      [{ k: 'contact', label: '聯絡人', w: 120 }, { k: 'email', label: 'E-Mail', w: 240 }],
      [{ k: 'tel', label: 'TEL(一)', w: 160 }, { k: 'fax', label: 'FAX', w: 160 }],
      [{ k: 'address', label: '送貨地址', w: 420, span: 2 }],
    ] },
    { label: '交易資料', rows: [
      [{ k: 'currency', label: '交易幣別', req: true, pick: PK.currency, w: 80, name: (db, r) => names.currency(db, r.currency) }, { k: 'taxCode', label: '稅別碼', req: true, pick: PK.tax, w: 70, name: (db, r) => names.tax(db, r.taxCode) }],
      [{ k: 'sales', label: '業務人員', pick: PK.employee, w: 110, name: (db, r) => names.employee(db, r.sales) }, { k: 'dept', label: '部門代號', w: 120 }],
      [{ k: 'payTerm', label: '付款條件', w: 160 }, { k: 'creditLimit', label: '信用額度', t: 'num', w: 140 }],
      [roText('說明', '信用額度為 0 表示不控管', 220), null],
    ] },
    ph('帳款資料'), ph('其他資料'),
  ],
  save: (d, r, isNew, user) => {
    if (!r.short.trim()) fail('請輸入客戶簡稱')
    if (!d.currencies.some(c => c.id === r.currency)) fail('請輸入正確的交易幣別')
    if (!d.taxCodes.some(t => t.id === r.taxCode)) fail('請輸入正確的稅別碼')
    return masterBase('customers', 'id', '客戶代號').save!(d, r, isNew, user)
  },
  browse: [['客戶代號', r => r.id], ['客戶簡稱', r => r.short], ['電話', r => r.tel], ['聯絡人', r => r.contact], ['統一編號', r => r.taxId], ['業務人員', (r, db) => names.employee(db, r.sales)]],
  query: [['客戶代號', r => r.id], ['客戶簡稱', r => r.short]],
}

export const ADMI10 = ({ close }: ProgProps) => <DocProgram cfg={userCfg} close={close} />
export const ADMI05 = ({ close }: ProgProps) => <DocProgram cfg={permCfg} close={close} />
export const INVI02 = ({ close }: ProgProps) => <DocProgram cfg={itemCfg} close={close} />
export const COPI01 = ({ close }: ProgProps) => <DocProgram cfg={custCfg} close={close} />

// ---------- 庫存狀況查詢（程式代號推測，標題不顯示）----------
export function StockQuery({ close }: ProgProps) {
  const db = useDb()
  const [q, setQ] = useState('')
  const [zero, setZero] = useState(false)
  const rows = db.items.flatMap(it => db.warehouses.map(w => ({ it, w, n: stockOf(db, it.id, w.id) })))
    .filter(r => (zero || r.n !== 0) && (!q || r.it.id.includes(q) || r.it.name.includes(q)))
  return (
    <div className="prog">
      <div className="menubar"><div className="menu"><button onClick={close}>離開(X)</button></div></div>
      <div className="toolbar query-tools">
        <Icon n="query" size={20} /><span>品號/品名</span>
        <input className="fld" value={q} onChange={e => setQ(e.target.value)} style={{ width: 200 }} autoFocus />
        <Check label="顯示零庫存" value={zero} onChange={setZero} />
      </div>
      <div className="prog-body">
        <div className="browse-list">
          <table className="grid">
            <thead><tr><th className="rh" /><th>品號</th><th>品名</th><th>規格</th><th>庫別</th><th>庫別名稱</th><th>庫存數量</th><th>單位</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.it.id + r.w.id} className={i % 2 ? 'alt' : ''}>
                  <td className="rh" /><td>{r.it.id}</td><td>{r.it.name}</td><td>{r.it.spec}</td><td>{r.w.id}</td><td>{r.w.name}</td><td className="num">{r.n}</td><td>{r.it.unit}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="rh" /><td colSpan={7} className="dim">目前沒有庫存。勾選「顯示零庫存」可看全部品號。</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="prog-status"><span className="cell mode">查詢</span><span className="cell">資料筆數: {rows.length}</span><span className="cell grow" /></div>
    </div>
  )
}
