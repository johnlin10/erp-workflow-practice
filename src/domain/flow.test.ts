import { describe, expect, it } from 'vitest'
import { DB as DBSchema } from '../db/schema'
import { seed } from '../db/seed'
import { blankOrder, blankQuote, blankReceipt, blankSale, nextItemNo } from './blank'
import {
  confirmDoc, confirmOrderChange, deleteDoc, maintainReqLine, newOrderChange, orderToSale, purchaseToReceipt,
  quoteToOrder, saveDoc, saveOrderChange, unconfirmDoc, changeKey,
} from './docs'
import { runCOPB10, runPURB01 } from './batch'
import { stockOf } from './stock'

const D = '2026/11/09'

describe('考試流程：報價 → 訂單 → 變更 → 轉請購 → 採購 → 進貨驗收 → 銷貨', () => {
  it('每一步的單號、數量、庫存與狀態都正確', () => {
    const db = seed()

    // 報價
    const q = blankQuote(db, D)
    q.customer = '1107'
    q.lines = [{ seq: '', item: '900004', name: '相機外掛麥克風組', spec: '通用', unit: '組', qty: 50, price: 1200, amount: 0, remark: '', shipDate: '', effDate: D, expDate: '2026/11/01' }]
    expect(() => saveDoc(structuredClone(db), 'quote', q, true, 'admin')).toThrow('失效日不可早於生效日')
    q.lines[0].expDate = '2026/12/31'
    saveDoc(db, 'quote', q, true, 'admin')
    expect(q.no).toBe('202611001')
    expect(() => quoteToOrder(db, 'C211', q.no, blankOrder(db, D))).toThrow('尚未確認')
    confirmDoc(db, 'quote', 'C211', q.no, 'admin')
    expect(() => quoteToOrder(db, 'C211', q.no, blankOrder(db, D))).toThrow('尚未客戶確認')
    q.customerConfirmed = true // 工具列「客戶確認」
    expect(() => unconfirmDoc(structuredClone(db), 'quote', 'C211', q.no)).toThrow('請先取消客戶確認')

    // 訂單（複製報價單）
    const o = quoteToOrder(db, 'C211', q.no, blankOrder(db, D))
    saveDoc(db, 'order', o, true, 'admin')
    confirmDoc(db, 'order', 'A221', o.no, 'admin')
    expect(() => unconfirmDoc(structuredClone(db), 'quote', 'C211', q.no)).toThrow('已被下列單據引用')

    // 訂單變更：50 → 60，版次 0 → 1
    const ch = newOrderChange(db, 'A221', o.no, D)
    ch.reason = '客戶追加'
    ch.lines[0].qty = 60
    saveOrderChange(db, ch, true, 'admin')
    confirmOrderChange(db, changeKey(ch), 'admin')
    const order = db.orders[0]
    expect(order.version).toBe(1)
    expect(order.lines[0].qty).toBe(60)

    // 訂單轉請購（批次）
    const params = {
      plant: 'TP01', orderKeys: [], custFrom: '', custTo: '', dateFrom: '', dateTo: '', reqType: 'C311', reqDate: D,
      supplierMode: '1' as const, supplier: '', needMode: '1' as const, days: 1, requester: '1001',
    }
    const job = runCOPB10(db, params, 'admin')
    expect(job.result).toContain('C311-202611001~C311-202611001; Commits: 1 Records')
    expect(order.transferred).toBe(true)
    const req = db.requisitions[0]
    expect(req.lines[0]).toMatchObject({ qty: 60, supplier: '1202', needDate: '2026/11/15' })
    // 再跑一次不會重複轉
    expect(runCOPB10(db, params, 'admin').result).toContain('Commits: 0')

    // 請購確認 → 維護（換供應商）→ 更新產生採購單
    expect(() => maintainReqLine(db, 'C311', req.no, '0001', { ...req.lines[0], supplier: 'A001' })).toThrow('尚未確認')
    confirmDoc(db, 'requisition', 'C311', req.no, 'admin')
    maintainReqLine(db, 'C311', req.no, '0001', { ...req.lines[0], supplier: 'A001', buyer: '145' })
    const j2 = runPURB01(db, {
      reqKeys: [], lockOpt: '1', plant: '', warehouses: [], currency: '', buyers: [], poDate: D, poType: 'A331',
      mergeSameDate: false, copyRemark: true,
    }, 'admin')
    expect(j2.result).toContain('A331-202611001')
    const po = db.purchases[0]
    expect(po).toMatchObject({ supplier: 'A001', status: 'N', taxCode: 'P02' })
    expect(req.lines[0].poNo).toBe('202611001')
    expect(() => unconfirmDoc(structuredClone(db), 'requisition', 'C311', req.no)).toThrow('已被下列單據引用')

    // 採購單要確認才能進貨
    expect(() => purchaseToReceipt(db, 'A331', po.no, blankReceipt(db, D))).toThrow('尚未確認')
    confirmDoc(db, 'purchase', 'A331', po.no, 'admin')

    // 庫存不足時不能銷貨
    const early = orderToSale(db, 'A221', o.no, blankSale(db, D))
    saveDoc(db, 'sale', early, true, 'admin')
    expect(() => confirmDoc(structuredClone(db), 'sale', 'A231', early.no, 'admin')).toThrow('庫存不足')
    deleteDoc(db, 'sale', 'A231', early.no)

    // 進貨：到貨 60，驗收 55 → 入庫 55，採購單未交 5
    const rc = purchaseToReceipt(db, 'A331', po.no, blankReceipt(db, D))
    rc.lines[0].accepted = 55
    saveDoc(db, 'receipt', rc, true, 'admin')
    confirmDoc(db, 'receipt', 'A341', rc.no, 'admin')
    expect(stockOf(db, '900004', 'P003')).toBe(55)
    expect(po.lines[0]).toMatchObject({ received: 55, closed: false })
    expect(db.items.find(i => i.id === '900004')!.lastCost).toBe(rc.lines[0].price) // 最近進價

    // 銷貨 55（剩 5 待交）
    const s = orderToSale(db, 'A221', o.no, blankSale(db, D))
    s.lines[0].qty = 55
    saveDoc(db, 'sale', s, true, 'admin')
    confirmDoc(db, 'sale', 'A231', s.no, 'admin')
    expect(stockOf(db, '900004', 'P003')).toBe(0)
    expect(order.lines[0]).toMatchObject({ delivered: 55, closed: false })

    // 進貨單被銷貨用掉的庫存不能再取消確認
    expect(() => unconfirmDoc(structuredClone(db), 'receipt', 'A341', rc.no)).toThrow('負數')
    // 銷貨取消確認會把庫存和已交數量還回去
    unconfirmDoc(db, 'sale', 'A231', s.no)
    expect(stockOf(db, '900004', 'P003')).toBe(55)
    expect(order.lines[0].delivered).toBe(0)

    // 整份資料仍然符合 schema
    expect(DBSchema.safeParse(db).success).toBe(true)
  })
})

it('新品號流水號從 900001 起，取最大值 +1', () => {
  const db = DBSchema.parse(seed())
  expect(nextItemNo(db)).toBe('900007') // 預設資料已有 900001～900006
  db.items.push({ ...db.items[0], id: '900020' })
  expect(nextItemNo(db)).toBe('900021')
  db.items = db.items.filter(i => !i.id.startsWith('9'))
  expect(nextItemNo(db)).toBe('900001')
})
