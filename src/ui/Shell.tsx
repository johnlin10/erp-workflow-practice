import { useMemo, useRef, useState } from 'react'
import { PROGRAMS } from '../programs'
import { exportDb, importDb, resetDb, useDb } from '../db/store'
import { can } from '../domain/permissions'
import { FlowChart } from './FlowChart'
import { MENU, type TNode } from './menuTree'
import { Icon } from './icons'
import { ask, msgbox } from './msg'
import { Session, WinTitle, type ProgramDef } from './session'
import { Window, type WinState } from './Window'


export const winTitle = (p: ProgramDef, company: string) => p.code === 'QUEUE' ? `${p.name} - [佇列工作管理員]` : `${p.name}${p.hideCode ? '' : `(${p.code})`}[${company}]`

export function Shell({ user, onLogout }: { user: string; onLogout: () => void }) {
  const db = useDb()
  const [tab, setTab] = useState('常用')
  const [sys, setSys] = useState<string>('COP')
  const [search, setSearch] = useState('')
  const [openNodes, setOpenNodes] = useState<Set<string>>(() => new Set(['系統+作業別', '系統+作業別/訂單管理系統', '系統+作業別/訂單管理系統/日常異動處理']))
  const [wins, setWins] = useState<WinState[]>([])
  const z = useRef(10)
  const nextId = useRef(1)
  const fileInput = useRef<HTMLInputElement>(null)
  const userName = db.users.find(u => u.id === user)?.name ?? user

  const open = (code: string, arg?: string) => {
    const def = PROGRAMS.find(p => p.code === code)
    if (!def) return
    if (code !== 'QUEUE' && !can(db, user, code, 'run')) {
      msgbox(`您沒有執行「${def.name}」的權限。\n請到「使用者權限建立作業」設定。`, { icon: 'warn' })
      return
    }
    z.current++
    setWins(ws => {
      const ex = ws.find(w => w.code === code)
      if (ex) return ws.map(w => (w === ex ? { ...w, min: false, z: z.current, arg: arg ?? w.arg } : w))
      const n = ws.length % 8
      // 開啟時整個視窗都在工作區內；工作區太小就縮小視窗（內容會捲動）
      const area = document.querySelector('.winlayer')!
      const x = Math.min(40 + n * 26, Math.max(0, area.clientWidth - def.w)), y = Math.min(8 + n * 26, Math.max(0, area.clientHeight - def.h))
      return [...ws, { id: nextId.current++, code, x, y, w: Math.min(def.w, area.clientWidth - x), h: Math.min(def.h, area.clientHeight - y), z: z.current, min: false, max: false, arg }]
    })
  }
  const patch = (id: number, p: Partial<WinState>) => setWins(ws => ws.map(w => (w.id === id ? { ...w, ...p } : w)))
  const focus = (id: number) => { const top = Math.max(...wins.map(w => w.z)); const w = wins.find(x => x.id === id); if (w && w.z < top) { z.current++; patch(id, { z: z.current }) } }
  const close = (id: number) => setWins(ws => ws.filter(w => w.id !== id))
  const activeId = wins.filter(w => !w.min).sort((a, b) => b.z - a.z)[0]?.id

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? PROGRAMS.filter(p => p.code !== 'QUEUE' && (p.name.includes(q) || p.code.toLowerCase().includes(q))) : null
  }, [search])

  const toggle = (k: string) => setOpenNodes(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const notInPractice = () => msgbox('練習版未提供此功能。', { icon: 'info' })

  const doImport = async (f: File | undefined) => {
    if (!f) return
    if (!(await ask('匯入後會覆蓋目前瀏覽器中的練習資料，是否繼續？'))) return
    const e = await importDb(f)
    if (e) msgbox(e, { icon: 'error' })
    else { setWins([]); msgbox('匯入完成。') }
  }
  const doReset = async () => {
    if (!(await ask('重置後所有單據與自建資料都會清除，回到預設資料。\n建議先「匯出資料」備份。是否繼續？'))) return
    resetDb(); setWins([]); onLogout()
  }

  const progIcon = (k?: string) => (k === 'B' ? 'progB' : k === 'Q' ? 'progQ' : 'progI')
  const progRow = (p: ProgramDef) => (
    <div key={p.code} className="tree-item leaf" onDoubleClick={() => open(p.code)} onKeyDown={e => e.key === 'Enter' && open(p.code)} tabIndex={0}
      title={`${p.name}${p.hideCode ? '' : `(${p.code})`}，雙擊開啟`}>
      <Icon n={progIcon(p.kind)} size={16} />{p.name}
    </div>
  )
  // 資料夾裡（含子資料夾）有沒有練習版提供的作業；沒有的話資料夾顯示為淡色
  const hasProg = (n: TNode): boolean => n.children ? n.children.some(hasProg) : !!n.code && PROGRAMS.some(p => p.code === n.code)
  // 程式樹：資料夾點一下展開，作業雙擊開啟；點系統會切換右邊的流程圖
  const node = (n: TNode, path: string): React.ReactNode => {
    const k = path ? `${path}/${n.name}` : n.name
    if (!n.children) {
      const ok = !!n.code && PROGRAMS.some(p => p.code === n.code)
      const go = () => (ok ? open(n.code!) : notInPractice())
      return (
        <div key={k} className={`tree-item leaf ${ok ? '' : 'na'}`} tabIndex={0} onDoubleClick={go} onKeyDown={e => e.key === 'Enter' && go()}
          title={ok ? `${n.name}，雙擊開啟` : '練習版未提供此作業'}>
          <Icon n={progIcon(n.kind)} size={16} />{n.name}
        </div>
      )
    }
    const isOpen = openNodes.has(k)
    return (
      <div key={k}>
        <div className={`tree-item ${n.sys && sys === n.sys ? 'sel' : ''} ${hasProg(n) ? '' : 'na'}`} title={hasProg(n) ? undefined : '此資料夾沒有練習版提供的作業'} onClick={() => { toggle(k); if (n.sys) setSys(n.sys) }}>
          <span className="twisty">{n.children.length || n.sys !== undefined ? (isOpen ? '⌄' : '›') : ''}</span>
          <Icon n={path ? (isOpen ? 'folderOpen' : 'folder') : 'tree'} size={16} />{n.name}
        </div>
        {isOpen && n.children.length > 0 && <div className="tree-indent">{n.children.map(c => node(c, k))}</div>}
      </div>
    )
  }

  return (
    <Session.Provider value={{ user, open }}>
      <div className="shell">
        <div className="appbar">
          <div className="app-orb"><Icon n="app" size={30} /></div>
          <div className="ribbon-tabs">
            {['常用', '工具', '後台處理', '幫助'].map(t => (
              <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="appbar-title">ERP 流程練習室 [{db.company}-{userName}]</div>
        </div>

        <div className="ribbon">
          {tab === '常用' && <>
            <RGroup label="公司別"><select className="company" value={db.company} onChange={() => {}}><option>{db.company}</option></select></RGroup>
            <RGroup label="系統工具">
              <RBtn icon="gear" label="工作管理員" onClick={notInPractice} />
              <RBtn icon="queue" label="佇列工作控制台" onClick={() => open('QUEUE')} />
            </RGroup>
            <RGroup label="顯示程式清單">
              <div className="rsmall">
                <button onClick={notInPractice}><Icon n="options" size={16} />基本選項</button>
                <button onClick={notInPractice}><Icon n="options" size={16} />進階選項</button>
                <button onClick={notInPractice}><Icon n="options" size={16} />使用者權限清單</button>
              </div>
              <RBtn icon="save" label="儲存檢視設定" onClick={notInPractice} />
            </RGroup>
            <RGroup label="監控檢核通知">
              <div className="rform">
                <label>待辦未處理 <input disabled /></label>
                <label>警示未處理 <input disabled /></label>
              </div>
              <div className="rform">
                <label>依第一次通知日排序 <input type="checkbox" checked readOnly /></label>
                <label>總資料筆數限制 <select disabled><option>20</option></select></label>
              </div>
            </RGroup>
            <RGroup label="E-Service">
              <RBtn icon="question" label="問答集" onClick={notInPractice} />
              <RBtn icon="info" label="文字客服" onClick={notInPractice} />
            </RGroup>
            <RGroup label="登錄">
              <RBtn icon="relogin" label="重新登入" onClick={onLogout} />
              <RBtn icon="exit" label="離開" onClick={onLogout} />
            </RGroup>
          </>}
          {tab === '工具' && <>
            <RGroup label="練習資料（存在這台電腦的瀏覽器）">
              <RBtn icon="export" label="匯出資料" onClick={exportDb} />
              <RBtn icon="import" label="匯入資料" onClick={() => fileInput.current?.click()} />
              <RBtn icon="reset" label="重置資料" onClick={doReset} />
              <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => { doImport(e.target.files?.[0]); e.target.value = '' }} />
            </RGroup>
          </>}
          {tab === '後台處理' && <RGroup label="佇列"><RBtn icon="queue" label="佇列工作控制台" onClick={() => open('QUEUE')} /></RGroup>}
          {tab === '幫助' && <RGroup label="說明"><RBtn icon="info" label="關於本工具" onClick={() => msgbox(ABOUT)} /></RGroup>}
        </div>

        <div className="workspace">
          <div className="leftpane">
            <div className="search-row">
              <span>程式搜尋</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名稱或代號"
                onKeyDown={e => { if (e.key === 'Enter' && matches?.[0]) open(matches[0].code) }} />
            </div>
            <div className="search-row"><span>檢視類別</span><select><option>系統+作業別</option></select></div>
            <div className="tree">
              {matches ? (matches.length ? matches.map(progRow) : <div className="tree-empty">找不到符合的作業</div>) : (
                node(MENU, '')
              )}
            </div>
          </div>
          <div className="rightpane">
            <div className="right-tabs"><button className="on">流程圖</button><button onClick={notInPractice}>監控檢核通知</button></div>
            <div className="right-body">
              <FlowChart sys={sys} onOpen={open} has={c => PROGRAMS.some(p => p.code === c)} />
              <div className="disclaimer">非官方練習工具，與任何 ERP 軟體廠商無關。資料只存在這台電腦的瀏覽器。</div>
            </div>
          </div>

          <div className="winlayer">
            {wins.map(w => {
              const def = PROGRAMS.find(p => p.code === w.code)!
              const C = def.comp
              return (
                <Window key={w.id} win={w} title={winTitle(def, db.company)} active={w.id === activeId}
                  onFocus={() => focus(w.id)} onClose={() => close(w.id)} onChange={p => patch(w.id, p)}>
                  <WinTitle.Provider value={winTitle(def, db.company)}><C close={() => close(w.id)} arg={w.arg} /></WinTitle.Provider>
                </Window>
              )
            })}
          </div>
        </div>

        <div className="taskbar">
          {wins.filter(w => w.min).map(w => {
            const def = PROGRAMS.find(p => p.code === w.code)!
            return <button key={w.id} onClick={() => { z.current++; patch(w.id, { min: false, z: z.current }) }}><Icon n="app" size={14} />{def.name}</button>
          })}
        </div>
        <div className="statusbar">
          <span className="grow" />
          <span className="cell">🗄 {db.company}</span>
          <span className="cell">👤 {user}-{userName}</span>
          <span className="cell">📶 127.0.0.1</span>
          <span className="cell dim">CAPS NUM SCRL INS</span>
        </div>
      </div>
    </Session.Provider>
  )
}

const ABOUT = `ERP 流程練習室

這是「企業資源規劃」課程的非官方練習工具，與任何 ERP 軟體廠商無關。
介面依照課堂操作畫面重新製作，用來熟悉以下流程：
報價 → 訂單 → 訂單變更 → 訂單轉請購 → 請購 → 採購 → 進貨驗收 → 銷貨

練習資料只存在這台電腦的瀏覽器。
「工具」頁籤可以匯出、匯入或重置資料。`

function RGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rgroup"><div className="rgroup-body">{children}</div><div className="rgroup-label">{label}</div></div>
}
function RBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return <button className="rbtn" onClick={onClick}><Icon n={icon} size={32} /><span>{label}</span></button>
}
