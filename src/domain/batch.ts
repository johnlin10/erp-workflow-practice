import type { DB, Job, Purchase, Requisition } from '../db/schema'
import { addDays, fail, isDate, nowStamp, orderRemaining, round, seqOf, takeNo } from './docs'

function pushJob(draft: DB, program: string, name: string, user: string, params: [string, string][], result: string): Job {
  const stamp = nowStamp()
  const ymd = stamp.slice(0, 10).replace(/\//g, '')
  const n = draft.jobs.filter(j => j.id.startsWith(ymd)).length + 1
  const job: Job = {
    id: ymd + String(n).padStart(6, '0'), program, name, mode: '依佇列順序',
    params, status: '已完成', user, queued: stamp, start: stamp, end: stamp, result,
  }
  draft.jobs.unshift(job)
  return job
}

const range = (a: string, b: string) => `${a}~${b}`
const docRange = (type: string, nos: string[]) =>
  nos.length ? `${type}-${nos[0]}~${type}-${nos[nos.length - 1]}; ` : ''

// ---------- COPB10 訂單轉請購單複製作業 ----------
export type COPB10Params = {
  plant: string; orderKeys: string[]; custFrom: string; custTo: string; dateFrom: string; dateTo: string
  reqType: string; reqDate: string; supplierMode: '1' | '2'; supplier: string
  needMode: '1' | '2'; days: number; requester: string
}

export function runCOPB10(draft: DB, p: COPB10Params, user: string): Job {
  if (!draft.plants.some(x => x.id === p.plant)) fail('請輸入正確的廠別')
  const dt = draft.docTypes.find(t => t.id === p.reqType)
  if (!dt || dt.kind !== 'requisition') fail('請輸入正確的請購單別')
  if (!isDate(p.reqDate)) fail('請購日期格式錯誤')
  if (!draft.employees.some(e => e.id === p.requester)) fail('請輸入正確的請購人員')
  if (p.supplierMode === '2' && !draft.suppliers.some(s => s.id === p.supplier)) fail('請輸入正確的廠商代號')

  const orders = draft.orders.filter(o =>
    o.status === 'Y' && !o.transferred && o.plant === p.plant &&
    (!p.orderKeys.length || p.orderKeys.includes(`${o.type}-${o.no}`)) &&
    (!p.custFrom || o.customer >= p.custFrom) && (!p.custTo || o.customer <= p.custTo) &&
    (!p.dateFrom || o.date >= p.dateFrom) && (!p.dateTo || o.date <= p.dateTo))

  const lines: Requisition['lines'] = []
  orders.forEach(o => o.lines.filter(l => orderRemaining(l) > 0).forEach(l => {
    const it = draft.items.find(i => i.id === l.item)
    const need = p.needMode === '1' ? addDays(l.dueDate, -p.days) : addDays(p.reqDate, it?.leadDays ?? 0)
    const qty = orderRemaining(l)
    lines.push({
      seq: seqOf(lines.length), item: l.item, name: l.name, spec: l.spec, unit: l.unit, warehouse: l.warehouse,
      qty, needDate: need, remark: '',
      buyer: '', supplier: p.supplierMode === '1' ? (it?.mainSupplier ?? '') : p.supplier,
      poQty: qty, price: it?.cost ?? 0, deliveryDate: need,
      locked: false, urgent: false, poRemark: '', closeCode: '', poType: '', poNo: '', poSeq: '',
      srcType: o.type, srcNo: o.no, srcSeq: l.seq,
    })
  }))

  const params: [string, string][] = [
    ['選擇廠別', p.plant],
    ['選擇訂單單號', p.orderKeys.join(',')],
    ['選擇客戶代號', range(p.custFrom, p.custTo)],
    ['選擇訂單日期', range(p.dateFrom, p.dateTo)],
    ['輸入請購單別', p.reqType],
    ['輸入請購日期', p.reqDate.replace(/\//g, '')],
    ['選擇廠商', p.supplierMode === '1' ? '1 | 品號之主供應商' : '2 | 指定廠商'],
    ['輸入廠商代號', p.supplierMode === '2' ? p.supplier : ''],
    ['輸入請購人員', p.requester],
    ['選擇需求日計算方式', p.needMode === '1' ? `1 | 依訂單預交日減 ${p.days} 天` : '2 | 依前置天數推算'],
  ]
  if (!lines.length)
    return pushJob(draft, 'COPB10', '訂單轉請購單複製作業', user, params, '無符合條件之資料; Commits: 0 Records, RollBacks: 0 Records;')

  const no = takeNo(draft, 'requisition', p.reqType, p.reqDate)
  draft.requisitions.push({
    type: p.reqType, no, date: p.reqDate, status: 'N', confirmer: '', creator: user, remark: '',
    srcType: '', srcNo: '', plant: p.plant, dept: '', requester: p.requester, source: '訂單', reqDate: p.reqDate,
    lines,
  })
  orders.forEach(o => { o.transferred = true })
  return pushJob(draft, 'COPB10', '訂單轉請購單複製作業', user, params,
    `${docRange(p.reqType, [no])}Commits: ${lines.length} Records, RollBacks: 0 Records;`)
}

// ---------- PURB01 請購資料更新作業 ----------
export type PURB01Params = {
  reqKeys: string[]; lockOpt: '1' | '2' | '3'; plant: string; warehouses: string[]; currency: string; buyers: string[]
  poDate: string; poType: string; mergeSameDate: boolean; copyRemark: boolean
}
export const LOCK_OPTS = { '1': '未鎖定', '2': '已鎖定', '3': '全部' } as const

export function runPURB01(draft: DB, p: PURB01Params, user: string): Job {
  const dt = draft.docTypes.find(t => t.id === p.poType)
  if (!dt || dt.kind !== 'purchase') fail('請輸入正確的採購單別')
  if (!isDate(p.poDate)) fail('採購日期格式錯誤')

  type Pick = { r: Requisition; l: Requisition['lines'][number] }
  const picks: Pick[] = []
  draft.requisitions.forEach(r => {
    if (r.status !== 'Y') return
    if (p.reqKeys.length && !p.reqKeys.includes(`${r.type}-${r.no}`)) return
    if (p.plant && r.plant !== p.plant) return
    r.lines.forEach(l => {
      if (l.poNo || !l.supplier || !(l.poQty > 0)) return
      if (p.lockOpt === '1' && l.locked) return
      if (p.lockOpt === '2' && !l.locked) return
      if (p.warehouses.length && !p.warehouses.includes(l.warehouse)) return
      if (p.buyers.length && !p.buyers.includes(l.buyer)) return
      const sup = draft.suppliers.find(s => s.id === l.supplier)
      if (p.currency && sup?.currency !== p.currency) return
      picks.push({ r, l })
    })
  })

  const params: [string, string][] = [
    ['選擇請購單號', p.reqKeys.join(',')],
    ['鎖定選項', `${p.lockOpt} | ${LOCK_OPTS[p.lockOpt]}`],
    ['選擇廠別', p.plant],
    ['選擇庫別', p.warehouses.join(',')],
    ['選擇幣別', p.currency],
    ['選擇採購人員', p.buyers.join(',')],
    ['輸入採購日期', p.poDate.replace(/\//g, '')],
    ['輸入採購單別', p.poType],
    ['相同交貨日彙總產生', p.mergeSameDate ? 'Y' : 'N'],
    ['拋轉備註', p.copyRemark ? 'Y' : 'N'],
  ]
  if (!picks.length)
    return pushJob(draft, 'PURB01', '請購資料更新作業', user, params, '無符合條件之資料; Commits: 0 Records, RollBacks: 0 Records;')

  // 依「供應廠商 + 廠別」分組，每組一張採購單
  const groups = new Map<string, Pick[]>()
  picks.forEach(x => {
    const k = `${x.l.supplier}\t${x.r.plant}`
    groups.set(k, [...(groups.get(k) ?? []), x])
  })
  const nos: string[] = []
  let count = 0
  groups.forEach(items => {
    const { r: r0, l: l0 } = items[0]
    const sup = draft.suppliers.find(s => s.id === l0.supplier)!
    const no = takeNo(draft, 'purchase', p.poType, p.poDate)
    nos.push(no)
    const po: Purchase = {
      type: p.poType, no, date: p.poDate, status: 'N', confirmer: '', creator: user, remark: '',
      srcType: '', srcNo: '', currency: sup.currency || 'NTD', rate: 1, taxCode: 'S02', taxType: '2', taxRate: 5,
      payTerm: sup.payTerm, supplier: sup.id, plant: r0.plant, buyer: l0.buyer, poDate: p.poDate, lines: [],
    }
    items.forEach(({ r, l }) => {
      const same = p.mergeSameDate
        ? po.lines.find(x => x.item === l.item && x.deliveryDate === l.deliveryDate && x.price === l.price && x.warehouse === l.warehouse)
        : undefined
      if (same) {
        same.qty = round(same.qty + l.poQty, 3)
        same.amount = round(same.qty * same.price)
      } else {
        po.lines.push({
          seq: seqOf(po.lines.length), item: l.item, name: l.name, spec: l.spec, unit: l.unit,
          qty: l.poQty, price: l.price, amount: round(l.poQty * l.price), warehouse: l.warehouse,
          deliveryDate: l.deliveryDate || l.needDate, received: 0, closed: false,
          remark: p.copyRemark ? l.poRemark || l.remark : '', srcType: r.type, srcNo: r.no, srcSeq: l.seq,
        })
        count++
      }
      const target = same ?? po.lines[po.lines.length - 1]
      l.poType = po.type; l.poNo = po.no; l.poSeq = target.seq
    })
    draft.purchases.push(po)
  })
  return pushJob(draft, 'PURB01', '請購資料更新作業', user, params,
    `${docRange(p.poType, nos)}Commits: ${count} Records, RollBacks: 0 Records;`)
}
