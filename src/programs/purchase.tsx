/* eslint-disable @typescript-eslint/no-explicit-any */
import { blankPurchase, blankReceipt, blankRequisition } from '../domain/blank'
import { maintainReqLine, poRemaining, purchaseToReceipt, round, today } from '../domain/docs'
import { DocProgram, type DocConfig } from '../ui/DocProgram'
import { names, PK } from '../ui/Picker'
import type { ProgProps } from '../ui/session'
import { C, docBase, docQuery, docTotals, F, lineChange, ph, roText } from './common'

type R = any

// ---------- PURI05 請購單建立作業 ----------
const reqCfg: DocConfig = {
  code: 'PURI05',
  ...docBase('requisition'),
  blank: db => blankRequisition(db, today()),
  header: [
    [F.docType('requisition', '請購單別'), F.date, { k: 'reqDate', label: '請購日期', t: 'date', req: true }],
    [F.docNo('請購單號'), F.plant('廠別'), F.confirmer],
    [F.employee('requester', '請購人員'), { k: 'dept', label: '請購部門', w: 120 }, F.sign],
    [{ k: 'source', label: '來源', t: 'ro', w: 120 }, F.remark, null],
  ],
  lines: {
    cols: [C.seq, C.item, C.name, C.spec, C.unit, C.warehouse('庫別'), C.qty('請購數量'), { ...C.date('needDate', '需求日'), req: true },
      { k: 'supplier', label: '供應廠商', w: 100, pick: PK.supplier }, C.remark, C.src('來源訂單'),
      { k: '_po', label: '採購單號', w: 170, ro: true, show: l => (l.poNo ? `${l.poType}-${l.poNo}-${l.poSeq}` : '') }],
    blank: rec => ({
      seq: '', item: '', name: '', spec: '', unit: '', warehouse: '', qty: 0, needDate: rec.reqDate || rec.date, remark: '',
      buyer: '', supplier: '', poQty: 0, price: 0, deliveryDate: '', locked: false, urgent: false, poRemark: '', closeCode: '',
      poType: '', poNo: '', poSeq: '', srcType: '', srcNo: '', srcSeq: '',
    }),
    // 請購單沒有金額；選品號時帶出主供應商、成本、庫別，採購數量預設等於請購數量
    onChange: (l, k, db) => {
      if (k === 'item') {
        const it = db.items.find(i => i.id === l.item)
        if (it) l = { ...l, name: it.name, spec: it.spec, unit: it.unit, warehouse: l.warehouse || it.mainWarehouse, supplier: l.supplier || it.mainSupplier, price: it.cost }
      }
      if (k === 'qty' || k === 'item') l.poQty = l.qty
      if (k === 'needDate' || k === 'item') l.deliveryDate = l.needDate
      return l
    },
    height: 260,
  },
  totals: r => [[['總數量', r.lines.reduce((s: number, l: R) => s + (l.qty || 0), 0)]]],
  browse: [['請購單別', r => r.type], ['請購單號', r => r.no], ['單據日期', r => r.date], ['廠別', r => r.plant], ['請購人員', (r, db) => names.employee(db, r.requester)], ['來源', r => r.source], ['確認碼', r => r.status]],
  query: docQuery('請購單別', '請購單號'),
}

// ---------- PURI06 請購單維護作業（逐筆維護請購明細的採購資訊）----------
const flatReq = (db: R) => db.requisitions.filter((r: R) => r.status !== 'V').flatMap((r: R) => r.lines.map((l: R) => ({
  ...l, type: r.type, no: r.no, reqStatus: r.status, plant: r.plant, reqDate: r.reqDate, requester: r.requester,
})))
const reqMaintCfg: DocConfig = {
  code: 'PURI06',
  records: flatReq,
  key: r => `${r.type}-${r.no}-${r.seq}`,
  noAdd: true,
  noDelete: true,
  header: [
    [{ k: 'type', label: '請購單別', pk: true, t: 'ro', w: 90, name: (db, r) => names.docType(db, r.type) }, { k: 'reqDate', label: '請購日期', t: 'ro', w: 120 }, { k: '_st', label: '確認碼', t: 'ro', w: 100, show: r => (r.reqStatus === 'Y' ? 'Y:已確認' : 'N:未確認') }],
    [{ k: 'no', label: '請購單號', pk: true, t: 'ro', w: 150 }, { k: 'seq', label: '序號', pk: true, t: 'ro', w: 70 }, { k: 'plant', label: '廠別', t: 'ro', w: 90, name: (db, r) => names.plant(db, r.plant) }],
    [{ k: 'item', label: '品號', t: 'ro', w: 130 }, { k: 'name', label: '品名', t: 'ro', w: 220 }, { k: 'spec', label: '規格', t: 'ro', w: 200 }],
    [{ k: 'qty', label: '請購數量', t: 'ro', w: 100 }, { k: 'unit', label: '單位', t: 'ro', w: 60 }, { k: 'needDate', label: '需求日', t: 'ro', w: 120 }],
  ],
  tabs: [
    { label: '採購資訊', rows: [
      [F.employee('buyer', '採購人員'), { ...F.supplier, req: true }, { k: 'locked', label: '鎖定碼', t: 'check' }],
      [{ k: 'poQty', label: '採購數量', t: 'num', w: 110 }, { k: 'price', label: '採購單價', t: 'num', w: 110, mask: 'cost' }, { k: 'urgent', label: '急料', t: 'check' }],
      [{ k: 'deliveryDate', label: '交貨日', t: 'date' }, { k: 'warehouse', label: '庫別', t: 'ro', w: 80 }, roText('結案碼', '', 60)],
      [{ k: 'poRemark', label: '採購備註', w: 300 }, { k: '_po', label: '採購單號', t: 'ro', w: 190, show: r => (r.poNo ? `${r.poType}-${r.poNo}-${r.poSeq}` : '') }, null],
    ] },
    { label: '來源資料', rows: [[{ k: '_src', label: '來源訂單', t: 'ro', w: 220, show: r => (r.srcType ? `${r.srcType}-${r.srcNo}-${r.srcSeq}` : '') }], [{ k: 'remark', label: '請購備註', t: 'ro', w: 300 }]] },
    ph('其他資料'),
  ],
  editCheck: r => (r.reqStatus !== 'Y' ? '請購單尚未確認，請先到「請購單建立作業」確認。' : r.poNo ? `此明細已轉採購單 ${r.poType}-${r.poNo}，不可修改。` : null),
  save: (d, r) => {
    const { buyer, supplier, poQty, price, deliveryDate, locked, urgent, poRemark } = r
    maintainReqLine(d, r.type, r.no, r.seq, { buyer, supplier, poQty, price, deliveryDate, locked, urgent, poRemark })
    return r
  },
  browse: [['請購單別', r => r.type], ['請購單號', r => r.no], ['序號', r => r.seq], ['品號', r => r.item], ['品名', r => r.name], ['採購數量', r => r.poQty], ['供應廠商', r => r.supplier], ['交貨日', r => r.deliveryDate], ['鎖定', r => (r.locked ? 'Y' : 'N')], ['採購單號', r => r.poNo]],
  query: [['請購單別', r => r.type], ['請購單號', r => r.no], ['品號', r => r.item]],
}

// ---------- PURI07 採購單建立作業 ----------
const poCfg: DocConfig = {
  code: 'PURI07',
  ...docBase('purchase'),
  blank: db => blankPurchase(db, today()),
  header: [
    [F.docType('purchase', '採購單別'), F.date, { k: 'poDate', label: '採購日期', t: 'date', req: true }],
    [F.docNo('採購單號'), F.supplier, F.confirmer],
    [F.plant('廠別'), F.employee('buyer', '採購人員'), F.sign],
  ],
  tabs: [
    { label: '交易資料', rows: [
      [F.currency('幣別'), F.taxCode, F.payTerm],
      [F.rate, F.taxType, F.remark],
      [null, F.taxRate, null],
    ] },
    ph('其他資料'),
  ],
  lines: {
    cols: [C.seq, C.item, C.name, C.spec, C.warehouse('交貨庫別'), C.qty('採購數量'), C.unit, C.price('採購單價', 'cost'), C.amount('採購金額', 'cost'),
      { ...C.date('deliveryDate', '預交日'), req: true }, { k: 'received', label: '已交數量', w: 90, t: 'num', ro: true }, { k: 'closed', label: '結案', w: 50, t: 'check', ro: true },
      C.src('請購單別-單號-序號'), C.remark],
    blank: rec => ({ seq: '', item: '', name: '', spec: '', unit: '', qty: 0, price: 0, amount: 0, warehouse: '', deliveryDate: rec.poDate || rec.date, received: 0, closed: false, remark: '', srcType: '', srcNo: '', srcSeq: '' }),
    onChange: lineChange('cost'),
    height: 220,
  },
  onField: (r, k, db) => {
    r = docBase('purchase').onField!(r, k, db)
    return k === 'date' ? { ...r, poDate: r.date } : r
  },
  totals: docTotals(['採購金額', '稅額', '合計']),
  browse: [['採購單別', r => r.type], ['採購單號', r => r.no], ['單據日期', r => r.date], ['供應廠商', r => r.supplier], ['廠商簡稱', (r, db) => names.supplier(db, r.supplier)], ['確認碼', r => r.status]],
  query: docQuery('採購單別', '採購單號'),
}

// ---------- PURI09 進貨單建立作業 ----------
const rcCfg: DocConfig = {
  code: 'PURI09',
  ...docBase('receipt'),
  blank: db => blankReceipt(db, today()),
  header: [
    [F.docType('receipt', '進貨單別'), F.date, { k: 'receiptDate', label: '進貨日期', t: 'date', req: true }],
    [F.docNo('進貨單號'), F.supplier, F.confirmer],
    [F.plant('廠別'), { k: 'contact', label: '聯絡人', w: 120 }, F.sign],
    [{ k: 'supplierNo', label: '廠商單號', w: 160 }, roText('產生分錄', 'N', 40), null],
  ],
  tabs: [
    { label: '交易資料', rows: [
      [F.currency('幣別'), F.taxCode, F.payTerm],
      [F.rate, F.taxType, F.remark],
      [{ k: '_src', label: '前置單據', t: 'ro', w: 200, show: r => (r.srcType ? `${r.srcType}-${r.srcNo}` : '') }, F.taxRate, null],
    ] },
    ph('發票資料'), ph('其他資料'),
  ],
  lines: {
    cols: [C.seq, C.item, C.name, C.spec, C.warehouse('庫別'), C.qty('進貨數量'), { k: 'accepted', label: '驗收數量', w: 100, t: 'num' },
      { k: '_rej', label: '驗退數量', w: 90, t: 'num', ro: true, show: l => (l.item ? (l.qty || 0) - (l.accepted || 0) : '') },
      { k: '_bill', label: '計價數量', w: 90, t: 'num', ro: true, show: l => (l.item ? l.accepted || 0 : '') },
      C.unit, C.price('進貨單價', 'cost'), C.amount('進貨金額', 'cost'), C.src('採購單別-單號-序號'), C.remark],
    blank: () => ({ seq: '', item: '', name: '', spec: '', unit: '', qty: 0, accepted: 0, price: 0, amount: 0, warehouse: '', remark: '', srcType: '', srcNo: '', srcSeq: '' }),
    // 進貨數量改了，驗收數量預設跟著一樣
    onChange: lineChange('cost', (l, k) => (k === 'qty' ? { ...l, accepted: l.qty, amount: round(l.qty * l.price) } : l)),
    height: 220,
  },
  onField: (r, k, db) => {
    r = docBase('receipt').onField!(r, k, db)
    return k === 'date' ? { ...r, receiptDate: r.date } : r
  },
  totals: docTotals(['進貨金額', '稅額', '合計']),
  copyFrom: {
    labels: ['前置單別', '前置單號'],
    sources: [{ label: '採購單', kind: 'purchase' }, { label: '託外採購單' }],
    extraCheck: '複製前置匯率',
    candidates: db => ({
      cols: [['廠商代號', r => r.supplier], ['廠商簡稱', r => names.supplier(db, r.supplier)], ['採購日期', r => r.date], ['採購單別', r => r.type], ['採購單號', r => r.no], ['單據名稱', r => names.docType(db, r.type)]],
      rows: db.purchases.filter(p => p.status === 'Y' && p.lines.some(l => poRemaining(l) > 0)),
    }),
    apply: (db, rec, _k, type, no) => purchaseToReceipt(db, type, no, rec),
  },
  browse: [['進貨單別', r => r.type], ['進貨單號', r => r.no], ['單據日期', r => r.date], ['供應廠商', r => r.supplier], ['廠商簡稱', (r, db) => names.supplier(db, r.supplier)], ['確認碼', r => r.status]],
  query: docQuery('進貨單別', '進貨單號'),
}

export const PURI05 = ({ close }: ProgProps) => <DocProgram cfg={reqCfg} close={close} />
export const PURI06 = ({ close }: ProgProps) => <DocProgram cfg={reqMaintCfg} close={close} />
export const PURI07 = ({ close }: ProgProps) => <DocProgram cfg={poCfg} close={close} />
export const PURI09 = ({ close }: ProgProps) => <DocProgram cfg={rcCfg} close={close} />
