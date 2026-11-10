/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, type ReactNode } from 'react'
import { commit, useDb } from '../db/store'
import { runCOPB10, runPURB01, LOCK_OPTS, type COPB10Params, type PURB01Params } from '../domain/batch'
import { keyOf, today } from '../domain/docs'
import { Check, DateBox, NumBox, Select } from '../ui/fields'
import { Icon } from '../ui/icons'
import { err, msgbox } from '../ui/msg'
import { names, Picker, PK, type PickDef } from '../ui/Picker'
import { useSession, type ProgProps } from '../ui/session'

type R = any

/** 批次作業共用外框：左邊頁籤 + 參數，右邊一排按鈕（確認/取消/週期性/自訂） */
function BatchFrame({ tabs, onOk, close }: { tabs: [string, ReactNode][]; onOk: () => void; close: () => void }) {
  const [t, setT] = useState(0)
  return (
    <div className="prog batch">
      <div className="batch-main">
        <div className="tabs">{tabs.map(([l], i) => <button key={l} className={t === i ? 'on' : ''} onClick={() => setT(i)}>{l}</button>)}</div>
        <div className="batch-body">{tabs[t][1]}</div>
      </div>
      <div className="batch-buttons">
        <button onClick={onOk}><Icon n="ok" size={22} />確認</button>
        <button onClick={close}><Icon n="cancel" size={22} />取消</button>
        <button onClick={() => msgbox('練習版未提供週期性排程。')}><Icon n="cal" size={22} />週期性</button>
        <button onClick={() => msgbox('練習版未提供自訂條件。')}>▶ 自訂</button>
      </div>
    </div>
  )
}
const Group = ({ title, children }: { title?: string; children: ReactNode }) => (
  <fieldset className="grp">{title && <legend>{title}</legend>}{children}</fieldset>
)
const Line = ({ label, children, dim }: { label: string; children: ReactNode; dim?: boolean }) => (
  <div className={`bline ${dim ? 'dim' : ''}`}><span className="blabel">{label}</span>{children}</div>
)

/** 代號欄位 + 開窗 */
function PickField({ value, onChange, def, w = 120, name, req, disabled }: { value: string; onChange: (v: string) => void; def: PickDef; w?: number; name?: string; req?: boolean; disabled?: boolean }) {
  const db = useDb()
  const [open, setOpen] = useState(false)
  return (
    <span className="fld-wrap">
      <input className={`fld ${req ? 'req' : ''} ${disabled ? 'ro' : ''}`} style={{ width: w }} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} />
      <button type="button" className="fld-icon" title="開窗查詢" disabled={disabled} onClick={() => setOpen(true)}><Icon n={def.icon ?? 'pick'} size={18} /></button>
      {name && <span className="fname">{name}</span>}
      {open && <Picker def={def} db={db} onClose={() => setOpen(false)} onPick={r => onChange(def.val(r))} />}
    </span>
  )
}

/** 多選清單：開窗加入、剪刀移除選取、垃圾桶全部清除。空白代表全部。 */
function MultiList({ value, onChange, def }: { value: string[]; onChange: (v: string[]) => void; def: PickDef }) {
  // ponytail: 「區間選擇」只顯示不作用，一律用清單逐筆選
  const db = useDb()
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(-1)
  return (
    <div className="multi">
      <div className="multi-list">
        {value.map((v, i) => <div key={v} className={i === sel ? 'sel' : ''} onClick={() => setSel(i)}>{v}</div>)}
      </div>
      <div className="multi-btns">
        <button title="開窗選取" onClick={() => setOpen(true)}><Icon n={def.icon ?? 'pick'} size={18} /></button>
        <button title="移除選取" disabled={sel < 0} onClick={() => { onChange(value.filter((_, i) => i !== sel)); setSel(-1) }}><Icon n="scissors" size={18} /></button>
        <button title="全部清除" disabled={!value.length} onClick={() => onChange([])}><Icon n="trash" size={18} /></button>
      </div>
      {open && <Picker def={def} db={db} onClose={() => setOpen(false)} onPick={r => { const v = def.val(r); if (!value.includes(v)) onChange([...value, v]) }} />}
    </div>
  )
}
const Radio = ({ value, opts, onChange }: { value: string; opts: [string, string][]; onChange: (v: any) => void }) => (
  <div className="radio-box">{opts.map(([v, l]) => <label key={v}><input type="radio" checked={value === v} onChange={() => onChange(v)} />{l}</label>)}</div>
)
const SYS_TAB: [string, ReactNode] = ['系統選項', <div className="dim" style={{ padding: 10 }}>練習版一律立即執行，完成後可到「佇列工作控制台」查看結果。</div>]

function submit(run: () => { result: string }, close: () => void) {
  try {
    const job = run()
    close()
    msgbox(`作業已送出並執行完成。\n${job.result}\n\n詳細結果請到「佇列工作控制台」查看。`)
  } catch (e) { err(e) }
}

// ---------- COPB10 訂單轉請購單複製作業 ----------
const orderPick: PickDef = {
  title: '開窗查詢 - 訂單', icon: 'pick',
  cols: [['訂單單別', r => r.type], ['訂單單號', r => r.no], ['客戶代號', r => r.customer], ['訂單日期', r => r.date], ['拋轉狀態', r => (r.transferred ? 'Y' : 'N')]],
  rows: db => db.orders.filter(o => o.status === 'Y' && !o.transferred),
  val: r => keyOf(r),
}
export function COPB10({ close }: ProgProps) {
  const db = useDb()
  const { user } = useSession()
  const [p, setP] = useState<COPB10Params>(() => ({
    plant: db.plants[0]?.id ?? '', orderKeys: [], custFrom: '', custTo: '', dateFrom: '', dateTo: '',
    reqType: db.docTypes.find(t => t.kind === 'requisition')?.id ?? '', reqDate: today(),
    supplierMode: '1', supplier: '', needMode: '1', days: 0, requester: '',
  }))
  const set = (patch: Partial<COPB10Params>) => setP(x => ({ ...x, ...patch }))
  return (
    <BatchFrame close={close} onOk={() => submit(() => commit(d => runCOPB10(d, p, user)), close)} tabs={[
      ['基本選項', <div className="bcols">
        <div className="bcol">
          <Line label="選擇廠別"><PickField req value={p.plant} onChange={v => set({ plant: v })} def={PK.plant} /></Line>
          <Group title="選擇訂單單號"><MultiList value={p.orderKeys} onChange={v => set({ orderKeys: v })} def={orderPick} /></Group>
          <Group title="選擇客戶代號">
            <Check label="區間選擇" value onChange={() => {}} />
            <Line label="起"><PickField w={240} value={p.custFrom} onChange={v => set({ custFrom: v })} def={PK.customer} /></Line>
            <Line label="迄"><PickField w={240} value={p.custTo} onChange={v => set({ custTo: v })} def={PK.customer} /></Line>
          </Group>
          <Group title="選擇訂單日期">
            <Line label="起"><DateBox w={240} value={p.dateFrom} onChange={v => set({ dateFrom: v })} /></Line>
            <Line label="迄"><DateBox w={240} value={p.dateTo} onChange={v => set({ dateTo: v })} /></Line>
          </Group>
        </div>
        <div className="bcol">
          <Line label="輸入請購單別"><PickField req value={p.reqType} onChange={v => set({ reqType: v })} def={PK.docType('requisition')} /></Line>
          <Line label="輸入請購日期"><DateBox cls="req" w={170} value={p.reqDate} onChange={v => set({ reqDate: v })} /></Line>
          <Group>
            <Line label="選擇廠商"><Select w={210} value={p.supplierMode} opts={[['1', '品號之主供應商'], ['2', '指定廠商']]} onChange={v => set({ supplierMode: v as '1' | '2' })} /></Line>
            <Line label="輸入廠商代號" dim={p.supplierMode !== '2'}><PickField w={180} req={p.supplierMode === '2'} disabled={p.supplierMode !== '2'} value={p.supplier} onChange={v => set({ supplier: v })} def={PK.supplier} /></Line>
          </Group>
          <Group title="選擇需求日計算方式">
            <div className="bline"><label className="rad"><input type="radio" checked={p.needMode === '1'} onChange={() => set({ needMode: '1' })} />依訂單預交日減</label><NumBox w={60} value={p.days} onChange={v => set({ days: v })} /></div>
            <div className="bline"><label className="rad"><input type="radio" checked={p.needMode === '2'} onChange={() => set({ needMode: '2' })} />依前置天數推算</label></div>
          </Group>
          <Line label="輸入請購人員"><PickField req w={230} value={p.requester} onChange={v => set({ requester: v })} def={PK.employee} /></Line>
        </div>
      </div>],
      ['進階選項', <div className="dim" style={{ padding: 10 }}>（練習版未使用此頁籤）</div>],
      SYS_TAB,
    ]} />
  )
}

// ---------- PURB01 請購資料更新作業（請購轉採購）----------
const reqPick: PickDef = {
  title: '開窗查詢 - 請購單', icon: 'pick',
  cols: [['請購單別', r => r.type], ['請購單號', r => r.no], ['請購日期', r => r.reqDate], ['廠別', r => r.plant], ['來源', r => r.source]],
  rows: db => db.requisitions.filter(r => r.status === 'Y' && r.lines.some(l => !l.poNo)),
  val: r => keyOf(r),
}
export function PURB01({ close }: ProgProps) {
  const db = useDb()
  const { user } = useSession()
  const [p, setP] = useState<PURB01Params>(() => ({
    reqKeys: [], lockOpt: '1', plant: db.plants[0]?.id ?? '', warehouses: [], currency: '', buyers: [],
    poDate: today(), poType: db.docTypes.find(t => t.kind === 'purchase')?.id ?? '', mergeSameDate: false, copyRemark: true,
  }))
  const set = (patch: Partial<PURB01Params>) => setP(x => ({ ...x, ...patch }))
  return (
    <BatchFrame close={close} onOk={() => submit(() => commit(d => runPURB01(d, p, user)), close)} tabs={[
      ['基本選項', <div className="bcols">
        <div className="bcol">
          <Group title="選擇請購單號"><Check label="區間選擇" value={false} onChange={() => {}} /><MultiList value={p.reqKeys} onChange={v => set({ reqKeys: v })} def={reqPick} /></Group>
          <Line label="鎖定選項"><Select w={230} value={p.lockOpt} opts={Object.entries(LOCK_OPTS).map(([k, v]) => [k, v])} onChange={v => set({ lockOpt: v as PURB01Params['lockOpt'] })} /></Line>
          <Line label="選擇廠別"><PickField w={180} value={p.plant} onChange={v => set({ plant: v })} def={PK.plant} /></Line>
          <Group title="選擇庫別"><MultiList value={p.warehouses} onChange={v => set({ warehouses: v })} def={PK.warehouse} /></Group>
        </div>
        <div className="bcol">
          <Line label="選擇幣別"><PickField w={140} value={p.currency} onChange={v => set({ currency: v })} def={PK.currency} /></Line>
          <Group title="選擇採購人員"><MultiList value={p.buyers} onChange={v => set({ buyers: v })} def={PK.employee} /></Group>
          <div className="tip">請輸入選項條件</div>
        </div>
      </div>],
      ['進階選項', <div className="bcol adv">
        <Line label="輸入採購日期"><DateBox cls="req" w={180} value={p.poDate} onChange={v => set({ poDate: v })} /></Line>
        <Line label="輸入採購單別"><PickField req w={180} value={p.poType} onChange={v => set({ poType: v })} def={PK.docType('purchase')} /></Line>
        <Line label="輸入流程代號"><PickField disabled w={180} value="" onChange={() => {}} def={PK.plant} /></Line>
        <Check label="相同交貨日彙總產生" value={p.mergeSameDate} onChange={v => set({ mergeSameDate: v })} />
        <Check label="相同品號不同品名規格彙總產生" value={false} ro />
        <Check label="拋轉備註" value={p.copyRemark} onChange={v => set({ copyRemark: v })} />
      </div>],
      SYS_TAB,
    ]} />
  )
}

// ---------- 佇列工作控制台 ----------
const QTABS = ['報表', '文字報表', '批次', '確認', '自訂報表', '週期性', '監控類報表']
export function QueueConsole({ close }: ProgProps) {
  const db = useDb()
  const [sel, setSel] = useState(0)
  const [tab, setTab] = useState(2)
  const jobs = tab === 2 ? db.jobs : [] // ponytail: 練習版只有批次工作，其他頁籤一律空白
  const job: R | undefined = jobs[sel]
  return (
    <div className="prog queue">
      <div className="menubar"><div className="menu"><button onClick={close}>佇列工作管理員(Q)</button><button>視窗(W)</button></div></div>
      <div className="toolbar">
        <button className="tbtn" title="刪除選取的工作" disabled={!job} onClick={() => { commit(d => { d.jobs.splice(sel, 1) }); setSel(0) }}><Icon n="del" size={24} /></button>
      </div>
      <div className="tabs">{QTABS.map((l, i) => <button key={l} className={tab === i ? 'on' : ''} onClick={() => { setTab(i); setSel(0) }}>{l}</button>)}</div>
      <div className="prog-body">
        <div className="browse-list queue-list">
          <table className="grid">
            <thead><tr><th className="rh" /><th>工作代號</th><th>作業名稱</th><th>處理方式</th><th>預計處理時間</th><th>處理狀態</th><th>處理者</th><th>開始時間</th><th>結束時間</th></tr></thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={j.id} className={`${i % 2 ? 'alt' : ''} ${i === sel ? 'sel' : ''}`} onClick={() => setSel(i)}>
                  <td className="rh">{i === sel ? '▶' : ''}</td><td>{j.id}</td><td>{j.program} {j.name}</td><td>{j.mode}</td><td>{j.queued}</td><td>{j.status}</td><td>{j.user}</td><td>{j.start}</td><td>{j.end}</td>
                </tr>
              ))}
              {!jobs.length && <tr><td className="rh" /><td colSpan={8} className="dim">目前沒有工作。執行批次作業後會出現在這裡。</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="queue-detail">
          <fieldset>
            <table className="grid"><thead><tr><th>選擇項目</th><th>條件值</th></tr></thead>
              <tbody>{job?.params.map(([k, v]: [string, string]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
          </fieldset>
          <fieldset><legend>處理結果</legend><textarea className="fld ro" readOnly value={job?.result ?? ''} /></fieldset>
        </div>
      </div>
      <div className="prog-status"><span className="cell grow">工作數: {jobs.length}</span></div>
    </div>
  )
}
