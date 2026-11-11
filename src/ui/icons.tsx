// 自己繪製的簡易圖示（不使用原軟體或他人的圖檔）。工具列圖示的形狀和顏色參考課堂截圖重新繪製。
import type { ReactNode } from 'react'

const paper = <path d="M6 3h8l4 4v14H6z" fill="#fff" stroke="#333" strokeWidth="1.2" />
const fold = <path d="M14 3v4h4" fill="none" stroke="#333" strokeWidth="1.2" />

const ICONS: Record<string, ReactNode> = {
  new: <>{paper}{fold}</>,
  query: <>{paper}{fold}<circle cx="12" cy="14" r="3.2" fill="#cde" stroke="#124" strokeWidth="1.4" /><path d="M14.3 16.3l3.5 3.5" stroke="#124" strokeWidth="2" /></>,
  edit: <>{paper}{fold}<path d="M9 18l1-3 7-7 2 2-7 7z" fill="#e8b84a" stroke="#634" strokeWidth="0.8" /></>,
  del: <><path d="M7 7h10l-1 14H8z" fill="#bbb" stroke="#444" /><path d="M6 6h12M10 4h4" stroke="#444" strokeWidth="1.5" /><path d="M10 10v8M14 10v8" stroke="#666" /></>,
  print: <><rect x="7" y="3" width="10" height="6" fill="#fff" stroke="#444" /><rect x="4" y="9" width="16" height="8" rx="1" fill="#999" stroke="#444" /><rect x="7" y="14" width="10" height="6" fill="#fff" stroke="#444" /></>,
  first: <path d="M12 5L4 12l8 7zM20 5l-8 7 8 7z" fill="#2c3550" />,
  prev: <path d="M16 5l-8 7 8 7z" fill="#2c3550" />,
  next: <path d="M8 5l8 7-8 7z" fill="#2c3550" />,
  last: <path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" fill="#2c3550" />,
  view: <><rect x="4" y="4" width="16" height="16" fill="#fff" stroke="#444" /><rect x="6" y="6" width="12" height="4" fill="#c33" /><path d="M6 13h12M6 16h12" stroke="#468" /></>,
  ok: <path d="M3.5 12.5l5.5 5.5L20.5 5" fill="none" stroke="#1d8f1d" strokeWidth="3.6" strokeLinejoin="round" />,
  cancel: <path d="M5 5l14 14M19 5L5 19" stroke="#c40000" strokeWidth="3.8" />,
  confirm: <><g transform="translate(3 3) scale(.85)"><path d="M5 6l11-3 4 14-11 3z" fill="#f4d23c" stroke="#5a4a00" strokeWidth="1" /><path d="M7.2 7.5l6.5-1.8 1.3 4.6-6.5 1.8z" fill="#fff" stroke="#5a4a00" strokeWidth=".6" /><path d="M10 15.5l5-1.4 1 3.4-5 1.4z" fill="#3a3a3a" /></g><path d="M2.5 2.5l6 6M8.5 8.5V4.5M8.5 8.5h-4" fill="none" stroke="#d01010" strokeWidth="2" /></>,
  cross: <><rect x="2" y="2" width="20" height="20" fill="#d8d8d8" stroke="#777" /><rect x="5" y="4" width="11" height="12" fill="#fff" stroke="#2a4f9a" /><rect x="5" y="4" width="11" height="3" fill="#2a4f9a" /><rect x="9" y="9" width="10" height="11" fill="#fff" stroke="#b02020" /><path d="M9 9h10v3H9z" fill="#c62828" /><path d="M11 14h6M11 16.5h6" stroke="#2a8a3a" strokeWidth="1.2" /></>,
  custConfirm: <><path d="M6 2h9l4 4v14H6z" fill="#fff" stroke="#444" /><path d="M8 11h3l-1 10-1.5-2-1.5 2z" fill="#d03030" /><path d="M11 11h3l-.5 9-1.2-1.6-1.3 1.6z" fill="#f2c200" /><path d="M14 11h3l-1 8-1.2-1.4-1.3 1.4z" fill="#2a6ad0" /><circle cx="12" cy="9" r="3" fill="#2a9a3a" stroke="#155a20" /></>,
  unconfirm: <><g transform="translate(3 3) scale(.85)"><path d="M5 6l11-3 4 14-11 3z" fill="#f4d23c" stroke="#5a4a00" strokeWidth="1" /><path d="M7.2 7.5l6.5-1.8 1.3 4.6-6.5 1.8z" fill="#fff" stroke="#5a4a00" strokeWidth=".6" /><path d="M10 15.5l5-1.4 1 3.4-5 1.4z" fill="#3a3a3a" /></g><path d="M10 3.5A4.5 4.5 0 0 0 3.5 9" fill="none" stroke="#d01010" strokeWidth="1.8" /><path d="M2 6.5l1.6 3 3-1.6" fill="none" stroke="#d01010" strokeWidth="1.6" /></>,
  void: <><circle cx="12" cy="12" r="8" fill="#fff" stroke="#b22" strokeWidth="2" /><path d="M6.5 17.5l11-11" stroke="#b22" strokeWidth="2" /></>,
  copyFrom: <><path d="M2 7h7l2 2h10v11H2z" fill="#9a9440" stroke="#4a4610" /><path d="M2 11h19v9H2z" fill="#b8b25a" stroke="#4a4610" /><path d="M9 4h9v6" fill="none" stroke="#1a4fa8" strokeWidth="2" /><path d="M15 9l3 3 3-3" fill="#1a4fa8" /></>,
  delLine: <><rect x="3" y="6" width="18" height="12" fill="#ffffe0" stroke="#444" /><path d="M3 10h18M3 14h18" stroke="#999" /><path d="M14 13l6 6M20 13l-6 6" stroke="#d01818" strokeWidth="2" /></>,
  flow: <><rect x="3" y="4" width="8" height="5" fill="#9cf" stroke="#246" /><rect x="13" y="15" width="8" height="5" fill="#9cf" stroke="#246" /><path d="M7 9v8h6" fill="none" stroke="#246" strokeWidth="1.4" /></>,
  frame: <><rect x="3" y="3" width="18" height="18" fill="#cfcfcf" stroke="#6a6a6a" /><rect x="6" y="6" width="12" height="12" fill="#fff" stroke="#888" /><path d="M8 15l3-4 2 2 2-3 2 5z" fill="#7a9a6a" /><circle cx="9.5" cy="9" r="1.3" fill="#e0a020" /></>,
  monitor: <><rect x="1.5" y="4" width="21" height="13" fill="#3a78c8" stroke="#1a3a70" /><rect x="3" y="5.5" width="18" height="5" fill="#a9d4ff" /><path d="M4 8h3M8 8h3M12 8h3M16 8h3" stroke="#fff" strokeWidth="1.2" /><path d="M9 17l-1 3h8l-1-3z" fill="#555" /></>,
  sign: <><circle cx="9" cy="7" r="3" fill="#5a8ad8" stroke="#1a3a70" /><path d="M3.5 17c0-4 2.5-6 5.5-6s5.5 2 5.5 6z" fill="#5a8ad8" stroke="#1a3a70" /><circle cx="16" cy="7" r="3" fill="#3aa89a" stroke="#155a50" /><path d="M11.5 17c0-4 2-6 4.5-6s5.5 2 5.5 6z" fill="#3aa89a" stroke="#155a50" /><circle cx="7" cy="18.5" r="4" fill="#d81b1b" /><text x="7" y="21.2" fontSize="7" textAnchor="middle" fill="#fff" fontWeight="bold">S</text></>,
  transfer: <><path d="M2 19l6-7 4 4 6-8" fill="none" stroke="#6a1a8a" strokeWidth="3.4" transform="translate(1 1)" /><path d="M2 19l6-7 4 4 6-8" fill="none" stroke="#f020c0" strokeWidth="3.4" /><path d="M14 6h6v6z" fill="#f020c0" /></>,
  pages: <><rect x="3" y="2" width="12" height="15" fill="#fff8c0" stroke="#555" /><rect x="9" y="7" width="12" height="15" fill="#fff" stroke="#333" /><path d="M11 11h8M11 14h8M11 17h6" stroke="#333" /></>,
  clip: <><rect x="4" y="4" width="16" height="18" rx="1" fill="#a87830" stroke="#4a3010" /><rect x="7" y="7" width="10" height="13" fill="#fff" stroke="#666" /><rect x="8.5" y="2" width="7" height="4" rx="1" fill="#ddd" stroke="#333" /><path d="M9 11h6M9 14h6M9 17h4" stroke="#888" /></>,
  grid: <><rect x="2" y="4" width="20" height="16" fill="#fff" stroke="#1a3a80" /><rect x="2" y="4" width="20" height="4" fill="#2a5ac0" /><path d="M2 12h20M2 16h20M8 8v12M15 8v12" stroke="#1a3a80" strokeWidth=".8" /><path d="M9.5 14l2 2 4-5" fill="none" stroke="#d01010" strokeWidth="1.6" /></>,
  house: <><path d="M3 12l9-8 9 8" fill="none" stroke="#7a3a10" strokeWidth="2" /><path d="M5 11v10h14V11l-7-6z" fill="#f2e6c8" stroke="#555" /><rect x="10" y="14" width="4" height="7" fill="#a06030" /><rect x="15" y="4" width="2.5" height="5" fill="#a03020" /></>,
  stack: <><rect x="9" y="2" width="12" height="9" fill="#f4d23c" stroke="#5a4a00" /><rect x="6" y="7" width="12" height="9" fill="#f8e070" stroke="#5a4a00" /><rect x="3" y="12" width="12" height="9" fill="#fff2a8" stroke="#5a4a00" /></>,
  find: <><circle cx="10" cy="10" r="6" fill="#fff6a0" stroke="#1a2a6a" strokeWidth="2" /><path d="M14.5 14.5l6 6" stroke="#1a2a6a" strokeWidth="3" /></>,
  stamp: <><path d="M6 2h9l4 4v14H6z" fill="#fff" stroke="#444" /><path d="M8 11h3l-1 10-1.5-2-1.5 2z" fill="#d03030" /><path d="M11 11h3l-.5 9-1.2-1.6-1.3 1.6z" fill="#f2c200" /><path d="M14 11h3l-1 8-1.2-1.4-1.3 1.4z" fill="#2a6ad0" /><circle cx="12" cy="9" r="3" fill="#2a9a3a" stroke="#155a20" /></>,
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
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
      {ICONS[n] ?? ICONS.options}
    </svg>
  )
}
