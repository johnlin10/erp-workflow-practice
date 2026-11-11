/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DB, DocKind } from '../db/schema'
import {
  addDays, confirmDoc, deleteDoc, isDate, KIND_NAME, keyOf, list, peekNo, round, saveDoc, totals, unconfirmDoc, voidDoc,
} from '../domain/docs'
import type { ColDef, DocConfig, FieldDef, Rows } from '../ui/DocProgram'
import { names, PK } from '../ui/Picker'

type R = any

export const pad4 = (n: number) => String(n ?? 0).padStart(4, '0')
export const roText = (label: string, text: string, w = 140, more?: FieldDef[]): FieldDef => ({ k: '_' + label, label, t: 'ro', show: () => text, w, with: more })
/** 練習用不到、但畫面上有的欄位：可以輸入，不會檢查 */
export const X = (label: string, w = 140, more: Partial<FieldDef> = {}): FieldDef => ({ k: '_' + label, label, w, ...more })
export const PLACEHOLDER: Rows = [[{ k: '_ph', label: '', t: 'ro', show: () => '（練習版未使用此頁籤）', w: 320 }]]
export const ph = (label: string) => ({ label, rows: PLACEHOLDER })

export const TAX_TYPES: [string, string][] = [['1', '1.應稅內含'], ['2', '2.應稅外加'], ['3', '3.零稅率'], ['4', '4.免稅'], ['9', '9.不計稅']]
export const STATUS_TEXT = (s: string) => ({ N: 'N:未確認', Y: 'Y:已確認', V: 'V:作廢' } as Record<string, string>)[s] ?? ''

// ---------- 常用欄位 ----------
export const F = {
  docType: (kind: DocKind, label: string): FieldDef => ({ k: 'type', label, pk: true, pick: PK.docType(kind), w: 90, ro: (_r, m) => m !== 'add', name: (db, r) => names.docType(db, r.type) }),
  docNo: (label: string): FieldDef => ({ k: 'no', label, pk: true, t: 'ro', w: 150 }),
  date: { k: 'date', label: '單據日期', t: 'date', req: true } as FieldDef,
  customer: { k: 'customer', label: '客戶代號', req: true, pick: PK.customer, w: 110, name: (db, r) => names.customer(db, r.customer) } as FieldDef,
  supplier: { k: 'supplier', label: '供應廠商', req: true, pick: PK.supplier, w: 110, name: (db, r) => names.supplier(db, r.supplier) } as FieldDef,
  plant: (label: string): FieldDef => ({ k: 'plant', label, req: true, pick: PK.plant, w: 90, name: (db, r) => names.plant(db, r.plant) }),
  employee: (k: string, label: string): FieldDef => ({ k, label, pick: PK.employee, w: 110, name: (db, r) => names.employee(db, r[k]) }),
  currency: (label = '幣別'): FieldDef => ({ k: 'currency', label, req: true, pick: PK.currency, w: 80, name: (db, r) => names.currency(db, r.currency) }),
  rate: { k: 'rate', label: '匯率', t: 'num', w: 180 } as FieldDef,
  taxCode: { k: 'taxCode', label: '稅別碼', req: true, pick: PK.tax('S'), w: 70, name: (db, r) => names.tax(db, r.taxCode) } as FieldDef,
  taxCodeP: { k: 'taxCode', label: '稅別碼', req: true, pick: PK.tax('P'), w: 70, name: (db, r) => names.tax(db, r.taxCode) } as FieldDef,
  taxType: { k: 'taxType', label: '課稅別', t: 'select', opts: TAX_TYPES, w: 160 } as FieldDef,
  taxRate: { k: 'taxRate', label: '營業稅率', t: 'ro', w: 120, show: (r: R) => `${r.taxRate ?? 0} %` } as FieldDef,
  payTerm: { k: 'payTerm', label: '付款條件', w: 60, pick: PK.payTerm, name: (_db, r) => names.payTerm(r.payTerm) } as FieldDef,
  confirmer: { k: 'confirmer', label: '確認者', t: 'ro', w: 120 } as FieldDef,
  sign: roText('簽核狀態', 'N:不執行電子簽核', 260),
  remark: { k: 'remark', label: '備註', w: 300 } as FieldDef,
  status: { k: 'status', label: '確認碼', t: 'ro', w: 110, show: (r: R) => STATUS_TEXT(r.status) } as FieldDef,
}

// ---------- 常用單身欄位 ----------
export const C = {
  seq: { k: 'seq', label: '序號', w: 60, pk: true, ro: true } as ColDef,
  item: { k: 'item', label: '品號', w: 130, req: true, pick: PK.item } as ColDef,
  name: { k: 'name', label: '品名', w: 220, ro: true } as ColDef,
  spec: { k: 'spec', label: '規格', w: 200, ro: true } as ColDef,
  unit: { k: 'unit', label: '單位', w: 60, ro: true, req: true } as ColDef,
  qty: (label = '數量'): ColDef => ({ k: 'qty', label, w: 100, t: 'num' }),
  price: (label = '單價', mask: 'price' | 'cost' = 'price'): ColDef => ({ k: 'price', label, w: 110, t: 'num', mask }),
  amount: (label = '金額', mask: 'price' | 'cost' = 'price'): ColDef => ({ k: 'amount', label, w: 120, t: 'num', ro: true, mask }),
  warehouse: (label = '庫別'): ColDef => ({ k: 'warehouse', label, w: 80, req: true, pick: PK.warehouse }),
  date: (k: string, label: string): ColDef => ({ k, label, w: 120, t: 'date' }),
  remark: { k: 'remark', label: '備註', w: 200 } as ColDef,
  src: (label: string): ColDef => ({ k: '_src', label, w: 190, ro: true, show: l => (l.srcType ? `${l.srcType}-${l.srcNo}-${l.srcSeq}` : '') }),
}

/** 選了品號就帶出品名、規格、單位、單價、庫別；數量或單價變動就重算金額 */
export function lineChange(priceFrom: 'price' | 'cost', extra?: (l: R, k: string, db: DB, rec: R) => R) {
  return (l: R, k: string, db: DB, rec: R) => {
    if (k === 'item') {
      const it = db.items.find(i => i.id === l.item)
      if (it) l = { ...l, name: it.name, spec: it.spec, unit: it.unit, price: l.price || it[priceFrom], ...('warehouse' in l ? { warehouse: l.warehouse || it.mainWarehouse } : {}) }
    }
    if ('amount' in l) l.amount = round((('accepted' in l) ? l.accepted : l.qty) * l.price)
    return extra ? extra(l, k, db, rec) : l
  }
}

/** 客戶、供應商、稅別碼、幣別帶出相關欄位 */
export function headerChange(r: R, k: string, db: DB): R {
  if (k === 'customer') {
    const c = db.customers.find(x => x.id === r.customer)
    if (c) r = { ...r, currency: c.currency || r.currency, taxCode: c.taxCode || r.taxCode, payTerm: c.payTerm || r.payTerm, sales: r.sales || c.sales, ...('dept' in r ? { dept: r.dept || c.dept } : {}) }
  }
  if (k === 'supplier') {
    const s = db.suppliers.find(x => x.id === r.supplier)
    if (s) r = { ...r, currency: s.currency || r.currency, payTerm: s.payTerm || r.payTerm, taxCode: s.taxCode || r.taxCode, ...('contact' in r ? { contact: s.contact } : {}) }
  }
  if (k === 'customer' || k === 'taxCode' || k === 'supplier') {
    const t = db.taxCodes.find(x => x.id === r.taxCode)
    if (t) r = { ...r, taxType: t.taxType, taxRate: t.rate }
  }
  if (k === 'currency') {
    const c = db.currencies.find(x => x.id === r.currency)
    if (c) r = { ...r, rate: c.rate }
  }
  return r
}

/** 一般單據共用的設定：存檔、刪除、確認、取消確認、作廢、單號預覽 */
export function docBase(kind: DocKind): Pick<DocConfig, 'records' | 'key' | 'status' | 'save' | 'remove' | 'confirm' | 'unconfirm' | 'voidIt' | 'renumber' | 'onField'> {
  return {
    records: db => list(db, kind),
    key: keyOf,
    status: r => r.status,
    save: (d, r, isNew, user) => saveDoc(d, kind, r, isNew, user),
    remove: (d, r) => deleteDoc(d, kind, r.type, r.no),
    confirm: (d, r, user) => confirmDoc(d, kind, r.type, r.no, user),
    unconfirm: (d, r) => unconfirmDoc(d, kind, r.type, r.no),
    voidIt: (d, r) => voidDoc(d, kind, r.type, r.no),
    renumber: (db, r) => {
      const dt = db.docTypes.find(t => t.id === r.type && t.kind === kind)
      return dt && isDate(r.date) ? { ...r, no: peekNo(db, kind, r.type, r.date) } : { ...r, no: '' }
    },
    onField: headerChange,
  }
}

export const docQuery = (typeLabel: string, noLabel: string): DocConfig['query'] => [
  [typeLabel, r => r.type], [noLabel, r => r.no], ['單據日期', r => r.date],
]

export const docTotals = (labels: [string, string, string]) =>
  (r: R, _db: DB, mask: (k: 'price' | 'cost', v: number) => string | number): [string, string | number][][] => {
    const t = totals(r)
    return [
      [[labels[0], mask('price', t.amount)], [labels[1], mask('price', t.tax)], [labels[2], mask('price', t.total)]],
      [['總數量', t.qty], ['總毛重(Kg)', 0], ['總材積(Volume)', 0]],
    ]
  }

export const dueDefault = (rec: R) => (isDate(rec.date) ? addDays(rec.date, 7) : '')
export { KIND_NAME }
