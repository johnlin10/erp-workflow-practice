import type { ProgramDef } from '../ui/session'
import { COPB10, PURB01, QueueConsole } from './batch'
import { ADMI05, ADMI10, COPI01, INVI02, OrderTree, PURI01, StockQuery } from './master'
import { PURI05, PURI06, PURI07, PURI09 } from './purchase'
import { COPI05, COPI06, COPI07, COPI08 } from './sales'

const BIG = { w: 1060, h: 780 }
export const PROGRAMS: ProgramDef[] = [
  { code: 'ADMI10', name: '登入者代號建立作業', sys: 'ADM', folder: '基本資料管理', kind: 'I', comp: ADMI10, w: 760, h: 480 },
  { code: 'ADMI05', name: '使用者權限建立作業', sys: 'ADM', folder: '基本資料管理', kind: 'I', comp: ADMI05, w: 1060, h: 690 },
  { code: 'INVI02', name: '品號資料建立作業', sys: 'INV', folder: '基本資料管理', kind: 'I', comp: INVI02, w: 1150, h: 755 },
  { code: 'INVQ02', name: '庫存狀況查詢作業', sys: 'INV', folder: '查詢作業', kind: 'Q', comp: StockQuery, w: 820, h: 480, hideCode: true },
  { code: 'COPI01', name: '客戶資料建立作業', sys: 'COP', folder: '基本資料管理', kind: 'I', comp: COPI01, w: 1020, h: 670 },
  { code: 'COPQ05', name: '訂單樹狀資訊查詢', sys: 'COP', folder: '查詢作業', kind: 'Q', comp: OrderTree, w: 820, h: 520 },
  { code: 'COPI05', name: '報價單建立作業', sys: 'COP', folder: '日常異動處理', kind: 'I', comp: COPI05, ...BIG },
  { code: 'COPI06', name: '客戶訂單建立作業', sys: 'COP', folder: '日常異動處理', kind: 'I', comp: COPI06, ...BIG, h: 840 },
  { code: 'COPI07', name: '訂單變更單建立作業', sys: 'COP', folder: '日常異動處理', kind: 'I', comp: COPI07, ...BIG },
  { code: 'COPI08', name: '銷貨單建立作業', sys: 'COP', folder: '日常異動處理', kind: 'I', comp: COPI08, ...BIG },
  { code: 'COPB10', name: '訂單轉請購單複製作業', sys: 'COP', folder: '批次作業', kind: 'B', comp: COPB10, w: 820, h: 520 },
  { code: 'PURI01', name: '廠商資料建立作業', sys: 'PUR', folder: '基本資料管理', kind: 'I', comp: PURI01, w: 1020, h: 600 },
  { code: 'PURI05', name: '請購單建立作業', sys: 'PUR', folder: '請購資料管理', kind: 'I', comp: PURI05, ...BIG },
  { code: 'PURI06', name: '請購資料維護作業', sys: 'PUR', folder: '請購資料管理', kind: 'I', comp: PURI06, w: 1460, h: 690 },
  { code: 'PURB01', name: '請購資料更新作業', sys: 'PUR', folder: '批次作業', kind: 'B', comp: PURB01, w: 780, h: 480 },
  { code: 'PURI07', name: '採購單建立作業', sys: 'PUR', folder: '日常異動處理', kind: 'I', comp: PURI07, ...BIG },
  { code: 'PURI09', name: '進貨單建立作業', sys: 'PUR', folder: '日常異動處理', kind: 'I', comp: PURI09, ...BIG, h: 880 },
  { code: 'QUEUE', name: '佇列工作控制台', sys: 'ADM', folder: '', kind: 'Q', comp: QueueConsole, w: 980, h: 560, hideCode: true },
]
