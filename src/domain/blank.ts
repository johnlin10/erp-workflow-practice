import type { DB, DocKind, Quote, Order, Requisition, Purchase, Receipt, Sale } from '../db/schema'
import { peekNo } from './docs'

const firstType = (db: DB, k: DocKind) => db.docTypes.find(t => t.kind === k)?.id ?? ''
const firstPlant = (db: DB) => db.plants[0]?.id ?? ''

function base(db: DB, k: DocKind, date: string) {
  const type = firstType(db, k)
  return {
    type, no: type ? peekNo(db, k, type, date) : '', date, status: 'N' as const,
    confirmer: '', creator: '', remark: '', srcType: '', srcNo: '',
  }
}
function money(db: DB, taxCode = 'S02') {
  const t = db.taxCodes.find(x => x.id === taxCode)
  return { currency: 'NTD', rate: 1, taxCode: t?.id ?? '', taxType: t?.taxType ?? '', taxRate: t?.rate ?? 0, payTerm: '' }
}

export const blankQuote = (db: DB, date: string): Quote => ({
  ...base(db, 'quote', date), ...money(db), customer: '', sales: '', quoteDate: date, customerConfirmed: false, priceTerm: '', lines: [],
})
export const blankOrder = (db: DB, date: string): Order => ({
  ...base(db, 'order', date), ...money(db), customer: '', plant: firstPlant(db), dept: '', sales: '',
  customerPo: '', priceTerm: '', version: 0, transferred: false, noCreditCheck: false, orderDate: date, lines: [],
})
export const blankRequisition = (db: DB, date: string): Requisition => ({
  ...base(db, 'requisition', date), plant: firstPlant(db), dept: '', requester: '', source: '手動輸入', reqDate: date, lines: [],
})
export const blankPurchase = (db: DB, date: string): Purchase => ({
  ...base(db, 'purchase', date), ...money(db, 'P02'), supplier: '', plant: firstPlant(db), buyer: '', poDate: date, lines: [],
})
export const blankReceipt = (db: DB, date: string): Receipt => ({
  ...base(db, 'receipt', date), ...money(db, 'P02'), supplier: '', plant: firstPlant(db), contact: '', supplierNo: '', receiptDate: date, lines: [],
})
export const blankSale = (db: DB, date: string): Sale => ({
  ...base(db, 'sale', date), ...money(db), customer: '', plant: firstPlant(db), dept: '', sales: '', saleDate: date, lines: [],
})
