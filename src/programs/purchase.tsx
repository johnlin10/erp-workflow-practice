/* eslint-disable @typescript-eslint/no-explicit-any */
import { blankPurchase, blankReceipt, blankRequisition } from '../domain/blank'
import { maintainReqLine, poRemaining, purchaseToReceipt, round, today, totals } from '../domain/docs'
import { DocProgram, type DocConfig, type FieldDef } from '../ui/DocProgram'
import { names, PK } from '../ui/Picker'
import type { ProgProps } from '../ui/session'
import { C, docBase, docQuery, docTotals, F, lineChange, ph, roText, TAX_TYPES, X } from './common'

type R = any

// ---------- PURI05 請購單建立作業 ----------
const reqCfg: DocConfig = {
  code: 'PURI05',
  ...docBase('requisition'),
  blank: db => blankRequisition(db, today()),
  header: [
    [F.docType('requisition', '請購單別'), { k: 'dept', label: '請購部門', w: 190, pick: { icon: 'tree', cols: [['部門代號', r => r.id]], rows: () => [], val: r => r.id } }, null],
    [{ ...F.docNo('請購單號'), w: 210, with: [roText('版次', '', 80)] }, { k: 'source', label: '來源別', t: 'select', ro: true, w: 440, opts: [['手動輸入', '1.手動輸入'], ['訂單', '2.訂單']] }, roText('列印', '0', 64)],
    [{ ...F.date, w: 210 }, roText('來源單號', '', 540), null],
    [F.plant('廠別'), { k: 'reqDate', label: '請購日期', t: 'ro', w: 210 }, roText('傳送次數', '', 64)],
    [{ ...F.remark, w: 420 }, { ...F.confirmer, w: 210 }, null],
    [F.employee('requester', '請購人員'), { k: '_sign', label: '簽核狀態', t: 'select', ro: true, w: 330, opts: [] }, null],
    [roText('EBC請購單號', '', 420), roText('EBC請購版次', '', 70), null],
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
  },
  onField: (r, k, db) => (k === 'date' ? { ...r, reqDate: r.date } : docBase('requisition').onField!(r, k, db)),
  totals: r => [[['數量合計', r.lines.reduce((s: number, l: R) => s + (l.qty || 0), 0)], ['本幣金額合計', 0]]],
  browse: [['請購單別', r => r.type], ['請購單號', r => r.no], ['單據日期', r => r.date], ['廠別', r => r.plant], ['請購人員', (r, db) => names.employee(db, r.requester)], ['來源', r => r.source], ['確認碼', r => r.status]],
  query: docQuery('請購單別', '請購單號'),
}

// ---------- PURI06 請購單維護作業（逐筆維護請購明細的採購資訊）----------
const flatReq = (db: R) => db.requisitions.filter((r: R) => r.status !== 'V').flatMap((r: R) => r.lines.map((l: R) => ({
  ...l, type: r.type, no: r.no, date: r.date, reqStatus: r.status, plant: r.plant, reqDate: r.reqDate, requester: r.requester, dept: r.dept,
})))
const sel = (k: string, label: string, w: number, opts: [string, string][] = []): FieldDef => ({ k, label, t: 'select', w, opts })
const reqMaintCfg: DocConfig = {
  code: 'PURI06',
  records: flatReq,
  key: r => `${r.type}-${r.no}-${r.seq}`,
  noAdd: true,
  noDelete: true,
  // 依截圖排成三欄：左邊是請購資料（唯讀），中間、右邊是採購資料
  header: [
    [{ k: 'type', label: '請購單號', pk: true, t: 'ro', w: 108, with: [{ k: 'no', label: '', pk: true, t: 'ro', w: 212 }, { k: 'seq', label: '', pk: true, t: 'ro', w: 126 }] },
      F.employee('buyer', '採購人員'), null],
    [{ ...sel('_kind', '類型', 326, [['2', '2:正式品號']]), ro: true }, { ...F.supplier, req: false }, null],
    [{ k: 'item', label: '品號', t: 'ro', w: 460 }, { k: 'warehouse', label: '交貨庫別', pick: PK.warehouse, w: 200 }, { k: '_multi', label: '單身多稅率', t: 'check', ro: true }],
    [{ k: 'name', label: '品名', t: 'ro', w: 460 }, { k: 'poQty', label: '採購數量', t: 'num', w: 200 }, X('採購包裝數量', 170, { t: 'num' })],
    [{ k: 'spec', label: '規格', t: 'ro', w: 460 }, { k: '_poUnit', label: '採購單位', t: 'ro', w: 94, show: r => r.unit }, roText('採購包裝單位', '', 80, [roText('小單位', '', 80)])],
    [{ k: 'date', label: '單據日期', t: 'ro', w: 216 }, X('交易條件', 94, { pick: { icon: 'pick', cols: [['交易條件', r => r.id]], rows: () => [{ id: '1' }], val: r => r.id } }), null],
    [{ k: 'reqDate', label: '請購日期', t: 'ro', w: 216 }, X('稅別碼', 94, { req: true, pick: PK.tax('P') }), null],
    [{ k: 'qty', label: '請購數量', t: 'ro', w: 172 }, sel('_taxType', '課稅別', 294, TAX_TYPES), roText('營業稅率', '. %', 228)],
    [{ k: 'unit', label: '請購單位', t: 'ro', w: 126, with: [roText('請購包裝數量', '0', 160)] }, X('採購幣別', 94, { pick: PK.currency }), { k: '_bill', label: '計價數量', t: 'ro', w: 190, show: r => r.poQty }],
    [roText('小單位', '', 90, [roText('請購包裝單位', '', 126)]), { k: 'price', label: '採購單價', t: 'num', w: 180, mask: 'cost' }, { k: '_billUnit', label: '計價單位', t: 'ro', w: 160, show: r => r.unit }],
    [{ k: 'needDate', label: '需求日期', t: 'ro', w: 216 }, { k: '_amt', label: '採購金額', t: 'ro', w: 190, mask: 'cost', show: r => Math.round(r.poQty * r.price * 100) / 100 }, sel('_inq', '詢價碼', 240)],
    [{ k: 'remark', label: '請購備註', t: 'ro', w: 460 }, { k: 'deliveryDate', label: '交貨日', t: 'date', req: true, w: 192 }, { k: 'urgent', label: '急料', t: 'check' }],
    [roText('最低補量', '', 172), { k: 'poRemark', label: '採購備註', w: 700, span: 2 }],
    [roText('專案代號', '', 336), { k: 'locked', label: '鎖定碼', t: 'check', with: [X('採購碼', 0, { t: 'check' })] }, sel('_close', '結案碼', 260)],
    [null, { k: 'dept', label: '請購部門', t: 'ro', w: 220 }, null],
    [{ k: 'requester', label: '請購人員', t: 'ro', w: 220 }, { k: '_po', label: '採購單號', t: 'ro', w: 400, show: r => (r.poNo ? `${r.poType}-${r.poNo}-${r.poSeq}` : '') }, null],
    [null, X('製造商', 200, { pick: PK.supplier }), null],
    [null, X('承認型號', 490), null],
  ],
  editCheck: r => (r.reqStatus !== 'Y' ? '請購單尚未確認，請先到「請購單建立作業」確認。' : r.poNo ? `此明細已轉採購單 ${r.poType}-${r.poNo}，不可修改。` : null),
  save: (d, r) => {
    const { buyer, supplier, warehouse, poQty, price, deliveryDate, locked, urgent, poRemark } = r
    maintainReqLine(d, r.type, r.no, r.seq, { buyer, supplier, warehouse, poQty, price, deliveryDate, locked, urgent, poRemark })
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
      [F.currency('幣別'), F.taxCodeP, F.payTerm],
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
    [F.docType('receipt', '進貨單別'), sel('_bond', '保稅碼', 300, [['0', '0.依品號預設']])],
    [F.docNo('進貨單號'), F.date],
    [F.supplier, { k: 'receiptDate', label: '進貨日期', t: 'ro', w: 180 }],
    [roText('通知碼', 'N.不通知', 300), null],
  ],
  tabs: [
    { label: '交易資料', rows: [
      [F.plant('廠別'), X('件數', 160, { t: 'num' })],
      [{ k: 'supplierNo', label: '廠商單號', w: 380 }, roText('列印', '0', 60, [roText('傳送次數', '0', 60)])],
      [{ ...F.currency('幣別'), w: 70, with: [{ ...F.rate, label: '匯率' }] }, F.sign],
      [F.payTerm, { ...F.remark, w: 340 }],
      [roText('交易條件', '1', 44, [roText('', '一般交易', 120)]), null],
      [{ k: 'contact', label: '聯絡人', w: 280, pick: { ...PK.employee, icon: 'person', title: '開窗查詢 - 聯絡人' } }, null],
    ] },
    { label: '發票資料', rows: [[F.taxCodeP], [F.taxType], [F.taxRate]] },
    ph('訂金/EBC資料'), ph('資料瀏覽'),
  ],
  lines: {
    cols: [C.seq, C.item, C.name, C.spec, C.qty('進貨數量'), C.unit, { k: 'accepted', label: '驗收數量', w: 110, t: 'num' },
      { k: '_bill', label: '計價數量', w: 110, t: 'num', ro: true, show: l => (l.item ? l.accepted || 0 : '') },
      { k: '_billUnit', label: '計價單位', w: 70, req: true, ro: true, show: l => l.unit ?? '' },
      { k: '_rej', label: '驗退數量', w: 90, t: 'num', ro: true, show: l => (l.item ? (l.qty || 0) - (l.accepted || 0) : '') },
      C.warehouse('庫別'), C.price('進貨單價', 'cost'), C.amount('進貨金額', 'cost'), C.src('採購單別-單號-序號'), C.remark],
    blank: () => ({ seq: '', item: '', name: '', spec: '', unit: '', qty: 0, accepted: 0, price: 0, amount: 0, warehouse: '', remark: '', srcType: '', srcNo: '', srcSeq: '' }),
    // 進貨數量改了，驗收數量預設跟著一樣
    onChange: lineChange('cost', (l, k) => (k === 'qty' ? { ...l, accepted: l.qty, amount: round(l.qty * l.price) } : l)),
  },
  onField: (r, k, db) => {
    r = docBase('receipt').onField!(r, k, db)
    return k === 'date' ? { ...r, receiptDate: r.date } : r
  },
  totals: (r, _db, mask) => {
    const t = totals(r), m = (v: number) => mask('cost', v)
    return [
      [['原幣　進貨金額', m(t.amount)], ['本幣　進貨費用', 0], ['數量合計', t.qty]],
      [['扣款金額', 0], ['貨款金額', m(t.amount * r.rate)]],
      [['貨款金額', m(t.amount)], ['稅額', m(t.tax * r.rate)]],
      [['稅額', m(t.tax)], ['金額合計', m(t.total * r.rate)]],
      [['金額合計', m(t.total)], ['沖自籌額', 0]],
      [['沖自籌額', 0]],
    ]
  },
  copyFrom: {
    labels: ['前置單別', '前置單號'],
    sources: [{ label: '採購單', kind: 'purchase' }, { label: '暫入單' }],
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
