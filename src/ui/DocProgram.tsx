/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type { DB, DocKind } from '../db/schema'
import { commit, useDb } from '../db/store'
import { today } from '../domain/docs'
import { can, visibility, type Action } from '../domain/permissions'
import { Check, DateBox, NumBox, Select, TextBox } from './fields'
import { Icon } from './icons'
import { ask, err, msgbox } from './msg'
import { Picker, type PickDef } from './Picker'
import { useSession, useWinTitle } from './session'

export type Mode = 'browse' | 'add' | 'edit'
type R = any
type Ro = boolean | ((r: R, mode: Mode) => boolean)

export type FieldDef = {
  k: string; label: string
  t?: 'text' | 'num' | 'date' | 'check' | 'select' | 'ro' | 'pw'
  pk?: boolean; req?: boolean; ro?: Ro
  pick?: PickDef
  /** 開窗選取後怎麼套用到資料（預設只填入這個欄位） */
  pickApply?: (r: R, row: R, db: DB) => R
  opts?: [string, string][]
  /** 欄位右邊顯示的名稱，例如客戶代號旁的客戶簡稱 */
  name?: (db: DB, r: R) => string
  w?: number; span?: number
  mask?: 'price' | 'cost'
  /** t='ro' 時的顯示內容 */
  show?: (r: R, db: DB) => string | number
  /** 欄位後面的文字，例如「萬」「人」 */
  suffix?: string
  /** 同一格裡接在後面的其他欄位，例如「版次 [0000] □不控管信用額度」 */
  with?: FieldDef[]
}
export type Rows = (FieldDef | null)[][]

export type ColDef = {
  k: string; label: string; w: number
  t?: 'text' | 'num' | 'date' | 'check'
  req?: boolean; pk?: boolean; ro?: boolean | ((line: R, rec: R) => boolean)
  pick?: PickDef; mask?: 'price' | 'cost'
  show?: (line: R, rec: R, db: DB) => string | number
}

export type CopyDef = {
  labels: [string, string] // 前置單別／前置單號 或 來源單別／來源單號
  sources: { label: string; kind?: DocKind }[]
  candidates: (db: DB, kind: DocKind) => { cols: PickDef['cols']; rows: R[] }
  apply: (db: DB, rec: R, kind: DocKind, type: string, no: string) => R
  extraCheck?: string
  extraSelect?: string
}

export type DocConfig = {
  code: string
  records: (db: DB) => R[]
  key: (r: R) => string
  blank?: (db: DB) => R
  /** 新增模式下切換單別或日期時重新預覽單號 */
  renumber?: (db: DB, r: R) => R
  header: Rows
  tabs?: { label: string; rows: Rows }[]
  lines?: {
    cols: ColDef[]
    blank?: (rec: R, db: DB) => R
    onChange?: (line: R, k: string, db: DB, rec: R) => R
    editable?: (rec: R, mode: Mode) => boolean
  }
  /** 單身旁邊的面板（使用者權限建立作業用） */
  side?: (p: { rec: R; line: number; editable: boolean; setLine: (patch: R) => void }) => ReactNode
  totals?: (r: R, db: DB, mask: (k: 'price' | 'cost', v: number) => string | number) => [string, string | number][][]
  onField?: (r: R, k: string, db: DB) => R
  save?: (draft: DB, r: R, isNew: boolean, user: string) => R
  remove?: (draft: DB, r: R) => void
  confirm?: (draft: DB, r: R, user: string) => void
  unconfirm?: (draft: DB, r: R) => void
  voidIt?: (draft: DB, r: R) => void
  /** 工具列上額外的按鈕（報價單的客戶確認），run 回傳完成訊息 */
  extraTools?: { icon: string; label: string; on: (r: R) => boolean; run: (draft: DB, r: R) => string }[]
  status?: (r: R) => string
  copyFrom?: CopyDef
  browse: [string, (r: R, db: DB) => string | number][]
  query: [string, (r: R) => string][]
  /** 回傳訊息表示不可修改 */
  editCheck?: (r: R) => string | null
  noAdd?: boolean
  noDelete?: boolean
  /** 新增按鈕的替代流程（訂單變更單：先選原訂單） */
  beforeAdd?: (db: DB, setEdit: (r: R) => void) => void
}


export function DocProgram({ cfg, close }: { cfg: DocConfig; close: () => void }) {
  const db = useDb()
  const { user } = useSession()
  const [mode, setMode] = useState<Mode>('browse')
  const [keys, setKeys] = useState<string[]>([])
  const [idx, setIdx] = useState(-1)
  const [edit, setEdit] = useState<R>(null)
  const [tab, setTab] = useState<'detail' | 'browse'>('detail')
  const [sub, setSub] = useState(0)
  const [selLine, setSelLine] = useState(-1)
  const [picker, setPicker] = useState<{ def: PickDef; onPick: (row: R) => void } | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [queryOpen, setQueryOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)

  const records = cfg.records(db)
  const byKey = useMemo(() => new Map(records.map(r => [cfg.key(r), r])), [records, cfg])
  const cur: R = mode === 'browse' ? byKey.get(keys[idx]) ?? null : edit
  const status = cur && cfg.status ? cfg.status(cur) : ''
  const lines: R[] = cur?.lines ?? []
  const allow = (a: Action) => can(db, user, cfg.code, a)
  const vis = (k: 'price' | 'cost') => visibility(db, user, cfg.code, k)
  const mask = (k: 'price' | 'cost', v: number) => (vis(k) === 'hidden' ? '****' : v)
  const editing = mode !== 'browse'
  const linesEditable = editing && !!cfg.lines && (cfg.lines.editable?.(cur, mode) ?? true)

  // ---------- 動作 ----------
  const run = (fn: () => void) => { try { fn() } catch (e) { err(e) } }
  const setField = (k: string, v: unknown) => setEdit((e: R) => {
    let n = { ...e, [k]: v }
    if (mode === 'add' && cfg.renumber && (k === 'type' || k === 'date')) n = cfg.renumber(db, n)
    return cfg.onField?.(n, k, db) ?? n
  })
  const setLine = (i: number, k: string, v: unknown) => setEdit((e: R) => {
    const ls = [...e.lines]
    let l = i < ls.length ? { ...ls[i] } : cfg.lines!.blank!(e, db)
    l[k] = v
    l = cfg.lines!.onChange?.(l, k, db, e) ?? l
    ls[i] = l
    return { ...e, lines: ls }
  })
  const patchLine = (patch: R) => setEdit((e: R) => {
    const ls = [...e.lines]; ls[selLine] = { ...ls[selLine], ...patch }; return { ...e, lines: ls }
  })

  const doAdd = () => {
    if (cfg.beforeAdd) return cfg.beforeAdd(db, r => { setEdit(r); setMode('add'); setTab('detail'); setSelLine(-1) })
    setEdit(cfg.blank!(db)); setMode('add'); setTab('detail'); setSelLine(-1)
  }
  const doEdit = () => {
    if (cfg.status && status !== 'N') return void msgbox(status === 'Y' ? '單據已確認，不可修改。\n如需修改，請先「取消確認」。' : '單據已作廢，不可修改。', { icon: 'warn' })
    const why = cfg.editCheck?.(cur)
    if (why) return void msgbox(why, { icon: 'warn' })
    setEdit(structuredClone(cur)); setMode('edit'); setTab('detail')
  }
  const doSave = () => run(() => {
    const saved = commit(d => cfg.save!(d, structuredClone(edit), mode === 'add', user))
    const k = cfg.key(saved)
    const ks = keys.includes(k) ? keys : [...keys, k]
    setKeys(ks); setIdx(ks.indexOf(k)); setMode('browse'); setEdit(null)
  })
  const doCancel = () => { setMode('browse'); setEdit(null) }
  const doDelete = async () => {
    if (!(await ask('是否確定刪除此筆資料？'))) return
    run(() => { commit(d => cfg.remove!(d, cur)); const ks = keys.filter((_, i) => i !== idx); setKeys(ks); setIdx(Math.min(idx, ks.length - 1)) })
  }
  const doConfirm = () => run(() => { commit(d => cfg.confirm!(d, cur, user)); msgbox('確認完成。') })
  const doUnconfirm = async () => {
    if (!(await ask('是否確定取消確認？'))) return
    run(() => commit(d => cfg.unconfirm!(d, cur)))
  }
  const doVoid = async () => {
    if (!(await ask('作廢後無法復原，是否確定作廢？'))) return
    run(() => commit(d => cfg.voidIt!(d, cur)))
  }
  const deleteLine = () => {
    if (selLine < 0 || selLine >= lines.length) return
    setEdit((e: R) => ({ ...e, lines: e.lines.filter((_: R, i: number) => i !== selLine) }))
    setSelLine(-1)
  }
  const closeWin = async () => {
    if (editing && !(await ask('資料尚未存檔，是否放棄並離開？'))) return
    close()
  }

  const canEditCur = !!cur && !!cfg.save && (!cfg.status || status === 'N')
  type Tool = { icon: string; label: string; on: boolean; run: () => void; sep?: boolean }
  const tools: Tool[] = [
    { icon: 'new', label: '新增', on: !editing && !cfg.noAdd && !!(cfg.blank || cfg.beforeAdd) && allow('add'), run: doAdd },
    { icon: 'query', label: '查詢', on: !editing && allow('query'), run: () => setQueryOpen(true) },
    { icon: 'edit', label: '修改', on: !editing && canEditCur && allow('edit'), run: doEdit },
    { icon: 'del', label: '刪除', on: !editing && !!cur && !!cfg.remove && !cfg.noDelete && (!cfg.status || status === 'N') && allow('del'), run: doDelete },
    { icon: 'print', label: '列印', on: !editing && !!cur && allow('output'), run: () => msgbox('練習版未提供列印功能。') },
    { icon: 'first', label: '第一筆', on: !editing && keys.length > 0, run: () => setIdx(0), sep: true },
    { icon: 'prev', label: '上一筆', on: !editing && idx > 0, run: () => setIdx(idx - 1) },
    { icon: 'next', label: '下一筆', on: !editing && idx < keys.length - 1, run: () => setIdx(idx + 1) },
    { icon: 'last', label: '最後一筆', on: !editing && keys.length > 0, run: () => setIdx(keys.length - 1) },
    { icon: 'view', label: '檢視', on: !editing, run: () => setTab(t => (t === 'detail' ? 'browse' : 'detail')) },
    { icon: 'ok', label: '確定(存檔)', on: editing, run: doSave, sep: true },
    { icon: 'cancel', label: '放棄', on: editing, run: doCancel },
    ...(cfg.confirm ? [
      { icon: 'confirm', label: '確認', on: !editing && status === 'N' && allow('confirm'), run: doConfirm, sep: true },
      { icon: 'unconfirm', label: '取消確認', on: !editing && status === 'Y' && !!cfg.unconfirm && allow('unconfirm'), run: doUnconfirm },
    ] : []),
    ...(cfg.extraTools ?? []).map(t => ({ icon: t.icon, label: t.label, on: !editing && !!cur && t.on(cur), run: () => run(() => { let m = ''; commit(d => { m = t.run(d, cur) }); msgbox(m) }) })),
    ...(cfg.voidIt ? [{ icon: 'void', label: '作廢', on: !editing && status === 'N' && allow('void'), run: doVoid }] : []),
    ...(cfg.copyFrom ? [{ icon: 'copyFrom', label: '複製前置單別', on: mode === 'add', run: () => setCopyOpen(true), sep: true }] : []),
    ...(cfg.lines?.blank ? [{ icon: 'delLine', label: '刪除單身(選取列)', on: linesEditable && selLine >= 0 && selLine < lines.length, run: deleteLine }] : []),
  ]
  const menus: Record<string, Tool[]> = {
    '資料(D)': tools.filter(t => ['新增', '查詢', '修改', '刪除', '確定(存檔)', '放棄', '第一筆', '上一筆', '下一筆', '最後一筆'].includes(t.label)),
    '功能(F)': tools.filter(t => ['確認', '取消確認', '作廢', '複製前置單別', '刪除單身(選取列)', '列印', '檢視'].includes(t.label)),
  }

  // ---------- 欄位 ----------
  const fieldRo = (f: FieldDef) => {
    if (!editing || !cur) return true
    if (f.t === 'ro') return true
    if (f.pk && mode === 'edit') return true
    if (f.mask && vis(f.mask) !== 'general') return true
    return typeof f.ro === 'function' ? f.ro(cur, mode) : !!f.ro
  }
  const openPick = (def: PickDef, apply: (row: R) => void) => setPicker({ def, onPick: apply })

  const renderField = (f: FieldDef, inline = false): ReactNode => {
    // 原系統：永遠唯讀的欄位是灰底；其他欄位在瀏覽模式下也保留青色（主鍵）、黃色（必填）、白色
    const fixed = f.t === 'ro' || f.ro === true || (!!f.mask && vis(f.mask) !== 'general')
    const off = fieldRo(f)
    const ro = off && fixed
    const lock = off && !fixed
    const v = cur?.[f.k]
    const cls = f.pk ? 'pk' : f.req ? 'req' : ''
    const masked = f.mask && vis(f.mask) === 'hidden'
    const check = <Check key={f.k} label={f.label} value={!!v} ro={ro} lock={lock} onChange={x => setField(f.k, x)} />
    if (f.t === 'check' && inline) return check
    if (f.t === 'check') return <td colSpan={2 * (f.span ?? 1)} className="fcell" key={f.k}>{check}</td>
    let input: ReactNode
    if (masked) input = <TextBox value="****" ro w={f.w ?? 140} />
    else if (f.t === 'ro') input = <TextBox value={cur ? String(f.show ? f.show(cur, db) : v ?? '') : ''} ro w={f.w ?? 140} cls={cls} align={typeof v === 'number' ? 'right' : undefined} />
    else if (f.t === 'num') input = <NumBox value={v ?? 0} ro={ro} lock={lock} cls={cls} w={f.w ?? 140} onChange={x => setField(f.k, x)} />
    else if (f.t === 'date') input = <DateBox value={v ?? ''} ro={ro} lock={lock} cls={cls} w={f.w} onChange={x => setField(f.k, x)} />
    else if (f.t === 'pw') input = <input type="password" className={`fld ${cls} ${ro ? 'ro' : ''}`} style={{ width: f.w ?? 300 }} readOnly={off} value={v ?? ''} onChange={e => setField(f.k, e.target.value)} autoComplete="new-password" />
    else if (f.t === 'select') input = <Select value={v ?? ''} ro={ro} lock={lock} cls={cls} opts={f.opts ?? []} w={f.w ?? 160} onChange={x => setField(f.k, x)} />
    else input = <TextBox value={v ?? ''} ro={ro} lock={lock} cls={cls} w={f.w ?? 140} onChange={x => setField(f.k, x)} />
    const body = (
      <span className="fld-wrap" key={f.k}>
        {inline && f.label && <span className="flabel inl">{f.label}</span>}
        {input}
        {f.pick && (
          <button type="button" className="fld-icon" disabled={off} title="開窗查詢"
            onClick={() => openPick(f.pick!, row => f.pickApply ? setEdit((e: R) => f.pickApply!(e, row, db)) : setField(f.k, f.pick!.val(row)))}>
            <Icon n={f.pick.icon ?? 'pick'} size={18} />
          </button>
        )}
        {f.suffix && <span className="fname">{f.suffix}</span>}
        {f.name && cur && <span className="fname">{f.name(db, cur)}</span>}
        {f.with?.map(x => renderField(x, true))}
      </span>
    )
    if (inline) return body
    return (
      <Fragment key={f.k}>
        <td className="flabel">{f.label}</td>
        <td className="fcell" colSpan={2 * (f.span ?? 1) - 1}>{body}</td>
      </Fragment>
    )
  }
  const renderRows = (rows: Rows) => (
    <table className="form-table"><tbody>
      {rows.map((row, i) => (
        <tr key={i}>{row.map((f, j) => (f ? renderField(f) : <Fragment key={'n' + j}><td /><td /></Fragment>))}</tr>
      ))}
    </tbody></table>
  )

  // ---------- 單身 ----------
  const renderCell = (c: ColDef, l: R, i: number, isNewRow: boolean) => {
    const ro = !linesEditable || (typeof c.ro === 'function' ? c.ro(l, cur) : !!c.ro) || (!!c.mask && vis(c.mask) !== 'general')
    const v = l?.[c.k]
    if (c.mask && vis(c.mask) === 'hidden') return '****'
    if (c.show) return c.show(l, cur, db)
    if (ro) return c.t === 'check' ? (v ? '✔' : '') : v ?? ''
    if (c.t === 'check') return <input type="checkbox" checked={!!v} onChange={e => setLine(i, c.k, e.target.checked)} />
    const common = { className: 'cell-in' + (c.t === 'num' ? ' num' : '') }
    return (
      <span className="cell-wrap">
        {c.t === 'num'
          ? <NumBox value={isNewRow ? 0 : v ?? 0} w="100%" onChange={x => setLine(i, c.k, x)} />
          : c.t === 'date'
            ? <DateBox value={isNewRow ? '' : v ?? ''} w="100%" onChange={x => setLine(i, c.k, x)} />
            : <input {...common} value={isNewRow ? '' : v ?? ''} onChange={e => setLine(i, c.k, e.target.value)} />}
        {c.pick && <button type="button" className="cell-pick" title="開窗查詢" onClick={() => openPick(c.pick!, row => setLine(i, c.k, c.pick!.val(row)))}>…</button>}
      </span>
    )
  }
  const renderLines = (editable: boolean, height?: number) => {
    if (!cfg.lines) return null
    const showNew = editable && !!cfg.lines.blank
    // 新增列跟一般列用同一個 key 序列，輸入第一個字後焦點才不會跑掉
    const rows: R[] = showNew ? [...lines, null] : lines
    return (
      <div className="lines" style={height ? { height, flex: "none" } : undefined}>
        <table className="grid">
          <thead><tr>
            <th className="rh"><Icon n="pick" size={16} /></th>
            {cfg.lines.cols.map(c => <th key={c.k} style={{ minWidth: c.w, width: c.w }} className={c.pk ? 'pk' : c.req ? 'req' : ''}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={i} className={`${i % 2 ? 'alt' : ''} ${i === selLine ? 'cur' : ''} ${l === null ? 'newrow' : ''}`} onClick={() => setSelLine(i)}>
                <td className="rh">{l === null ? '▶' : i === selLine ? (editable ? 'I' : '▶') : ''}</td>
                {cfg.lines!.cols.map(c => <td key={c.k} className={c.t === 'num' ? 'num' : ''}>{renderCell(c, l ?? {}, i, l === null)}</td>)}
              </tr>
            ))}
            {!rows.length && (
              <tr className="newrow"><td className="rh">▶</td>{cfg.lines.cols.map(c => <td key={c.k} />)}</tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  const totals = cur && cfg.totals ? cfg.totals(cur, db, mask) : null
  const selItem = lines[selLine]?.item ? `${lines[selLine].item} ${lines[selLine].name ?? ''}` : ''

  return (
    <div className="prog" onClick={() => menu && setMenu(null)}>
      <div className="menubar">
        {Object.keys(menus).map(m => (
          <div key={m} className="menu">
            <button onClick={e => { e.stopPropagation(); setMenu(menu === m ? null : m) }}>{m}</button>
            {menu === m && (
              <div className="menu-pop">
                {menus[m].map(t => <button key={t.label} disabled={!t.on} onClick={() => { setMenu(null); t.run() }}><Icon n={t.icon} size={16} />{t.label}</button>)}
              </div>
            )}
          </div>
        ))}
        <div className="menu"><button onClick={closeWin}>離開(X)</button></div>
      </div>
      <div className="toolbar">
        {tools.map(t => (
          <Fragment key={t.label}>
            {t.sep && <span className="tsep" />}
            <button className="tbtn" disabled={!t.on} title={t.label} aria-label={t.label} onClick={t.run}><Icon n={t.icon} size={24} /></button>
          </Fragment>
        ))}
      </div>
      <div className="tabs main-tabs">
        <button className={tab === 'detail' ? 'on' : ''} onClick={() => setTab('detail')}>詳細欄位</button>
        <button className={tab === 'browse' ? 'on' : ''} onClick={() => !editing && setTab('browse')}>資料瀏覽</button>
      </div>

      {tab === 'detail' ? (
        <div className="prog-body">
          <div className="header-area">{renderRows(cfg.header)}</div>
          {cfg.tabs && <>
            <div className="tabs sub-tabs">
              {cfg.tabs.map((t, i) => <button key={t.label} className={sub === i ? 'on' : ''} onClick={() => setSub(i)}>{t.label}</button>)}
            </div>
            <div className="subtab-area">{renderRows(cfg.tabs[sub].rows)}</div>
          </>}
          {cfg.lines && (
            <div className="lines-row">
              {renderLines(linesEditable)}
              {cfg.side && cfg.side({ rec: cur ?? { lines: [] }, line: selLine, editable: linesEditable, setLine: patchLine })}
            </div>
          )}
          {totals && (
            <table className="form-table totals"><tbody>
              {totals.map((row, i) => (
                <tr key={i}>{row.map(([l, v]) => (
                  <Fragment key={l}><td className="flabel">{l}</td><td><TextBox value={String(v)} ro w={150} align="right" /></td></Fragment>
                ))}</tr>
              ))}
            </tbody></table>
          )}
        </div>
      ) : (
        <div className="prog-body">
          <div className="browse-list">
            <table className="grid">
              <thead><tr><th className="rh" />{cfg.browse.map(([l]) => <th key={l}>{l}</th>)}</tr></thead>
              <tbody>
                {keys.map((k, i) => {
                  const r = byKey.get(k)
                  if (!r) return null
                  return (
                    <tr key={k} className={`${i % 2 ? 'alt' : ''} ${i === idx ? 'cur' : ''}`} onClick={() => setIdx(i)} onDoubleClick={() => setTab('detail')}>
                      <td className="rh">{i === idx ? '▶' : ''}</td>
                      {cfg.browse.map(([l, f]) => <td key={l}>{f(r, db)}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {cfg.lines && renderLines(false, 260)}
        </div>
      )}

      <div className="prog-status">
        <span className="cell mode">{mode === 'browse' ? '瀏覽' : mode === 'add' ? '新增' : '修改'}</span>
        <span className="cell">{cfg.lines ? `單身資料筆數: ${lines.length}` : ''}</span>
        <span className="cell grow">{selItem}</span>
        <span className="cell">127.0.0.1 - 211</span>
      </div>

      {picker && <Picker def={picker.def} db={db} rec={cur} onPick={picker.onPick} onClose={() => setPicker(null)} />}
      {queryOpen && <QueryDialog fields={cfg.query} onClose={() => setQueryOpen(false)} onOk={conds => {
        const hit = records.filter(r => conds.every(([get, op, v]) => {
          if (!v) return true
          const x = get(r)
          return op === '=' ? x === v : op === '>=' ? x >= v : op === '<=' ? x <= v : x.includes(v)
        })).map(cfg.key).sort()
        setQueryOpen(false)
        if (!hit.length) { msgbox('查無符合條件的資料。'); setKeys([]); setIdx(-1); return }
        setKeys(hit); setIdx(0)
      }} />}
      {copyOpen && cfg.copyFrom && <CopyDialog def={cfg.copyFrom} db={db} onClose={() => setCopyOpen(false)}
        onOk={(kind, type, no) => run(() => { setEdit(cfg.copyFrom!.apply(db, edit, kind, type, no)); setCopyOpen(false) })} />}
    </div>
  )
}

// ---------- 設定查詢條件 ----------
function QueryDialog({ fields, onOk, onClose }: { fields: DocConfig['query']; onOk: (c: [(r: R) => string, string, string][]) => void; onClose: () => void }) {
  const [vals, setVals] = useState(fields.map(() => ({ op: '=', v: '' })))
  return (
    <div className="modal-mask" onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="dlg query" role="dialog" aria-label="設定查詢條件">
        <div className="dlg-title">設定查詢條件<button className="win-btn close" onClick={onClose}>✕</button></div>
        <div className="query-top">總資料筆數限制 <select><option>500</option></select></div>
        <div className="tabs sub-tabs"><button className="on">一般選項</button><button disabled>自定常用欄位選項</button><button disabled>進階設定</button></div>
        <form className="query-body" onSubmit={e => { e.preventDefault(); onOk(fields.map(([, get], i) => [get, vals[i].op, vals[i].v.trim()])) }}>
          <table className="form-table"><tbody>
            {fields.map(([l], i) => (
              <tr key={l}>
                <td className="flabel">{l}</td>
                <td><select value={vals[i].op} onChange={e => setVals(vs => vs.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}>{['=', '>=', '<=', '包含'].map(o => <option key={o}>{o}</option>)}</select></td>
                <td><input className="fld" autoFocus={i === 0} style={{ width: 260 }} value={vals[i].v} onChange={e => setVals(vs => vs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} /></td>
              </tr>
            ))}
          </tbody></table>
          <div className="query-hint">條件留白表示查詢全部資料。</div>
          <div className="dlg-buttons">
            <button type="submit"><Icon n="ok" size={18} />確定(<u>O</u>)</button>
            <button type="button" onClick={onClose}><Icon n="cancel" size={18} />取消(<u>C</u>)</button>
            <button type="button" disabled>▶ 自訂(<u>S</u>)</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- 複製前置單別 ----------
function CopyDialog({ def, db, onOk, onClose }: { def: CopyDef; db: DB; onOk: (k: DocKind, type: string, no: string) => void; onClose: () => void }) {
  const title = useWinTitle()
  const [src, setSrc] = useState(0)
  const [type, setType] = useState('')
  const [no, setNo] = useState('')
  const [chk, setChk] = useState(true)
  const [pick, setPick] = useState(false)
  const kind = def.sources[src].kind!
  const cand = def.candidates(db, kind)
  const pickDef: PickDef = { cols: cand.cols, rows: () => cand.rows.filter((r: R) => !type || r.type === type), val: (r: R) => r.no }
  return (
    <div className="modal-mask" onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="dlg copy" role="dialog" aria-label="複製前置單別">
        <div className="dlg-title"><Icon n="app" size={18} /><span className="grow">{title}</span><button className="win-btn">─</button><button className="win-btn">☐</button><button className="win-btn close" onClick={onClose}>✕</button></div>
        <div className="copy-body">
          <table className="form-table"><tbody>
            <tr><td className="flabel">複製來源</td><td>
              <div className="radio-box">
                {def.sources.map((s, i) => (
                  <label key={s.label} className={s.kind ? '' : 'dim'}>
                    <input type="radio" checked={src === i} disabled={!s.kind} onChange={() => { setSrc(i); setType(''); setNo('') }} />{s.label}
                  </label>
                ))}
              </div>
            </td></tr>
            <tr><td className="flabel">{def.labels[0]}</td><td><span className="fld-wrap">
              <input className="fld req" style={{ width: 240 }} value={type} onChange={e => setType(e.target.value)} autoFocus />
              <button type="button" className="fld-icon" title="開窗查詢" onClick={() => setPick(true)}><Icon n="tree" size={18} /></button>
            </span></td></tr>
            <tr><td className="flabel">{def.labels[1]}</td><td><input className="fld req" style={{ width: 280 }} value={no} onChange={e => setNo(e.target.value)} /></td></tr>
            {def.extraCheck && <tr><td /><td><Check label={def.extraCheck} value={chk} onChange={setChk} /></td></tr>}
            {def.extraSelect && <tr><td className="flabel">{def.extraSelect}</td><td><Select value="" opts={[]} ro w={220} /></td></tr>}
          </tbody></table>
        </div>
        <div className="dlg-buttons">
          <button onClick={() => (type && no ? onOk(kind, type.trim(), no.trim()) : msgbox(`請輸入${def.labels[0]}與${def.labels[1]}。`, { icon: 'warn' }))}><Icon n="ok" size={18} />確定</button>
          <button onClick={onClose}><Icon n="cancel" size={18} />取消</button>
        </div>
      </div>
      {pick && <Picker def={pickDef} db={db} onClose={() => setPick(false)} onPick={(r: R) => { setType(r.type); setNo(r.no) }} />}
    </div>
  )
}

export const todayStr = today
