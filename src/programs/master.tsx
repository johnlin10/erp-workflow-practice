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
import { ph, roText, X } from './common'

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
    [{ k: 'id', label: '登入者代號', pk: true, w: 240 }],
    [{ k: 'name', label: '登入者名稱', w: 360 }],
    [{ k: 'email', label: 'E-MAIL帳號', w: 470 }],
    [{ k: 'password', label: '密碼', t: 'pw', w: 500 }],
    [{ k: 'password2', label: '確認密碼', t: 'pw', w: 500 }],
    [{ k: 'locked', label: '帳號已鎖定', t: 'check' }],
    [{ k: 'expiry', label: '有效截止日期', t: 'date', w: 156 }],
    [{ k: 'companies', label: '可登入公司別', w: 430, pick: { icon: 'pick', title: '開窗查詢 - 公司別', cols: [['公司代號', r => r.id]], rows: db => [{ id: db.company }], val: r => r.id } }],
    [{ k: '_pwDate', label: '最近更新密碼日期', t: 'ro', w: 156, show: () => '' }],
    [{ k: '_showNotice', label: '顯示保密宣告字詞', t: 'check', ro: true }],
    [{ k: '_noticeDate', label: '最近關閉顯示保密字詞日期', t: 'ro', w: 156, show: () => '' }],
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
const fullLine = (program = '') => ({ program, run: true, ...Object.fromEntries(ACTS.map(([k]) => [k, true])), cost: 'general', price: 'general', more: {} })
const GRP: [string, string][] = [['query', '查詢'], ['edit', '修改'], ['del', '刪除'], ['confirm', '確認'], ['unconfirm', '取消確認'], ['void', '作廢']]
const ATT: [string, string][] = [['query', '查詢'], ['edit', '異動'], ['after', '確認後異動']]

function PermSide({ rec, line, editable, setLine }: { rec: R; line: number; editable: boolean; setLine: (p: R) => void }) {
  const l: R = rec.lines[line] ?? { more: {} }
  const on = editable && !!rec.lines[line]
  const more = (k: string, v: boolean) => setLine({ more: { ...l.more, [k]: v } })
  const vis = (k: 'cost' | 'price', t: string) => (
    <fieldset className="grp"><legend>{t}</legend>
      {VIS.map(([v, n]) => <label key={v} className="rad"><input type="radio" disabled={!on} checked={l[k] === v} onChange={() => setLine({ [k]: v })} />{n}</label>)}
    </fieldset>
  )
  const box = (prefix: string, title: string, list: [string, string][]) => (
    <fieldset className="grp"><legend>{title}</legend>
      {list.map(([k, n]) => <Check key={k} label={n} value={!!l.more?.[prefix + k]} ro={!on} onChange={v => more(prefix + k, v)} />)}
    </fieldset>
  )
  return (
    <div className="perm-side">
      <div className="perm-col">
        <fieldset className="grp"><legend>基本權限</legend>
          {ACTS.map(([k, n]) => <Check key={k} label={n} value={!!l[k]} ro={!on} onChange={v => setLine({ [k]: v })} />)}
          <Check label="轉出檔案" value={false} ro />
          {vis('cost', '成本')}{vis('price', '售價')}
        </fieldset>
      </div>
      <div className="perm-col">{box('g_', '群組權限', GRP)}{box('a_', '附件權限', ATT)}</div>
      <div className="perm-col">{box('o_', '他組權限', GRP)}</div>
    </div>
  )
}
const permBase = masterBase('perms', 'userId', '使用者代號')
const permCfg: DocConfig = {
  code: 'ADMI05',
  ...permBase,
  blank: () => ({ userId: '', group: '', dept: '', remark: '', superuser: false, lines: [] }),
  header: [
    [{ k: 'userId', label: '使用者代碼', pk: true, w: 150, pick: PK.user }, { k: 'group', label: '群組代碼', w: 130, req: true }],
    [{ k: '_uname', label: '使用者名稱', w: 330, t: 'ro', show: (r, db) => names.user(db, r.userId) }, { k: 'dept', label: '部門', w: 130 }],
    [{ k: 'superuser', label: '超級使用者', t: 'check' }, { k: 'remark', label: '備註', w: 440 }],
  ],
  lines: {
    cols: [{ k: 'program', label: '程式代號', w: 100, req: true, pick: progPick },
      { k: '_name', label: '程式名稱', w: 220, ro: true, show: l => PROGRAMS.find(p => p.code === l.program)?.name ?? '' },
      { k: 'run', label: '執行', w: 50, t: 'check' },
      { k: '_dc', label: '資料管制', w: 70, ro: true, show: () => '' },
      { k: '_design', label: '設計權限', w: 70, ro: true, show: () => '' }],
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
const itemBase = masterBase('items', 'id', '品號', (db, k) => allDocs(db).some(d => d.lines.some((l: R) => l.item === k)))
const stockLines = (db: DB, id: string) => db.warehouses.filter(w => stockOf(db, id, w.id) !== 0).map(w => ({
  warehouse: w.id, whName: w.name, whType: '1.存貨倉', plant: w.plant, plantName: names.plant(db, w.plant), qty: stockOf(db, id, w.id),
}))
const itemCfg: DocConfig = {
  code: 'INVI02',
  ...itemBase,
  records: db => db.items.map(it => ({ ...it, lines: stockLines(db, it.id) })),
  blank: () => ({ id: '', name: '', spec: '', unit: '', mainWarehouse: '', mainSupplier: '', leadDays: 0, price: 0, cost: 0, remark: '', acct: '' }),
  header: [
    [{ k: 'id', label: '品號', pk: true, w: 210, pick: PK.item }, roText('版次', '', 46), { k: 'unit', label: '單位', req: true, w: 52 }, { k: '_stock', label: '庫存數量', t: 'ro', w: 150, show: (r, db) => (r.id ? stockOf(db, r.id) : 0) }],
    [{ k: 'name', label: '品名', w: 236 }, null, roText('小單位', '', 52), { k: '_stockAmt', label: '庫存金額', t: 'ro', w: 150, show: (r, db) => (r.id ? stockOf(db, r.id) * r.cost : 0) }],
    [{ k: 'spec', label: '規格', w: 236 }, null, { k: '_fixed', label: '定重', t: 'check', ro: true }, { k: '_unitCost', label: '單位成本', t: 'ro', w: 150, show: r => r.cost ?? 0, mask: 'cost' }],
    [roText('貨號', '', 170), roText('SIZE', '', 52), roText('包裝單位', '', 52), roText('包裝數量', '0', 150)],
    [null, null, null, roText('新品號核准日期', '', 150)],
  ],
  tabs: [
    { label: '基本資料1', rows: [
      [{ k: '_editName', label: '修改品名規格', t: 'check', ro: true }, null],
      [{ k: 'acct', label: '會計', req: true, w: 80 }, roText('採購單位', '', 70)],
      [roText('資材', '', 80), roText('銷售單位', '', 70)],
      [roText('業務', '', 80), roText('文管代號', '', 130)],
      [roText('生管', '', 80), roText('稅則', '', 210)],
      [{ k: 'mainWarehouse', label: '主要庫別', pick: PK.warehouse, w: 80, name: (db, r) => names.warehouse(db, r.mainWarehouse) }, roText('保固估售價比率', '. %', 70)],
      [roText('主要領料庫別', '', 80), roText('保固期數(月數)', '', 60)],
      [roText('生產線別', '', 80), null],
      [roText('計劃人員', '', 80), roText('產品追溯系統串接碼', '', 340)],
      [{ k: '_einv', label: '電子發票須上傳產品追溯串接碼', t: 'check', ro: true }, null],
    ] },
    ph('基本資料2'), ph('基本資料3'),
    { label: '採購生管1', rows: [
      [{ k: 'mainSupplier', label: '主供應商', pick: PK.supplier, w: 100, name: (db, r) => names.supplier(db, r.mainSupplier) }],
      [{ k: 'leadDays', label: '固定前置天數', t: 'num', w: 80 }],
    ] },
    ph('採購生管2'),
    { label: '售價', rows: [[{ k: 'price', label: '標準售價', t: 'num', w: 120, mask: 'price' }]] },
    { label: '成本', rows: [[{ k: 'cost', label: '標準進價', t: 'num', w: 120, mask: 'cost' }]] },
    ph('品管'), ph('其他'),
  ],
  // 單身：各庫別的庫存（唯讀）
  lines: {
    cols: [{ k: 'warehouse', label: '庫別', w: 90, pk: true, ro: true }, { k: 'whName', label: '庫別名稱', w: 300, ro: true }, { k: 'whType', label: '庫性', w: 150, ro: true },
      { k: 'plant', label: '廠別代號', w: 80, ro: true }, { k: 'plantName', label: '廠別名稱', w: 260, ro: true }, { k: 'qty', label: '庫存數量', w: 100, t: 'num', ro: true }],
    editable: () => false,
    height: 120,
  },
  save: (d, r, isNew, user) => {
    if (!r.name.trim()) fail('請輸入品名')
    if (!r.unit.trim()) fail('請輸入單位')
    if (!r.acct.trim()) fail('請輸入會計類別')
    delete r.lines
    if (r.mainWarehouse && !d.warehouses.some(w => w.id === r.mainWarehouse)) fail('主要庫別不存在')
    if (r.mainSupplier && !d.suppliers.some(s => s.id === r.mainSupplier)) fail('主供應商不存在')
    return itemBase.save!(d, r, isNew, user)
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
    [{ k: 'id', label: '客戶代號', pk: true, w: 120, pick: { ...PK.customer, icon: 'customer' } }, { k: 'short', label: '客戶簡稱', w: 330 }, roText('版次', '', 70)],
    [{ k: 'name', label: '客戶全名', w: 470, span: 2 }, roText('客戶核准日', '  /  /  ', 130)],
    [{ k: 'enName', label: '客戶英文全名', w: 500, span: 2 }, null],
    [X('關係人代號', 270, { pick: PK.customer }), null, null],
  ],
  tabs: [
    { label: '基本資料', rows: [
      [{ k: 'owner', label: '負責人', w: 330 }, X('總店號', 130, { pick: { ...PK.customer, icon: 'customer' } })],
      [{ k: 'contact', label: '連絡人', w: 330 }, X('總公司請款', 0, { t: 'check' })],
      [{ k: 'tel', label: 'TEL_NO(一)', w: 220 }, X('發票號碼依總公司控管', 0, { t: 'check' })],
      [X('TEL_NO(二)', 220), X('合約訂單是否歸屬總公司', 0, { t: 'check' })],
      [{ k: 'fax', label: 'FAX NO', w: 220 }, roText('分店數', '0', 110)],
      [{ k: 'email', label: 'E-Mail', w: 350 }, { k: 'currency', label: '交易幣別', req: true, pick: PK.currency, w: 85, name: (db, r) => names.currency(db, r.currency) }],
      [{ k: 'taxId', label: '統一編號', w: 260 }, { k: 'dept', label: '部門別', w: 140 }],
      [X('資本額', 220, { t: 'num', suffix: '萬' }), null],
      [X('年營業額', 220, { t: 'num', suffix: '萬' }), { k: 'sales', label: '業務人員', pick: PK.employee, w: 140, name: (db, r) => names.employee(db, r.sales) }],
      [X('員工人數', 128, { t: 'num', suffix: '人' }), X('收款業務員', 140, { pick: PK.employee })],
      [null, X('開業日期', 120, { t: 'date' })],
      [null, X('歇業日期', 120, { t: 'date' })],
    ] },
    ph('基本資料(二)'),
    { label: '地址資料', rows: [[{ k: 'address', label: '送貨地址', w: 520 }]] },
    { label: '交易資料(一)', rows: [
      [{ k: 'taxCode', label: '稅別碼', req: true, pick: PK.tax, w: 70, name: (db, r) => names.tax(db, r.taxCode) }],
      [{ k: 'payTerm', label: '付款條件', w: 160 }],
    ] },
    ph('交易資料(二)'),
    { label: '信用額度', rows: [[{ k: 'creditLimit', label: '信用額度', t: 'num', w: 140, suffix: '（0 表示不控管）' }]] },
    ph('國外資料'), ph('資料瀏覽'),
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
