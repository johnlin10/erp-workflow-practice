// 自己繪製的簡易圖示（不使用原軟體的圖檔）。形狀和顏色只是表達按鈕的意思。
import type { ReactNode } from 'react'

const paper = <path d="M6 3h8l4 4v14H6z" fill="#fff" stroke="#333" strokeWidth="1.2" />
const fold = <path d="M14 3v4h4" fill="none" stroke="#333" strokeWidth="1.2" />

const ICONS: Record<string, ReactNode> = {
  new: <>{paper}{fold}</>,
  query: <>{paper}{fold}<circle cx="12" cy="14" r="3.2" fill="#cde" stroke="#124" strokeWidth="1.4" /><path d="M14.3 16.3l3.5 3.5" stroke="#124" strokeWidth="2" /></>,
  edit: <>{paper}{fold}<path d="M9 18l1-3 7-7 2 2-7 7z" fill="#e8b84a" stroke="#634" strokeWidth="0.8" /></>,
  del: <><path d="M7 7h10l-1 14H8z" fill="#bbb" stroke="#444" /><path d="M6 6h12M10 4h4" stroke="#444" strokeWidth="1.5" /><path d="M10 10v8M14 10v8" stroke="#666" /></>,
  print: <><rect x="7" y="3" width="10" height="6" fill="#fff" stroke="#444" /><rect x="4" y="9" width="16" height="8" rx="1" fill="#999" stroke="#444" /><rect x="7" y="14" width="10" height="6" fill="#fff" stroke="#444" /></>,
  first: <path d="M6 5v14M18 5l-9 7 9 7z" fill="#2a3d8f" stroke="#2a3d8f" strokeWidth="1.5" />,
  prev: <path d="M16 5l-9 7 9 7z" fill="#2a3d8f" />,
  next: <path d="M8 5l9 7-9 7z" fill="#2a3d8f" />,
  last: <path d="M18 5v14M6 5l9 7-9 7z" fill="#2a3d8f" stroke="#2a3d8f" strokeWidth="1.5" />,
  view: <><rect x="4" y="4" width="16" height="16" fill="#fff" stroke="#444" /><rect x="6" y="6" width="12" height="4" fill="#c33" /><path d="M6 13h12M6 16h12" stroke="#468" /></>,
  ok: <path d="M4 13l5 5L20 6" fill="none" stroke="#1a9a1a" strokeWidth="3.4" strokeLinecap="round" />,
  cancel: <path d="M5 5l14 14M19 5L5 19" stroke="#d01818" strokeWidth="3.6" strokeLinecap="round" />,
  confirm: <><path d="M12 3l8 8-8 8-8-8z" fill="#f2c94c" stroke="#8a6d00" /><path d="M8 11l3 3 5-6" fill="none" stroke="#1a7a1a" strokeWidth="2" /></>,
  cross: <><rect x="3" y="4" width="9" height="7" fill="#fff" stroke="#2a5ca8" /><rect x="12" y="13" width="9" height="7" fill="#fff" stroke="#2a5ca8" /><path d="M8 11v5h4M16 13V8h-4" fill="none" stroke="#c47a00" strokeWidth="1.6" /></>,
  custConfirm: <><circle cx="9" cy="8" r="4" fill="#8fb4e8" stroke="#2a5ca8" /><path d="M2 20c0-4 3-7 7-7s7 3 7 7z" fill="#8fb4e8" stroke="#2a5ca8" /><path d="M14 13l3 3 5-6" fill="none" stroke="#1a7a1a" strokeWidth="2.5" /></>,
  unconfirm: <><path d="M12 3l8 8-8 8-8-8z" fill="#ddd" stroke="#777" /><path d="M9 8l6 6M15 8l-6 6" stroke="#b22" strokeWidth="2" /></>,
  void: <><circle cx="12" cy="12" r="8" fill="#fff" stroke="#b22" strokeWidth="2" /><path d="M6.5 17.5l11-11" stroke="#b22" strokeWidth="2" /></>,
  copyFrom: <><rect x="4" y="3" width="10" height="13" fill="#fff" stroke="#444" /><rect x="10" y="8" width="10" height="13" fill="#e8f0ff" stroke="#246" /><path d="M7 12h6l-2-2M13 12l-2 2" stroke="#c22" strokeWidth="1.4" fill="none" /></>,
  delLine: <><rect x="3" y="6" width="18" height="12" fill="#ffffe0" stroke="#444" /><path d="M3 10h18M3 14h18" stroke="#999" /><path d="M14 13l6 6M20 13l-6 6" stroke="#d01818" strokeWidth="2" /></>,
  flow: <><rect x="3" y="4" width="8" height="5" fill="#9cf" stroke="#246" /><rect x="13" y="15" width="8" height="5" fill="#9cf" stroke="#246" /><path d="M7 9v8h6" fill="none" stroke="#246" strokeWidth="1.4" /></>,
  // 欄位旁的小圖示
  pick: <><rect x="5" y="9" width="10" height="9" fill="#fff" stroke="#555" /><rect x="9" y="5" width="10" height="9" fill="#fff" stroke="#555" /></>,
  person: <><circle cx="12" cy="8" r="4" fill="#f5c89a" stroke="#333" /><path d="M4 21c0-5 4-7 8-7s8 2 8 7z" fill="#2b4fb3" stroke="#123" /></>,
  customer: <><rect x="5" y="9" width="14" height="12" fill="#c22" stroke="#611" /><rect x="11" y="9" width="2" height="12" fill="#fd0" /><path d="M5 9h14" stroke="#fd0" strokeWidth="2" /><path d="M12 9c-3-6-7-3-4 0M12 9c3-6 7-3 4 0" fill="none" stroke="#fd0" strokeWidth="1.6" /></>,
  supplier: <><circle cx="12" cy="7" r="3.5" fill="#f5c89a" stroke="#333" /><path d="M5 20c0-5 3-7 7-7s7 2 7 7z" fill="#2a7a3a" stroke="#123" /><rect x="14" y="14" width="6" height="5" fill="#c84" stroke="#531" /></>,
  money: <><circle cx="12" cy="12" r="8" fill="#f8d84a" stroke="#8a6d00" /><text x="12" y="16.5" fontSize="12" textAnchor="middle" fill="#7a5000" fontWeight="bold">$</text></>,
  plant: <><path d="M4 20V9l5 3V9l5 3V6h6v14z" fill="#9ab" stroke="#345" /><rect x="7" y="15" width="3" height="3" fill="#fff" /><rect x="13" y="15" width="3" height="3" fill="#fff" /></>,
  tree: <><rect x="3" y="4" width="7" height="5" fill="#fff" stroke="#555" /><rect x="14" y="10" width="7" height="5" fill="#fff" stroke="#555" /><rect x="14" y="17" width="7" height="4" fill="#fff" stroke="#555" /><path d="M6 9v10h8M6 12h8" fill="none" stroke="#555" /></>,
  cal: <><rect x="3" y="4" width="18" height="17" fill="#fff" stroke="#123" /><rect x="3" y="4" width="18" height="5" fill="#2a3d8f" /><text x="12" y="18.5" fontSize="9" textAnchor="middle" fill="#123" fontWeight="bold">31</text></>,
  note: <><rect x="4" y="5" width="13" height="15" fill="#fff" stroke="#555" /><path d="M7 9h7M7 12h7M7 15h5" stroke="#888" /><path d="M14 18l6-6-2-2-6 6z" fill="#e33" stroke="#611" strokeWidth=".6" /></>,
  scissors: <><circle cx="8" cy="17" r="2.5" fill="none" stroke="#123" strokeWidth="1.4" /><circle cx="16" cy="17" r="2.5" fill="none" stroke="#123" strokeWidth="1.4" /><path d="M9.5 15L15 5M14.5 15L9 5" stroke="#123" strokeWidth="1.4" /><rect x="6" y="3" width="12" height="4" fill="#ffef80" stroke="#887" /></>,
  trash: <><path d="M7 7h10l-1 14H8z" fill="#555" stroke="#222" /><path d="M6 6h12M10 4h4" stroke="#222" strokeWidth="1.5" /><path d="M10 9v9M14 9v9" stroke="#bbb" /></>,
  // 主畫面功能區
  gear: <><circle cx="12" cy="12" r="8" fill="#5b8fd8" stroke="#234" /><circle cx="12" cy="12" r="3.5" fill="#fff" stroke="#234" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="#234" strokeWidth="1.5" /></>,
  queue: <><rect x="5" y="3" width="13" height="17" fill="#fff" stroke="#444" /><path d="M8 7h7M8 10h7M8 13h7M8 16h4" stroke="#888" /><path d="M14 13l5 5" stroke="#246" strokeWidth="2" /></>,
  relogin: <><circle cx="9" cy="8" r="3.5" fill="#f5c89a" stroke="#333" /><path d="M3 20c0-5 3-7 6-7s6 2 6 7z" fill="#3a6fc8" stroke="#123" /><circle cx="16" cy="9" r="3" fill="#f5c89a" stroke="#333" /><path d="M12 20c1-4 2-6 4-6s4 2 5 6z" fill="#e3a52b" stroke="#123" /></>,
  exit: <path d="M5 5l14 14M19 5L5 19" stroke="#e01b1b" strokeWidth="4" strokeLinecap="round" />,
  export: <><path d="M5 14v6h14v-6" fill="none" stroke="#333" strokeWidth="1.6" /><path d="M12 4v11M8 11l4 4 4-4" fill="none" stroke="#1a7a1a" strokeWidth="2" /></>,
  import: <><path d="M5 14v6h14v-6" fill="none" stroke="#333" strokeWidth="1.6" /><path d="M12 15V4M8 8l4-4 4 4" fill="none" stroke="#246" strokeWidth="2" /></>,
  reset: <><path d="M18 12a6 6 0 1 1-2-4.5" fill="none" stroke="#b22" strokeWidth="2" /><path d="M17 3v5h-5" fill="none" stroke="#b22" strokeWidth="2" /></>,
  save: <><rect x="4" y="4" width="16" height="16" fill="#3a6fc8" stroke="#123" /><rect x="7" y="4" width="10" height="6" fill="#fff" /><rect x="7" y="13" width="10" height="7" fill="#dde" /></>,
  options: <><rect x="4" y="4" width="16" height="16" fill="#fff" stroke="#555" /><path d="M7 8h10M7 12h10M7 16h6" stroke="#c84" strokeWidth="1.5" /></>,
  info: <><circle cx="12" cy="12" r="10" fill="#2a6fd8" /><text x="12" y="17" fontSize="13" textAnchor="middle" fill="#fff" fontWeight="bold" fontFamily="serif">i</text></>,
  warn: <><path d="M12 2l10 19H2z" fill="#f5c400" stroke="#7a6000" /><text x="12" y="18.5" fontSize="12" textAnchor="middle" fill="#000" fontWeight="bold">!</text></>,
  error: <><circle cx="12" cy="12" r="10" fill="#d42020" /><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.4" /></>,
  question: <><circle cx="12" cy="12" r="10" fill="#2a6fd8" /><text x="12" y="17" fontSize="13" textAnchor="middle" fill="#fff" fontWeight="bold">?</text></>,
  folder: <path d="M2 6h7l2 2h11v12H2z" fill="#f0c860" stroke="#8a6a10" />,
  folderOpen: <><path d="M2 6h7l2 2h11v12H2z" fill="#e8b840" stroke="#8a6a10" /><path d="M4 11h19l-3 9H2z" fill="#f8d880" stroke="#8a6a10" /></>,
  progI: <><rect x="4" y="3" width="15" height="18" fill="#ffd400" stroke="#8a6a00" /><rect x="7" y="7" width="9" height="11" fill="#fff" stroke="#c40" /><text x="11.5" y="16" fontSize="9" textAnchor="middle" fill="#c40" fontWeight="bold">I</text></>,
  progB: <><rect x="4" y="3" width="15" height="18" fill="#e040b0" stroke="#801060" /><rect x="7" y="7" width="9" height="11" fill="#fff" stroke="#801060" /><text x="11.5" y="16" fontSize="9" textAnchor="middle" fill="#801060" fontWeight="bold">B</text></>,
  progQ: <><rect x="4" y="3" width="15" height="18" fill="#30b8d0" stroke="#106070" /><rect x="7" y="7" width="9" height="11" fill="#fff" stroke="#106070" /><text x="11.5" y="16" fontSize="9" textAnchor="middle" fill="#106070" fontWeight="bold">Q</text></>,
  app: <><rect x="2" y="3" width="20" height="18" rx="2" fill="#6a4cc0" /><text x="12" y="16" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="bold">ERP</text></>,
}

export function Icon({ n, size = 22 }: { n: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {ICONS[n] ?? ICONS.options}
    </svg>
  )
}
