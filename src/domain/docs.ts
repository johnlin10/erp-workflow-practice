import type {
  DB, DocKind, Quote, Order, OrderLine, OrderChange, Requisition, Purchase, Receipt, Sale, AnyDoc,
} from '../db/schema'
import { stockOf } from './stock'

export class ErpError extends Error {}
export function fail(msg: string): never { throw new ErpError(msg) }

type KindMap = { quote: Quote; order: Order; requisition: Requisition; purchase: Purchase; receipt: Receipt; sale: Sale }
export const COLL = {
  quote: 'quotes', order: 'orders', requisition: 'requisitions',
  purchase: 'purchases', receipt: 'receipts', sale: 'sales',
} as const
export const KIND_NAME: Record<DocKind, string> = {
  quote: '報價單', order: '客戶訂單', requisition: '請購單', purchase: '採購單', receipt: '進貨單', sale: '銷貨單',
}

export const list = <K extends DocKind>(db: DB, k: K) => db[COLL[k]] as KindMap[K][]
export const keyOf = (d: { type: string; no: string }) => `${d.type}-${d.no}`
export function find<K extends DocKind>(db: DB, k: K, type: string, no: string): KindMap[K] | undefined {
  return list(db, k).find(d => d.type === type && d.no === no)
}
export function mustFind<K extends DocKind>(db: DB, k: K, type: string, no: string): KindMap[K] {
  return find(db, k, type, no) ?? fail(`找不到${KIND_NAME[k]} ${type}-${no}`)
}

// ---------- 日期 ----------
export const fmtDate = (d: Date) =>
  `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
export const today = () => fmtDate(new Date())
export const isDate = (s: string) => /^\d{4}\/\d{2}\/\d{2}$/.test(s) && !isNaN(new Date(s).getTime())
export function addDays(s: string, n: number) {
  const d = new Date(s)
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}
export const nowStamp = () => {
  const d = new Date()
  return `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// ---------- 單號：年月 + 3 位流水號，每個單別各自編號 ----------
export function peekNo(db: DB, kind: DocKind, type: string, date: string) {
  const ym = date.replace(/\//g, '').slice(0, 6)
  let n = (db.counters[`${type}-${ym}`] ?? 0) + 1
  while (find(db, kind, type, ym + String(n).padStart(3, '0'))) n++
  return ym + String(n).padStart(3, '0')
}
export function takeNo(draft: DB, kind: DocKind, type: string, date: string) {
  const no = peekNo(draft, kind, type, date)
  draft.counters[`${type}-${no.slice(0, 6)}`] = Number(no.slice(6))
  return no
}
export const seqOf = (i: number) => String(i + 1).padStart(4, '0')

// ---------- 金額 ----------
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
export function totals(doc: { lines: { amount: number; qty: number }[]; taxType?: string; taxRate?: number }) {
  const amount = round(doc.lines.reduce((s, l) => s + l.amount, 0))
  const r = (doc.taxRate ?? 0) / 100
  const tax = doc.taxType === '2' ? Math.round(amount * r) : doc.taxType === '1' ? Math.round(amount - amount / (1 + r)) : 0
  const total = doc.taxType === '1' ? amount : amount + tax
  const qty = round(doc.lines.reduce((s, l) => s + l.qty, 0), 3)
  return { amount: doc.taxType === '1' ? amount - tax : amount, tax, total, qty }
}

export const orderRemaining = (l: OrderLine) => (l.closed ? 0 : Math.max(0, l.qty - l.delivered))
export const poRemaining = (l: Purchase['lines'][number]) => (l.closed ? 0 : Math.max(0, l.qty - l.received))

// ---------- 存檔 ----------
function checkCommon(db: DB, kind: DocKind, doc: AnyDoc) {
  const dt = db.docTypes.find(t => t.id === doc.type)
  if (!dt) fail(`單別 ${doc.type || '(空白)'} 不存在`)
  if (dt.kind !== kind) fail(`單別 ${doc.type} 不是${KIND_NAME[kind]}的單別`)
  if (!isDate(doc.date)) fail('單據日期格式錯誤，請輸入 YYYY/MM/DD')
  if (!doc.lines.length) fail('單身資料不可空白')
  doc.lines.forEach((l, i) => {
    const row = `第 ${i + 1} 筆單身：`
    if (!db.items.some(it => it.id === l.item)) fail(`${row}品號 ${l.item || '(空白)'} 不存在`)
    if (!(l.qty > 0)) fail(`${row}數量必須大於 0`)
    if ('warehouse' in l && !db.warehouses.some(w => w.id === l.warehouse)) fail(`${row}庫別 ${l.warehouse || '(空白)'} 不存在`)
    l.seq = seqOf(i)
    if ('amount' in l) l.amount = round(('accepted' in l ? l.accepted : l.qty) * l.price) // 進貨依驗收數量計價
  })
}

export function saveDoc<K extends DocKind>(draft: DB, kind: K, doc: KindMap[K], isNew: boolean, user: string): KindMap[K] {
  checkCommon(draft, kind, doc)
  const d = doc as AnyDoc
  if ('customer' in d && !draft.customers.some(c => c.id === d.customer)) fail(`客戶代號 ${d.customer || '(空白)'} 不存在`)
  if ('supplier' in d && !draft.suppliers.some(s => s.id === d.supplier)) fail(`供應廠商 ${d.supplier || '(空白)'} 不存在`)
  if ('plant' in d && !draft.plants.some(p => p.id === d.plant)) fail(`廠別 ${d.plant || '(空白)'} 不存在`)
  if ('currency' in d && !draft.currencies.some(c => c.id === d.currency)) fail(`幣別 ${d.currency || '(空白)'} 不存在`)
  if (kind === 'order') (d as Order).lines.forEach((l, i) => { if (!isDate(l.dueDate)) fail(`第 ${i + 1} 筆單身：預交日格式錯誤`) })
  if (kind === 'receipt') (d as Receipt).lines.forEach((l, i) => {
    if (l.accepted < 0 || l.accepted > l.qty) fail(`第 ${i + 1} 筆單身：驗收數量必須介於 0 與進貨數量之間`)
    checkPoQty(draft, l.srcType, l.srcNo, l.srcSeq, l.qty, i)
  })
  if (kind === 'sale') (d as Sale).lines.forEach((l, i) => checkOrderQty(draft, l.srcType, l.srcNo, l.srcSeq, l.qty, i))

  const arr = list(draft, kind) as AnyDoc[]
  if (isNew) {
    d.no = takeNo(draft, kind, d.type, d.date)
    d.status = 'N'
    d.creator = user
    d.confirmer = ''
    arr.push(d)
  } else {
    const i = arr.findIndex(x => x.type === d.type && x.no === d.no)
    if (i < 0) fail('找不到要修改的單據')
    if (arr[i].status !== 'N') fail('單據已確認或作廢，不可修改')
    arr[i] = d
  }
  return doc
}

function checkPoQty(db: DB, type: string, no: string, seq: string, qty: number, i: number) {
  if (!type) return
  const l = mustFind(db, 'purchase', type, no).lines.find(x => x.seq === seq) ?? fail(`找不到採購單 ${type}-${no}-${seq}`)
  if (qty > poRemaining(l)) fail(`第 ${i + 1} 筆單身：進貨數量 ${qty} 超過採購單未交數量 ${poRemaining(l)}`)
}
function checkOrderQty(db: DB, type: string, no: string, seq: string, qty: number, i: number) {
  if (!type) return
  const l = mustFind(db, 'order', type, no).lines.find(x => x.seq === seq) ?? fail(`找不到訂單 ${type}-${no}-${seq}`)
  if (qty > orderRemaining(l)) fail(`第 ${i + 1} 筆單身：銷貨數量 ${qty} 超過訂單未交數量 ${orderRemaining(l)}`)
}

// ---------- 確認 / 取消確認 ----------
export function confirmDoc(draft: DB, kind: DocKind, type: string, no: string, user: string) {
  const d = mustFind(draft, kind, type, no) as AnyDoc
  if (d.status === 'Y') fail('單據已確認')
  if (d.status === 'V') fail('單據已作廢，不可確認')

  if (kind === 'order') checkCredit(draft, d as Order)
  if (kind === 'receipt') {
    const r = d as Receipt
    r.lines.forEach((l, i) => {
      if (l.srcType) {
        const po = mustFind(draft, 'purchase', l.srcType, l.srcNo)
        if (po.status !== 'Y') fail(`採購單 ${l.srcType}-${l.srcNo} 尚未確認`)
        checkPoQty(draft, l.srcType, l.srcNo, l.srcSeq, l.qty, i)
        const pl = po.lines.find(x => x.seq === l.srcSeq)!
        pl.received = round(pl.received + l.accepted, 3)
        pl.closed = pl.received >= pl.qty
      }
      if (l.accepted > 0) draft.stock.push({ date: r.date, item: l.item, warehouse: l.warehouse, qty: l.accepted, docKind: 'receipt', docType: r.type, docNo: r.no, seq: l.seq })
    })
  }
  if (kind === 'sale') {
    const s = d as Sale
    const need = new Map<string, number>()
    s.lines.forEach(l => need.set(`${l.item}\t${l.warehouse}`, (need.get(`${l.item}\t${l.warehouse}`) ?? 0) + l.qty))
    need.forEach((q, k) => {
      const [item, wh] = k.split('\t')
      const have = stockOf(draft, item, wh)
      if (have < q) fail(`庫存不足，無法確認！\n品號 ${item}　庫別 ${wh}\n庫存數量：${have}\n銷貨數量：${q}`)
    })
    s.lines.forEach((l, i) => {
      if (l.srcType) {
        const o = mustFind(draft, 'order', l.srcType, l.srcNo)
        if (o.status !== 'Y') fail(`訂單 ${l.srcType}-${l.srcNo} 尚未確認`)
        checkOrderQty(draft, l.srcType, l.srcNo, l.srcSeq, l.qty, i)
        const ol = o.lines.find(x => x.seq === l.srcSeq)!
        ol.delivered = round(ol.delivered + l.qty, 3)
        ol.closed = ol.delivered >= ol.qty
      }
      draft.stock.push({ date: s.date, item: l.item, warehouse: l.warehouse, qty: -l.qty, docKind: 'sale', docType: s.type, docNo: s.no, seq: l.seq })
    })
  }
  d.status = 'Y'
  d.confirmer = user
}

function checkCredit(db: DB, o: Order) {
  const c = db.customers.find(x => x.id === o.customer)
  if (!c || c.creditLimit <= 0 || o.noCreditCheck) return
  const open = db.orders
    .filter(x => x.customer === o.customer && x.status === 'Y')
    .reduce((s, x) => s + x.lines.reduce((t, l) => t + orderRemaining(l) * l.price, 0), 0)
  const mine = totals(o).amount
  if (open + mine > c.creditLimit)
    fail(`客戶 ${c.id} ${c.short} 信用額度不足！\n信用額度：${c.creditLimit}\n未出貨訂單金額：${open}\n本單金額：${mine}\n\n如要略過檢查，請勾選「不控管信用額度」。`)
}

/** 找出引用這張單據、而且沒有作廢的下游單據 */
export function referencedBy(db: DB, kind: DocKind, type: string, no: string): string[] {
  const hit = (d: { status: string }, refs: { srcType: string; srcNo: string }[]) =>
    d.status !== 'V' && refs.some(r => r.srcType === type && r.srcNo === no)
  const out: string[] = []
  const add = (k: DocKind, ds: AnyDoc[], useLines: boolean) =>
    ds.filter(d => hit(d, useLines ? (d.lines as { srcType: string; srcNo: string }[]) : [d])).forEach(d => out.push(`${KIND_NAME[k]} ${d.type}-${d.no}`))
  if (kind === 'quote') add('order', db.orders, false)
  if (kind === 'order') {
    add('sale', db.sales, true)
    add('requisition', db.requisitions, true)
    db.orderChanges.filter(c => c.status !== 'V' && c.orderType === type && c.orderNo === no)
      .forEach(c => out.push(`訂單變更單 ${c.orderType}-${c.orderNo} 版次 ${String(c.ver).padStart(4, '0')}`))
  }
  if (kind === 'requisition') {
    const r = find(db, 'requisition', type, no)
    r?.lines.filter(l => l.poNo).forEach(l => out.push(`採購單 ${l.poType}-${l.poNo}`))
  }
  if (kind === 'purchase') add('receipt', db.receipts, true)
  return [...new Set(out)]
}

export function unconfirmDoc(draft: DB, kind: DocKind, type: string, no: string) {
  const d = mustFind(draft, kind, type, no) as AnyDoc
  if (d.status !== 'Y') fail('單據尚未確認')
  const refs = referencedBy(draft, kind, type, no)
  if (refs.length) fail(`此單據已被下列單據引用，不可取消確認：\n${refs.join('\n')}`)

  if (kind === 'receipt' || kind === 'sale') {
    const mine = (m: DB['stock'][number]) => m.docKind === kind && m.docType === type && m.docNo === no
    const rest = draft.stock.filter(m => !mine(m))
    draft.stock.filter(mine).forEach(m => {
      const after = rest.filter(x => x.item === m.item && x.warehouse === m.warehouse).reduce((s, x) => s + x.qty, 0)
      if (after < 0) fail(`取消確認後品號 ${m.item} 庫別 ${m.warehouse} 庫存會變成負數 (${after})，不可取消確認`)
    })
    draft.stock = rest
  }
  if (kind === 'receipt') (d as Receipt).lines.forEach(l => {
    if (!l.srcType) return
    const pl = mustFind(draft, 'purchase', l.srcType, l.srcNo).lines.find(x => x.seq === l.srcSeq)!
    pl.received = round(pl.received - l.accepted, 3)
    pl.closed = pl.received >= pl.qty
  })
  if (kind === 'sale') (d as Sale).lines.forEach(l => {
    if (!l.srcType) return
    const ol = mustFind(draft, 'order', l.srcType, l.srcNo).lines.find(x => x.seq === l.srcSeq)!
    ol.delivered = round(ol.delivered - l.qty, 3)
    ol.closed = ol.delivered >= ol.qty
  })
  d.status = 'N'
  d.confirmer = ''
}

// ---------- 刪除 / 作廢 ----------
function releaseRefs(draft: DB, kind: DocKind, d: AnyDoc) {
  if (kind === 'requisition') {
    const orders = new Set((d as Requisition).lines.filter(l => l.srcType).map(l => `${l.srcType}\t${l.srcNo}`))
    orders.forEach(k => {
      const [t, n] = k.split('\t')
      const stillUsed = draft.requisitions.some(r => r !== d && r.status !== 'V' && r.lines.some(l => l.srcType === t && l.srcNo === n))
      const o = find(draft, 'order', t, n)
      if (o && !stillUsed) o.transferred = false
    })
  }
  if (kind === 'purchase') draft.requisitions.forEach(r => r.lines.forEach(l => {
    if (l.poType === d.type && l.poNo === d.no) { l.poType = ''; l.poNo = ''; l.poSeq = '' }
  }))
}

export function deleteDoc(draft: DB, kind: DocKind, type: string, no: string) {
  const d = mustFind(draft, kind, type, no) as AnyDoc
  if (d.status !== 'N') fail('只有未確認的單據可以刪除')
  releaseRefs(draft, kind, d)
  const arr = list(draft, kind) as AnyDoc[]
  arr.splice(arr.indexOf(d), 1)
}

export function voidDoc(draft: DB, kind: DocKind, type: string, no: string) {
  const d = mustFind(draft, kind, type, no) as AnyDoc
  if (d.status !== 'N') fail('只有未確認的單據可以作廢')
  releaseRefs(draft, kind, d)
  d.status = 'V'
}

// ---------- 複製前置單別 ----------
export function quoteToOrder(db: DB, type: string, no: string, order: Order): Order {
  const q = mustFind(db, 'quote', type, no)
  if (q.status !== 'Y') fail('前置單據尚未確認，不可複製')
  return {
    ...order,
    customer: q.customer, sales: q.sales || order.sales, currency: q.currency, rate: q.rate,
    taxCode: q.taxCode, taxType: q.taxType, taxRate: q.taxRate, payTerm: q.payTerm, priceTerm: q.priceTerm,
    srcType: q.type, srcNo: q.no,
    lines: q.lines.map(l => ({
      seq: l.seq, item: l.item, name: l.name, spec: l.spec, unit: l.unit, qty: l.qty, price: l.price, amount: l.amount,
      warehouse: db.items.find(i => i.id === l.item)?.mainWarehouse ?? '', dueDate: addDays(order.date, 7),
      delivered: 0, closed: false, remark: l.remark, srcType: q.type, srcNo: q.no, srcSeq: l.seq,
    })),
  }
}

export function orderToSale(db: DB, type: string, no: string, sale: Sale): Sale {
  const o = mustFind(db, 'order', type, no)
  if (o.status !== 'Y') fail('前置單據尚未確認，不可複製')
  const lines = o.lines.filter(l => orderRemaining(l) > 0)
  if (!lines.length) fail('此訂單已全部出貨，沒有可複製的單身')
  return {
    ...sale,
    customer: o.customer, plant: o.plant, dept: o.dept, sales: o.sales, currency: o.currency, rate: o.rate,
    taxCode: o.taxCode, taxType: o.taxType, taxRate: o.taxRate, payTerm: o.payTerm,
    srcType: o.type, srcNo: o.no,
    lines: lines.map(l => ({
      seq: l.seq, item: l.item, name: l.name, spec: l.spec, unit: l.unit, qty: orderRemaining(l), price: l.price,
      amount: round(orderRemaining(l) * l.price), warehouse: l.warehouse, remark: '',
      srcType: o.type, srcNo: o.no, srcSeq: l.seq,
    })),
  }
}

export function purchaseToReceipt(db: DB, type: string, no: string, rc: Receipt): Receipt {
  const p = mustFind(db, 'purchase', type, no)
  if (p.status !== 'Y') fail('前置單據尚未確認，不可複製')
  const lines = p.lines.filter(l => poRemaining(l) > 0)
  if (!lines.length) fail('此採購單已全部進貨，沒有可複製的單身')
  const sup = db.suppliers.find(s => s.id === p.supplier)
  return {
    ...rc,
    supplier: p.supplier, plant: p.plant, currency: p.currency, rate: p.rate, contact: sup?.contact ?? '',
    taxCode: p.taxCode, taxType: p.taxType, taxRate: p.taxRate, payTerm: p.payTerm,
    srcType: p.type, srcNo: p.no,
    lines: lines.map(l => ({
      seq: l.seq, item: l.item, name: l.name, spec: l.spec, unit: l.unit, qty: poRemaining(l), accepted: poRemaining(l),
      price: l.price, amount: round(poRemaining(l) * l.price), warehouse: l.warehouse, remark: '',
      srcType: p.type, srcNo: p.no, srcSeq: l.seq,
    })),
  }
}

// ---------- 訂單變更 ----------
export const changeKey = (c: { orderType: string; orderNo: string; ver: number }) =>
  `${c.orderType}-${c.orderNo}-${String(c.ver).padStart(4, '0')}`

export function newOrderChange(db: DB, type: string, no: string, date: string): OrderChange {
  const o = mustFind(db, 'order', type, no)
  if (o.status !== 'Y') fail('只有已確認的訂單可以變更')
  if (db.orderChanges.some(c => c.orderType === type && c.orderNo === no && c.status === 'N'))
    fail('此訂單已有未確認的變更單，請先確認或刪除該變更單')
  return {
    orderType: type, orderNo: no, ver: o.version + 1, date, status: 'N', confirmer: '', creator: '',
    reason: '', closeAll: false,
    customer: o.customer, dept: o.dept, sales: o.sales, customerPo: o.customerPo, priceTerm: o.priceTerm, payTerm: o.payTerm,
    currency: o.currency, rate: o.rate, taxCode: o.taxCode, taxType: o.taxType, taxRate: o.taxRate,
    lines: o.lines.filter(l => !l.closed).map(l => ({
      seq: l.seq, origSeq: l.seq, item: l.item, name: l.name, spec: l.spec, unit: l.unit,
      qty: l.qty, price: l.price, amount: l.amount, warehouse: l.warehouse, dueDate: l.dueDate, remark: l.remark,
    })),
  }
}

export function saveOrderChange(draft: DB, c: OrderChange, isNew: boolean, user: string) {
  const o = mustFind(draft, 'order', c.orderType, c.orderNo)
  if (!isDate(c.date)) fail('單據日期格式錯誤，請輸入 YYYY/MM/DD')
  c.lines.forEach((l, i) => {
    const row = `第 ${i + 1} 筆單身：`
    if (!draft.items.some(it => it.id === l.item)) fail(`${row}品號 ${l.item || '(空白)'} 不存在`)
    if (!(l.qty > 0)) fail(`${row}數量必須大於 0`)
    if (!isDate(l.dueDate)) fail(`${row}預交日格式錯誤`)
    const ol = o.lines.find(x => x.seq === l.origSeq)
    if (l.origSeq && !ol) fail(`${row}原序號 ${l.origSeq} 不存在`)
    if (ol && l.qty < ol.delivered) fail(`${row}變更後數量 ${l.qty} 不可小於已交數量 ${ol.delivered}`)
    if (ol && ol.delivered > 0 && l.item !== ol.item) fail(`${row}已有出貨的明細不可變更品號`)
    l.seq = seqOf(i)
    l.amount = round(l.qty * l.price)
  })
  const i = draft.orderChanges.findIndex(x => changeKey(x) === changeKey(c))
  if (isNew) {
    if (i >= 0) fail('變更單已存在')
    c.status = 'N'; c.creator = user; c.confirmer = ''
    draft.orderChanges.push(c)
  } else {
    if (i < 0) fail('找不到要修改的變更單')
    if (draft.orderChanges[i].status !== 'N') fail('變更單已確認，不可修改')
    draft.orderChanges[i] = c
  }
}

export function confirmOrderChange(draft: DB, key: string, user: string) {
  const c = draft.orderChanges.find(x => changeKey(x) === key) ?? fail('找不到變更單')
  if (c.status !== 'N') fail('變更單已確認或作廢')
  const o = mustFind(draft, 'order', c.orderType, c.orderNo)
  if (o.status !== 'Y') fail('原訂單不是已確認狀態')
  if (c.ver !== o.version + 1) fail('變更版次與訂單目前版次不符')
  Object.assign(o, {
    dept: c.dept, sales: c.sales, customerPo: c.customerPo, priceTerm: c.priceTerm, payTerm: c.payTerm,
    taxCode: c.taxCode, taxType: c.taxType, taxRate: c.taxRate,
  })
  const kept = new Set(c.lines.map(l => l.origSeq).filter(Boolean))
  o.lines.filter(l => !l.closed && !kept.has(l.seq)).forEach(l => { l.closed = true }) // 變更單刪掉的明細 → 結案
  c.lines.forEach(l => {
    const ol = o.lines.find(x => x.seq === l.origSeq)
    const fields = { item: l.item, name: l.name, spec: l.spec, unit: l.unit, qty: l.qty, price: l.price, amount: l.amount, warehouse: l.warehouse, dueDate: l.dueDate, remark: l.remark }
    if (ol) { Object.assign(ol, fields); ol.closed = ol.delivered >= ol.qty }
    else o.lines.push({ ...fields, seq: seqOf(o.lines.length), delivered: 0, closed: false, srcType: '', srcNo: '', srcSeq: '' })
  })
  if (c.closeAll) o.lines.forEach(l => { l.closed = true })
  o.version = c.ver
  c.status = 'Y'
  c.confirmer = user
}

export function deleteOrderChange(draft: DB, key: string) {
  const i = draft.orderChanges.findIndex(x => changeKey(x) === key)
  if (i < 0) fail('找不到變更單')
  if (draft.orderChanges[i].status !== 'N') fail('變更單已確認，不可刪除')
  draft.orderChanges.splice(i, 1)
}

// ---------- 請購資料維護 ----------
export type ReqLinePatch = Pick<Requisition['lines'][number],
  'buyer' | 'supplier' | 'poQty' | 'price' | 'deliveryDate' | 'locked' | 'urgent' | 'poRemark'>
export function maintainReqLine(draft: DB, type: string, no: string, seq: string, patch: ReqLinePatch) {
  const r = mustFind(draft, 'requisition', type, no)
  if (r.status !== 'Y') fail('請購單尚未確認，不可維護')
  const l = r.lines.find(x => x.seq === seq) ?? fail('找不到請購明細')
  if (l.poNo) fail(`此明細已轉採購單 ${l.poType}-${l.poNo}，不可修改`)
  if (patch.supplier && !draft.suppliers.some(s => s.id === patch.supplier)) fail(`供應廠商 ${patch.supplier} 不存在`)
  if (patch.buyer && !draft.employees.some(e => e.id === patch.buyer)) fail(`採購人員 ${patch.buyer} 不存在`)
  if (patch.poQty < 0) fail('採購數量不可小於 0')
  if (patch.deliveryDate && !isDate(patch.deliveryDate)) fail('交貨日格式錯誤')
  Object.assign(l, patch)
}
