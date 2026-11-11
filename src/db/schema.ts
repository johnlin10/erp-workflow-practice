import { z } from 'zod'

// 狀態：N 未確認、Y 已確認、V 作廢
export const Status = z.enum(['N', 'Y', 'V'])
export type Status = z.infer<typeof Status>

export const DocKind = z.enum(['quote', 'order', 'requisition', 'purchase', 'receipt', 'sale'])
export type DocKind = z.infer<typeof DocKind>

const str = z.string()
const num = z.number()
const bool = z.boolean()

// ---------- 基本資料 ----------
export const User = z.object({
  id: str, name: str, email: str, password: str,
  locked: bool, expiry: str, companies: str,
})
export const Visibility = z.enum(['general', 'readonly', 'hidden'])
export const PermLine = z.object({
  program: str, run: bool,
  add: bool, query: bool, edit: bool, del: bool,
  confirm: bool, unconfirm: bool, void: bool, output: bool,
  cost: Visibility, price: Visibility,
  more: z.record(z.string(), z.boolean()).default({}), // 資料管制/設計/群組/他組/附件權限：只存不檢查
})
export const PermSet = z.object({
  userId: str, group: str, dept: str, remark: str, superuser: bool,
  lines: z.array(PermLine),
})
export const Plant = z.object({ id: str, name: str })
export const Warehouse = z.object({ id: str, name: str, plant: str, kind: str.default('1') }) // kind 庫存性質：1 存貨倉、2 非存貨倉
export const DocType = z.object({ id: str, name: str, kind: DocKind })
export const Employee = z.object({ id: str, name: str, dept: str })
export const Currency = z.object({ id: str, name: str, rate: num })
export const TaxCode = z.object({ id: str, name: str, taxType: str, rate: num })
/** 基本資料畫面上其他沒有流程用途的欄位（電話二、資本額、地址…），照畫面欄位名稱存起來 */
const ext = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
export const Item = z.object({
  id: str, name: str, spec: str, unit: str,
  mainWarehouse: str, mainSupplier: str, leadDays: num,
  price: num, cost: num, remark: str,
  acct: str.default('01'), // 會計（品號類別代號，見 ITEM_CATS）
  lastCost: num.default(0), retail: num.default(0), floorPrice: num.default(0), // 最近進價（進貨確認時更新）、零售價、業務底價
  ext,
})
export const Customer = z.object({
  id: str, short: str, name: str, enName: str,
  owner: str, contact: str, tel: str, fax: str, email: str, taxId: str,
  currency: str, taxCode: str, payTerm: str, sales: str, dept: str,
  creditLimit: num, address: str,
  ext,
})
export const Supplier = z.object({
  id: str, short: str, name: str, tel: str, contact: str, taxId: str,
  currency: str, payTerm: str,
  taxCode: str.default('P02'), // 採購單據預設的稅別碼
  ext,
})

// ---------- 單據 ----------
const docBase = {
  type: str, no: str, date: str, status: Status,
  confirmer: str, creator: str, remark: str,
  srcType: str, srcNo: str,
}
const src = { srcType: str, srcNo: str, srcSeq: str }
const lineBase = { seq: str, item: str, name: str, spec: str, unit: str, qty: num, price: num, amount: num }
const money = { currency: str, rate: num, taxCode: str, taxType: str, taxRate: num, payTerm: str }

export const QuoteLine = z.object({
  ...lineBase, remark: str,
  shipDate: str.default(''), effDate: str.default(''), expDate: str.default(''), // 預計出貨日、生效日、失效日（舊資料沒有）
})
export const Quote = z.object({
  ...docBase, ...money, customer: str, sales: str,
  quoteDate: str, customerConfirmed: bool, priceTerm: str,
  lines: z.array(QuoteLine),
})

export const OrderLine = z.object({
  ...lineBase, ...src, warehouse: str, dueDate: str, delivered: num, closed: bool, remark: str,
})
export const Order = z.object({
  ...docBase, ...money, customer: str, plant: str, dept: str, sales: str,
  customerPo: str, priceTerm: str, version: num, transferred: bool, noCreditCheck: bool,
  orderDate: str, lines: z.array(OrderLine),
})

export const OrderChangeLine = z.object({
  ...lineBase, origSeq: str, warehouse: str, dueDate: str, remark: str,
})
export const OrderChange = z.object({
  orderType: str, orderNo: str, ver: num, date: str, status: Status,
  confirmer: str, creator: str, reason: str, closeAll: bool,
  customer: str, dept: str, sales: str, customerPo: str, priceTerm: str, payTerm: str,
  currency: str, rate: num, taxCode: str, taxType: str, taxRate: num,
  lines: z.array(OrderChangeLine),
})

export const ReqLine = z.object({
  seq: str, item: str, name: str, spec: str, unit: str, warehouse: str,
  qty: num, needDate: str, remark: str,
  buyer: str, supplier: str, poQty: num, price: num, deliveryDate: str,
  locked: bool, urgent: bool, poRemark: str, closeCode: str,
  poType: str, poNo: str, poSeq: str,
  ...src,
})
export const Requisition = z.object({
  ...docBase, plant: str, dept: str, requester: str, source: str,
  reqDate: str, lines: z.array(ReqLine),
})

export const PurchaseLine = z.object({
  ...lineBase, ...src, warehouse: str, deliveryDate: str, received: num, closed: bool, remark: str,
})
export const Purchase = z.object({
  ...docBase, ...money, supplier: str, plant: str, buyer: str,
  poDate: str, lines: z.array(PurchaseLine),
})

export const ReceiptLine = z.object({
  ...lineBase, ...src, warehouse: str, accepted: num, remark: str,
})
export const Receipt = z.object({
  ...docBase, ...money, supplier: str, plant: str, contact: str, supplierNo: str,
  receiptDate: str, lines: z.array(ReceiptLine),
})

export const SaleLine = z.object({ ...lineBase, ...src, warehouse: str, remark: str })
export const Sale = z.object({
  ...docBase, ...money, customer: str, plant: str, dept: str, sales: str,
  saleDate: str, lines: z.array(SaleLine),
})

// ---------- 其他 ----------
export const StockMove = z.object({
  date: str, item: str, warehouse: str, qty: num,
  docKind: DocKind, docType: str, docNo: str, seq: str,
})
export const Job = z.object({
  id: str, program: str, name: str, mode: str,
  params: z.array(z.tuple([str, str])),
  status: str, user: str, queued: str, start: str, end: str, result: str,
})

export const DB = z.object({
  schemaVersion: z.literal(1),
  company: str,
  users: z.array(User),
  perms: z.array(PermSet),
  plants: z.array(Plant),
  warehouses: z.array(Warehouse),
  docTypes: z.array(DocType),
  employees: z.array(Employee),
  currencies: z.array(Currency),
  taxCodes: z.array(TaxCode),
  items: z.array(Item),
  customers: z.array(Customer),
  suppliers: z.array(Supplier),
  quotes: z.array(Quote),
  orders: z.array(Order),
  orderChanges: z.array(OrderChange),
  requisitions: z.array(Requisition),
  purchases: z.array(Purchase),
  receipts: z.array(Receipt),
  sales: z.array(Sale),
  stock: z.array(StockMove),
  jobs: z.array(Job),
  counters: z.record(z.string(), z.number()),
})

export type User = z.infer<typeof User>
export type PermLine = z.infer<typeof PermLine>
export type PermSet = z.infer<typeof PermSet>
export type Item = z.infer<typeof Item>
export type Customer = z.infer<typeof Customer>
export type Supplier = z.infer<typeof Supplier>
export type Quote = z.infer<typeof Quote>
export type QuoteLine = z.infer<typeof QuoteLine>
export type Order = z.infer<typeof Order>
export type OrderLine = z.infer<typeof OrderLine>
export type OrderChange = z.infer<typeof OrderChange>
export type OrderChangeLine = z.infer<typeof OrderChangeLine>
export type Requisition = z.infer<typeof Requisition>
export type ReqLine = z.infer<typeof ReqLine>
export type Purchase = z.infer<typeof Purchase>
export type PurchaseLine = z.infer<typeof PurchaseLine>
export type Receipt = z.infer<typeof Receipt>
export type ReceiptLine = z.infer<typeof ReceiptLine>
export type Sale = z.infer<typeof Sale>
export type SaleLine = z.infer<typeof SaleLine>
export type StockMove = z.infer<typeof StockMove>
export type Job = z.infer<typeof Job>
export type DB = z.infer<typeof DB>

export type AnyDoc = Quote | Order | Requisition | Purchase | Receipt | Sale
