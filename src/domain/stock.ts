import type { DB } from '../db/schema'

/** 庫存數量 = 異動明細加總 */
export const stockOf = (db: DB, item: string, warehouse?: string) =>
  db.stock.filter(m => m.item === item && (warehouse === undefined || m.warehouse === warehouse)).reduce((s, m) => s + m.qty, 0)
