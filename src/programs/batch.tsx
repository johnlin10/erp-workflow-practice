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

/** 批次作業共用外框：頁籤 + 參數表 + 確認/取消/週期性/自訂 */
function BatchFrame({ tabs, onOk, close }: { tabs: [string, ReactNode][]; onOk: () => void; close: () => void }) {
  const [t, setT] = useState(0)
  return (
    <div className="prog batch">
      <div className="tabs sub-tabs">{tabs.map(([l], i) => <button key={l} className={t === i ? 'on' : ''} onClick={() => setT(i)}>{l}</button>)}</div>
      <div className="batch-body">{tabs[t][1]}</div>
      <div className="dlg-buttons">
        <button onClick={onOk}><Icon n="ok" size={18} />確認(<u>O</u>)</button>
        <button onClick={close}><Icon n="cancel" size={18} />取消(<u>C</u>)</button>
        <button onClick={() => msgbox('練習版未提供週期性排程。')}><Icon n="cal" size={18} />週期性(<u>P</u>)</button>
        <button onClick={() => msgbox('練習版未提供自訂條件。')}>▶ 自訂(<u>S</u>)</button>
      </div>
    </div>
  )
}
const Row = ({ label, children, req }: { label: string; children: ReactNode; req?: boolean }) => (
  <tr><td className={`flabel ${req ? 'req-label' : ''}`}>{label}</td><td className="fcell">{children}</td></tr>
)

/** 代號欄位 + 開窗 */
function PickField({ value, onChange, def, w = 120, name }: { value: string; onChange: (v: string) => void; def: PickDef; w?: number; name?: string }) {
  const db = useDb()
  const [open, setOpen] = useState(false)
  return (
    <span className="fld-wrap">
      <input className="fld req" style={{ width: w }} value={value} onChange={e => onChange(e.target.value)} />
      <button type="button" className="fld-icon" title="開窗查詢" onClick={() => setOpen(true)}><Icon n={def.icon ?? 'pick'} size={18} /></button>
      {name && <span className="fname">{name}</span>}
      {open && <Picker def={def} db={db} onClose={() => setOpen(false)} onPick={r => onChange(def.val(r))} />}
    </span>
  )
}

/** 多選清單：開窗加入、剪刀移除選取、垃圾桶全部清除。空白代表全部。 */
function MultiList({ value, onChange, def }: { value: string[]; onChange: (v: string[]) => void; def: PickDef }) {
  const db = useDb()
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(-1)
  return (
    <div className="multi">
      <div className="multi-list">
        {value.length ? value.map((v, i) => <div key={v} className={i === sel ? 'sel' : ''} onClick={() => setSel(i)}>{v}</div>) : <div className="dim">（空白表示全部）</div>}
      </div>
      <div className="multi-btns">
        <button title="開窗選取" onClick={() => setOpen(true)}><Icon n="pick" size={18} /></button>
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
const SYS_TAB: [string, ReactNode] = ['系統選項', <table className="form-table"><tbody>
  <Row label="執行方式"><Radio value="1" opts={[['1', '立即執行（依佇列順序）'], ['2', '排程執行']]} onChange={() => {}} /></Row>
  <Row label="說明"><span className="dim">練習版一律立即執行，完成後可到「佇列工作控制台」查看結果。</span></Row>
</tbody></table>]

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
      ['基本選項', <table className="form-table"><tbody>
        <Row label="選擇廠別" req><PickField value={p.plant} onChange={v => set({ plant: v })} def={PK.plant} name={names.plant(db, p.plant)} /></Row>
        <Row label="選擇訂單單號"><MultiList value={p.orderKeys} onChange={v => set({ orderKeys: v })} def={orderPick} /></Row>
        <Row label="選擇客戶代號"><span className="range">
          <PickField value={p.custFrom} onChange={v => set({ custFrom: v })} def={PK.customer} /> ～ <PickField value={p.custTo} onChange={v => set({ custTo: v })} def={PK.customer} />
        </span></Row>
        <Row label="選擇訂單日期"><span className="range">
          <DateBox value={p.dateFrom} onChange={v => set({ dateFrom: v })} /> ～ <DateBox value={p.dateTo} onChange={v => set({ dateTo: v })} />
        </span></Row>
      </tbody></table>],
      ['進階選項', <table className="form-table"><tbody>
        <Row label="輸入請購單別" req><PickField value={p.reqType} onChange={v => set({ reqType: v })} def={PK.docType('requisition')} name={names.docType(db, p.reqType)} /></Row>
        <Row label="輸入請購日期" req><DateBox value={p.reqDate} cls="req" onChange={v => set({ reqDate: v })} /></Row>
        <Row label="選擇廠商"><Radio value={p.supplierMode} opts={[['1', '1.品號之主供應商'], ['2', '2.指定廠商']]} onChange={v => set({ supplierMode: v })} /></Row>
        {p.supplierMode === '2' && <Row label="輸入廠商代號" req><PickField value={p.supplier} onChange={v => set({ supplier: v })} def={PK.supplier} name={names.supplier(db, p.supplier)} /></Row>}
        <Row label="輸入請購人員" req><PickField value={p.requester} onChange={v => set({ requester: v })} def={PK.employee} name={names.employee(db, p.requester)} /></Row>
        <Row label="選擇需求日計算方式"><Radio value={p.needMode} opts={[['1', '1.依訂單預交日往前推'], ['2', '2.依前置天數推算']]} onChange={v => set({ needMode: v })} /></Row>
        {p.needMode === '1' && <Row label="提前天數"><NumBox value={p.days} w={80} onChange={v => set({ days: v })} /></Row>}
      </tbody></table>],
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
      ['基本選項', <table className="form-table"><tbody>
        <Row label="選擇請購單號"><MultiList value={p.reqKeys} onChange={v => set({ reqKeys: v })} def={reqPick} /></Row>
        <Row label="鎖定選項"><Select value={p.lockOpt} w={140} opts={Object.entries(LOCK_OPTS).map(([k, v]) => [k, `${k}.${v}`])} onChange={v => set({ lockOpt: v as PURB01Params['lockOpt'] })} /></Row>
        <Row label="選擇廠別"><PickField value={p.plant} onChange={v => set({ plant: v })} def={PK.plant} name={names.plant(db, p.plant)} /></Row>
        <Row label="選擇庫別"><MultiList value={p.warehouses} onChange={v => set({ warehouses: v })} def={PK.warehouse} /></Row>
        <Row label="選擇幣別"><PickField value={p.currency} onChange={v => set({ currency: v })} def={PK.currency} name={names.currency(db, p.currency)} /></Row>
        <Row label="選擇採購人員"><MultiList value={p.buyers} onChange={v => set({ buyers: v })} def={PK.employee} /></Row>
      </tbody></table>],
      ['進階選項', <table className="form-table"><tbody>
        <Row label="輸入採購日期" req><DateBox value={p.poDate} cls="req" onChange={v => set({ poDate: v })} /></Row>
        <Row label="輸入採購單別" req><PickField value={p.poType} onChange={v => set({ poType: v })} def={PK.docType('purchase')} name={names.docType(db, p.poType)} /></Row>
        <Row label=""><Check label="相同交貨日彙總產生" value={p.mergeSameDate} onChange={v => set({ mergeSameDate: v })} /></Row>
        <Row label=""><Check label="拋轉備註" value={p.copyRemark} onChange={v => set({ copyRemark: v })} /></Row>
        <Row label="說明"><span className="dim">只會轉「已確認」且「有供應廠商、採購數量 &gt; 0、尚未轉採購」的請購明細。<br />產生的採購單為未確認，請到「採購單建立作業」確認。</span></Row>
      </tbody></table>],
      SYS_TAB,
    ]} />
  )
}

// ---------- 佇列工作控制台 ----------
export function QueueConsole({ close }: ProgProps) {
  const db = useDb()
  const [sel, setSel] = useState(0)
  const job: R = db.jobs[sel]
  return (
    <div className="prog queue">
      <div className="menubar"><div className="menu"><button onClick={close}>離開(X)</button></div></div>
      <div className="toolbar">
        <button className="tbtn" title="刪除選取的工作" disabled={!job} onClick={() => { commit(d => { d.jobs.splice(sel, 1) }); setSel(0) }}><Icon n="del" size={24} /></button>
      </div>
      <div className="prog-body">
        <div className="browse-list queue-list">
          <table className="grid">
            <thead><tr><th className="rh" /><th>工作編號</th><th>程式代號</th><th>程式名稱</th><th>執行方式</th><th>狀態</th><th>使用者</th><th>排入時間</th><th>開始時間</th><th>結束時間</th></tr></thead>
            <tbody>
              {db.jobs.map((j, i) => (
                <tr key={j.id} className={`${i % 2 ? 'alt' : ''} ${i === sel ? 'sel' : ''}`} onClick={() => setSel(i)}>
                  <td className="rh">{i === sel ? '▶' : ''}</td><td>{j.id}</td><td>{j.program}</td><td>{j.name}</td><td>{j.mode}</td><td>{j.status}</td><td>{j.user}</td><td>{j.queued}</td><td>{j.start}</td><td>{j.end}</td>
                </tr>
              ))}
              {!db.jobs.length && <tr><td className="rh" /><td colSpan={9} className="dim">目前沒有工作。執行批次作業後會出現在這裡。</td></tr>}
            </tbody>
          </table>
        </div>
        {job && <div className="queue-detail">
          <fieldset><legend>參數</legend>
            <table className="grid"><thead><tr><th>參數名稱</th><th>參數值</th></tr></thead>
              <tbody>{job.params.map(([k, v]: [string, string]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
          </fieldset>
          <fieldset><legend>處理結果</legend><textarea className="fld ro" readOnly value={job.result} /></fieldset>
        </div>}
      </div>
      <div className="prog-status"><span className="cell mode">瀏覽</span><span className="cell">工作數: {db.jobs.length}</span><span className="cell grow" /></div>
    </div>
  )
}
