/* eslint-disable @typescript-eslint/no-explicit-any */
import { blankOrder, blankQuote, blankSale } from '../domain/blank'
import {
  changeKey, confirmOrderChange, deleteOrderChange, newOrderChange, orderRemaining, orderToSale, quoteToOrder,
  saveOrderChange, today, totals,
} from '../domain/docs'
import { stockOf } from '../domain/stock'
import { DocProgram, type DocConfig } from '../ui/DocProgram'
import { err } from '../ui/msg'
import { names, PK } from '../ui/Picker'
import type { ProgProps } from '../ui/session'
import { C, docBase, docQuery, docTotals, dueDefault, F, headerChange, lineChange, pad4, ph, roText, X } from './common'

type R = any
const docName = (db: R, t: string) => names.docType(db, t)

// ---------- COPI05 報價單建立作業 ----------
const quoteCfg: DocConfig = {
  code: 'COPI05',
  ...docBase('quote'),
  blank: db => blankQuote(db, today()),
  header: [
    [F.docType('quote', '報價單別'), F.date, { k: 'quoteDate', label: '報價日期', t: 'ro', w: 130 }],
    [F.docNo('報價單號'), { k: '_ver', label: '版次', t: 'ro', w: 72, show: () => '', with: [{ k: 'customerConfirmed', label: '客戶確認', t: 'check' }] }, F.confirmer],
  ],
  tabs: [
    { label: '交易資料', rows: [
      [F.customer, F.taxCode, null],
      [F.employee('sales', '業務人員'), F.taxType, X('列印格式', 200, { t: 'select', opts: [] })],
      [F.currency('幣別'), F.taxRate, roText('傳送次數', '', 60, [roText('列印', '', 60)])],
      [F.rate, { k: 'priceTerm', label: '價格條件', w: 220 }, F.sign],
      [{ k: '_multi', label: '單身多稅率', t: 'check', ro: true }, F.payTerm, null],
    ] },
    { label: '其他資料', rows: [[F.remark]] },
    ph('國外資料'), ph('資料瀏覽'),
  ],
  onField: (r, k, db) => {
    r = headerChange(r, k, db)
    return k === 'date' ? { ...r, quoteDate: r.date } : r
  },
  lines: {
    cols: [C.seq, { k: '_bizItem', label: '業務品號', w: 120, ro: true, show: () => '' }, C.item, C.name, C.spec, C.qty('數量'), C.unit, C.price('單價'), C.amount('金額'), C.remark],
    blank: () => ({ seq: '', item: '', name: '', spec: '', unit: '', qty: 0, price: 0, amount: 0, remark: '' }),
    onChange: lineChange('price'),
    height: 220,
  },
  totals: docTotals(['報價金額', '稅額', '合計']),
  browse: [['報價單別', r => r.type], ['報價單號', r => r.no], ['單據日期', r => r.date], ['客戶代號', r => r.customer], ['客戶簡稱', (r, db) => names.customer(db, r.customer)], ['確認碼', r => r.status]],
  query: docQuery('報價單別', '報價單號'),
}

// ---------- COPI06 客戶訂單建立作業 ----------
const orderCfg: DocConfig = {
  code: 'COPI06',
  ...docBase('order'),
  blank: db => blankOrder(db, today()),
  header: [
    [F.docType('order', '訂單單別'), F.date, { k: '_tr', label: '拋轉狀態', t: 'ro', w: 180, show: r => (r.transferred ? 'Y:已拋轉' : 'N:未拋轉') }],
    [F.docNo('訂單單號'), F.customer, { k: 'orderDate', label: '訂單日期', t: 'ro', w: 180 }],
    [X('流程代號', 70, { pick: { icon: 'pick', cols: [['流程代號', r => r.id]], rows: () => [], val: r => r.id } }), { k: '_ver', label: '版次', t: 'ro', w: 80, show: r => pad4(r.version), with: [{ k: 'noCreditCheck', label: '不控管信用額度', t: 'check' }] }, F.confirmer],
    [X('收入遞延天數', 70, { t: 'num' }), null, roText('EBO拋轉狀態', '不需拋轉', 230)],
  ],
  tabs: [
    { label: '交易資料一', rows: [
      [{ k: 'dept', label: '部門代號', w: 200, pick: { icon: 'tree', cols: [['部門代號', r => r.id]], rows: () => [], val: r => r.id } }, F.taxCode, null],
      [F.employee('sales', '業務人員'), F.taxType, { k: '_multi', label: '單身多稅率', t: 'check', ro: true }],
      [F.plant('出貨廠別'), F.taxRate, roText('傳送次數', '', 170)],
      [F.currency('交易幣別'), { k: '_dep', label: '訂金分批', t: 'check', ro: true }, roText('列印', '', 80)],
      [F.rate, roText('訂金比率', '. %', 170), F.sign],
      [{ k: 'customerPo', label: '客戶單號', w: 360 }, F.payTerm, null],
      [null, { k: 'priceTerm', label: '價格條件', w: 700, span: 2 }],
    ] },
    { label: '交易資料二', rows: [[F.remark], [{ k: '_src', label: '前置單據', t: 'ro', w: 220, show: r => (r.srcType ? `${r.srcType}-${r.srcNo}` : '') }]] },
    { label: '送貨資料', rows: [[{ k: '_addr', label: '送貨地址', t: 'ro', w: 420, show: (r, db) => db.customers.find((c: R) => c.id === r.customer)?.address ?? '' }]] },
    ph('國外訂單一'), ph('國外訂單二'), ph('國外備註'), ph('嘜頭資料'), ph('多角貿易'),
  ],
  onField: (r, k, db) => {
    r = headerChange(r, k, db)
    return k === 'date' ? { ...r, orderDate: r.date } : r
  },
  lines: {
    cols: [C.seq, { k: '_bizItem', label: '業務品號', w: 120, ro: true, show: () => '' }, C.item, C.name, C.spec, C.warehouse('出貨庫別'), C.qty('訂單數量'), C.unit, C.price('單價'), C.amount('金額'),
      { ...C.date('dueDate', '預交日'), req: true }, { k: 'delivered', label: '已交數量', w: 90, t: 'num', ro: true }, { k: 'closed', label: '結案', w: 50, t: 'check', ro: true },
      C.src('前置單據'), C.remark],
    blank: (rec) => ({ seq: '', item: '', name: '', spec: '', unit: '', qty: 0, price: 0, amount: 0, warehouse: '', dueDate: dueDefault(rec), delivered: 0, closed: false, remark: '', srcType: '', srcNo: '', srcSeq: '' }),
    onChange: lineChange('price'),
    height: 200,
  },
  totals: (r, _db, mask) => {
    const t = totals(r)
    return [[['訂單金額', mask('price', t.amount)], ['總數量', t.qty]], [['訂單稅額', mask('price', t.tax)], ['總毛重(Kg)', 0]], [['合計', mask('price', t.total)], ['總材積(CUFT)', 0]]]
  },
  copyFrom: {
    labels: ['前置單別', '前置單號'],
    sources: [{ label: '報價單', kind: 'quote' }, { label: '合約訂單' }],
    candidates: db => ({
      cols: [['客戶代號', r => r.customer], ['客戶名稱', r => names.customer(db, r.customer)], ['報價日期', r => r.date], ['報價單別', r => r.type], ['報價單號', r => r.no], ['單據名稱', r => docName(db, r.type)]],
      rows: db.quotes.filter(q => q.status === 'Y'),
    }),
    apply: (db, rec, _k, type, no) => quoteToOrder(db, type, no, rec),
  },
  browse: [['訂單單別', r => r.type], ['訂單單號', r => r.no], ['單據日期', r => r.date], ['客戶代號', r => r.customer], ['客戶簡稱', (r, db) => names.customer(db, r.customer)], ['版次', r => pad4(r.version)], ['確認碼', r => r.status], ['拋轉狀態', r => (r.transferred ? 'Y' : 'N')]],
  query: docQuery('訂單單別', '訂單單號'),
}

// ---------- COPI07 訂單變更單建立作業 ----------
const openOrders = (db: R) => db.orders.filter((o: R) => o.status === 'Y' && o.lines.some((l: R) => orderRemaining(l) > 0))
const changeCfg: DocConfig = {
  code: 'COPI07',
  records: db => db.orderChanges,
  key: changeKey,
  status: r => r.status,
  blank: () => ({
    orderType: '', orderNo: '', ver: 0, date: today(), status: 'N', confirmer: '', creator: '', reason: '', closeAll: false,
    customer: '', dept: '', sales: '', customerPo: '', priceTerm: '', payTerm: '', currency: '', rate: 1, taxCode: '', taxType: '', taxRate: 0, lines: [],
  }),
  header: [
    [{
      k: 'orderType', label: '訂單單別', pk: true, w: 90, ro: (_r, m) => m !== 'add',
      pick: { title: '開窗查詢 - 已確認訂單', icon: 'pick', val: r => r.type, rows: openOrders, cols: [['訂單單別', r => r.type], ['訂單單號', r => r.no], ['客戶代號', r => r.customer], ['訂單日期', r => r.date], ['版次', r => pad4(r.version)]] },
      pickApply: (r, row, db) => { try { return newOrderChange(db, row.type, row.no, r.date || today()) } catch (e) { err(e); return r } },
    }, { k: 'customer', label: '客戶代號', t: 'ro', w: 150, name: (db, r) => names.customer(db, r.customer) }, { k: '_cdate', label: '變更日期', t: 'ro', w: 130, show: r => r.date }],
    [{ k: 'orderNo', label: '訂單單號', pk: true, w: 200, ro: (_r, m) => m !== 'add' }, { k: '_odate', label: '訂單日期', t: 'ro', w: 150, show: (r, db) => db.orders.find((o: R) => o.type === r.orderType && o.no === r.orderNo)?.date ?? '' }, F.confirmer],
    [{ k: 'ver', label: '變更版次', pk: true, t: 'ro', w: 96, show: r => (r.orderNo ? pad4(r.ver) : ''), with: [{ k: 'closeAll', label: '整張結案', t: 'check' }] }, { k: '_dep', label: '訂金分批', t: 'check', ro: true, with: [{ k: '_noc', label: '不控管信用額度', t: 'check', ro: true }] }, roText('', '', 130)],
    [{ ...F.date, w: 130 }, { k: 'reason', label: '變更原因', req: true, w: 260 }, F.sign],
    [X('收入遞延天數', 130, { t: 'num' }), null, roText('EBO拋轉狀態', '不需拋轉', 250)],
  ],
  tabs: [
    { label: '交易資料一', rows: [
      [{ k: 'dept', label: '部門代號', w: 150 }, { k: 'customerPo', label: '客戶單號', w: 280 }, { k: '_multi', label: '單身多稅率', t: 'check', ro: true }],
      [F.employee('sales', '業務人員'), { k: 'priceTerm', label: '價格條件', w: 230 }, roText('傳送次數', '', 64)],
      [{ k: '_plant', label: '出貨廠別', t: 'ro', w: 100, show: (r, db) => db.orders.find((o: R) => o.type === r.orderType && o.no === r.orderNo)?.plant ?? '' }, F.payTerm, roText('列印', '', 64)],
      [{ k: 'currency', label: '交易幣別', req: true, pick: PK.currency, w: 70 }, F.rate, roText('訂金比率', '. %', 130)],
      [F.taxCode, F.taxType, F.taxRate],
    ] },
    ph('交易資料二'), ph('送貨資料'), ph('國外訂單一'), ph('國外訂單二'), ph('國外備註'), ph('嘜頭資料'),
  ],
  onField: (r, k, db) => {
    // 直接輸入訂單單號（不用開窗）時也帶出原訂單內容
    if (k === 'orderNo' && r.orderNo) {
      const o = db.orders.find((x: R) => x.no === r.orderNo && (!r.orderType || x.type === r.orderType))
      if (o) { try { return newOrderChange(db, o.type, o.no, r.date || today()) } catch (e) { err(e) } }
    }
    return headerChange(r, k, db)
  },
  lines: {
    cols: [C.seq, { k: 'origSeq', label: '原序號', w: 70, ro: true, req: true }, C.item, C.name, C.spec, C.warehouse('出貨庫別'), C.qty('訂單數量'), C.unit, C.price('單價'), C.amount('金額'), { ...C.date('dueDate', '預交日'), req: true }, C.remark],
    blank: rec => ({ seq: '', origSeq: '', item: '', name: '', spec: '', unit: '', qty: 0, price: 0, amount: 0, warehouse: '', dueDate: dueDefault(rec), remark: '' }),
    onChange: lineChange('price'),
    editable: r => !!r?.orderNo,
    height: 200,
  },
  save: (d, r, isNew, user) => { if (!r.orderNo) throw new Error('請先選擇要變更的訂單單號'); if (!r.reason.trim()) throw new Error('請輸入變更原因'); saveOrderChange(d, r, isNew, user); return r },
  remove: (d, r) => deleteOrderChange(d, changeKey(r)),
  confirm: (d, r, user) => confirmOrderChange(d, changeKey(r), user),
  totals: (r, _db, mask) => { const t = totals(r); return [[['訂單金額', mask('price', t.amount)], ['總數量', t.qty]], [['訂單稅額', mask('price', t.tax)], ['合計', mask('price', t.total)]]] },
  browse: [['訂單單別', r => r.orderType], ['訂單單號', r => r.orderNo], ['變更版次', r => pad4(r.ver)], ['單據日期', r => r.date], ['變更原因', r => r.reason], ['確認碼', r => r.status]],
  query: [['訂單單別', r => r.orderType], ['訂單單號', r => r.orderNo], ['變更版次', r => pad4(r.ver)]],
}

// ---------- COPI08 銷貨單建立作業 ----------
const saleCfg: DocConfig = {
  code: 'COPI08',
  ...docBase('sale'),
  blank: db => blankSale(db, today()),
  header: [
    [F.docType('sale', '銷貨單別'), F.date, { k: 'saleDate', label: '銷貨日期', t: 'ro', w: 120 }, { k: '_g1', label: '產生分錄-收入', t: 'check', ro: true }],
    [F.docNo('銷貨單號'), F.customer, null, { k: '_g2', label: '產生分錄-成本', t: 'check', ro: true }],
    [X('流程代號', 80), { k: '_noc', label: '不控管信用額度', t: 'check', ro: true }, roText('拋轉狀態', 'N:未拋轉', 260), null],
    [null, { k: '_cash', label: '現銷', t: 'check', ro: true }, roText('EBO拋轉狀態', '不需拋轉', 260), null],
  ],
  tabs: [
    { label: '交易資料', rows: [
      [{ k: 'dept', label: '部門代號', w: 120 }, F.currency('幣別'), F.sign],
      [F.employee('sales', '業務人員'), F.rate, F.confirmer],
      [F.plant('出貨廠別'), roText('保稅碼', '0.依品號預設', 200), null],
      [F.payTerm, F.remark, null],
      [roText('交易條件', '1  一般交易', 140), roText('件數', '0', 80), null],
      [roText('列印', '0', 60), roText('發票列印', '0', 60), roText('傳送次數', '0', 60)],
    ] },
    ph('送貨資料'),
    { label: '發票資料(一)', rows: [[F.taxCode], [F.taxType], [F.taxRate]] },
    ph('發票資料(二)'), ph('其他資料'), ph('訂金/派車資料'),
  ],
  onField: (r, k, db) => {
    r = headerChange(r, k, db)
    return k === 'date' ? { ...r, saleDate: r.date } : r
  },
  lines: {
    cols: [C.seq, { k: '_bizItem', label: '業務品號', w: 120, ro: true, show: () => '' }, C.item, C.name, C.spec, C.warehouse('庫別'), C.qty('數量'), C.unit, C.price('單價'), C.amount('金額'),
      { k: '_stock', label: '庫存數量', w: 90, t: 'num', ro: true, show: (l, _r, db) => (l.item ? stockOf(db, l.item, l.warehouse) : '') }, C.src('訂單單別-單號-序號'), C.remark],
    blank: () => ({ seq: '', item: '', name: '', spec: '', unit: '', qty: 0, price: 0, amount: 0, warehouse: '', remark: '', srcType: '', srcNo: '', srcSeq: '' }),
    onChange: lineChange('price'),
    height: 200,
  },
  totals: (r, _db, mask) => {
    const t = totals(r)
    return [
      [['原幣銷貨金額', mask('price', t.amount)], ['原幣銷貨稅額', mask('price', t.tax)], ['原幣合計', mask('price', t.total)]],
      [['本幣銷貨金額', mask('price', t.amount * r.rate)], ['本幣銷貨稅額', mask('price', t.tax * r.rate)], ['本幣合計', mask('price', t.total * r.rate)]],
      [['總數量', t.qty]],
    ]
  },
  copyFrom: {
    labels: ['來源單別', '來源單號'],
    sources: [{ label: '訂單', kind: 'order' }, { label: '暫出單' }, { label: '報價單' }],
    extraSelect: '選擇銷貨單價來源',
    candidates: db => ({
      cols: [['客戶代號', r => r.customer], ['客戶名稱', r => names.customer(db, r.customer)], ['訂單日期', r => r.date], ['訂單單別', r => r.type], ['訂單單號', r => r.no], ['單據名稱', r => docName(db, r.type)]],
      rows: openOrders(db),
    }),
    apply: (db, rec, _k, type, no) => orderToSale(db, type, no, rec),
  },
  browse: [['銷貨單別', r => r.type], ['銷貨單號', r => r.no], ['單據日期', r => r.date], ['客戶代號', r => r.customer], ['客戶簡稱', (r, db) => names.customer(db, r.customer)], ['確認碼', r => r.status]],
  query: docQuery('銷貨單別', '銷貨單號'),
}

export const COPI05 = ({ close }: ProgProps) => <DocProgram cfg={quoteCfg} close={close} />
export const COPI06 = ({ close }: ProgProps) => <DocProgram cfg={orderCfg} close={close} />
export const COPI07 = ({ close }: ProgProps) => <DocProgram cfg={changeCfg} close={close} />
export const COPI08 = ({ close }: ProgProps) => <DocProgram cfg={saleCfg} close={close} />
