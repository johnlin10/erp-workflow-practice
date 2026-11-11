import { useSyncExternalStore } from 'react'
import { DB as DBSchema, type DB } from './schema'
import { ITEM_CATS, seed } from './seed'

const KEY = 'erp-workflow-practice:v1'
let loadProblem = ''

function formatIssues(err: { issues: { path: PropertyKey[]; message: string }[] }) {
  return err.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const r = DBSchema.safeParse(JSON.parse(raw))
    if (r.success) {
      // 預設資料後來新增的廠商、客戶、品號，補進舊的練習資料裡（已有的代號不動）
      const base = seed()
      for (const k of ['suppliers', 'customers', 'items', 'warehouses'] as const) {
        const have = new Set(r.data[k].map(x => x.id))
        ;(r.data[k] as { id: string }[]).push(...base[k].filter(x => !have.has(x.id)))
      }
      // 會計（品號類別）早期存的是不存在的代號，改成 05 商品
      for (const it of r.data.items) if (!ITEM_CATS.some(([c]) => c === it.acct)) it.acct = '05'
      // 員工改用課堂的 16 筆；舊資料的業務人員代號已不存在時改成 1001
      r.data.employees = base.employees
      for (const c of r.data.customers) if (!base.employees.some(e => e.id === c.sales)) c.sales = '1001'
      // 單別、幣別是固定的參考資料，直接換成最新的；舊付款條件存的是文字，改成代號
      r.data.docTypes = base.docTypes
      r.data.currencies = base.currencies
      const oldPay: Record<string, string> = { 月結30天: '002', 月結60天: '003', 貨到付現: '' }
      for (const k of ['customers', 'suppliers', 'quotes', 'orders', 'orderChanges', 'purchases', 'receipts', 'sales'] as const)
        for (const x of r.data[k] as { payTerm?: string }[]) if (x.payTerm && x.payTerm in oldPay) x.payTerm = oldPay[x.payTerm]
      r.data.taxCodes = base.taxCodes // 稅別碼是固定的參考資料，練習版不能修改，直接換成最新的
      return r.data
    }
    localStorage.setItem(KEY + ':broken', raw)
    loadProblem = `瀏覽器中的練習資料格式不正確，已改用預設資料。\n原資料已備份到 ${KEY}:broken。\n\n${formatIssues(r.error)}`
  } catch {
    loadProblem = '無法讀取瀏覽器中的練習資料，已改用預設資料。'
  }
  return seed()
}

let db: DB = load()
const listeners = new Set<() => void>()

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* 隱私模式等情況寫不進去，資料只留在記憶體 */ }
  listeners.forEach(l => l())
}

export const getDb = () => db
export const takeLoadProblem = () => { const p = loadProblem; loadProblem = ''; return p }

/** 在副本上修改資料；fn 拋出錯誤時資料不會變動。 */
export function commit<T>(fn: (draft: DB) => T): T {
  const draft = structuredClone(db)
  const out = fn(draft)
  db = draft
  save()
  return out
}

export function useDb(): DB {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb) }, () => db)
}

export function resetDb() { db = seed(); save() }

export function exportDb() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const d = new Date()
  a.download = `erp-practice-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** 匯入檔案；格式不對時回傳錯誤說明，不會覆蓋現有資料。 */
export async function importDb(file: File): Promise<string | null> {
  let parsed: unknown
  try { parsed = JSON.parse(await file.text()) } catch { return '檔案不是有效的 JSON 格式。' }
  const r = DBSchema.safeParse(parsed)
  if (!r.success) return `檔案格式不正確：\n${formatIssues(r.error)}`
  db = r.data
  save()
  return null
}

export function requestPersist() {
  navigator.storage?.persist?.().catch(() => {})
}
