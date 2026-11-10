import { useEffect, useState } from 'react'
import { requestPersist, takeLoadProblem, useDb } from './db/store'
import { isDate, today } from './domain/docs'
import { Icon } from './ui/icons'
import { MessageHost, msgbox } from './ui/msg'
import { Shell } from './ui/Shell'

const LAST_USER = 'erp-workflow-practice:lastUser'

export default function App() {
  const [user, setUser] = useState('')
  useEffect(() => { const p = takeLoadProblem(); if (p) msgbox(p, { icon: 'error' }) }, [])
  return (
    <>
      {user ? <Shell user={user} onLogout={() => setUser('')} /> : <Login onLogin={u => { requestPersist(); setUser(u) }} />}
      <MessageHost />
    </>
  )
}

function Login({ onLogin }: { onLogin: (u: string) => void }) {
  const db = useDb()
  const [id, setId] = useState(() => { try { return localStorage.getItem(LAST_USER) ?? '' } catch { return '' } })
  const [pw, setPw] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const u = db.users.find(x => x.id === id.trim())
    if (!u || u.password !== pw) return void msgbox('登入者代號或密碼錯誤！', { icon: 'warn' })
    if (u.locked) return void msgbox('此帳號已鎖定，請洽系統管理員。', { icon: 'warn' })
    if (u.expiry && isDate(u.expiry) && u.expiry < today()) return void msgbox(`此帳號已於 ${u.expiry} 失效。`, { icon: 'warn' })
    if (u.companies && !u.companies.split(/[,\s]+/).includes(db.company)) return void msgbox(`此帳號不可登入公司別「${db.company}」。`, { icon: 'warn' })
    try { localStorage.setItem(LAST_USER, u.id) } catch { /* ignore */ }
    onLogin(u.id)
  }

  return (
    <div className="login-bg">
      <form className="login" onSubmit={submit}>
        <div className="login-title"><Icon n="app" size={22} />ERP 流程練習室 - 登入</div>
        <div className="login-body">
          <label>公司別<select value={db.company} onChange={() => {}}><option>{db.company}</option></select></label>
          <label>登入者代號<input autoFocus value={id} onChange={e => setId(e.target.value)} autoComplete="username" /></label>
          <label>密碼<input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" /></label>
          <div className="login-hint">
            預設帳號：admin　密碼：admin<br />
            這是練習用的登入，密碼以明碼存在瀏覽器中，<b>請勿使用真實密碼</b>。
          </div>
        </div>
        <div className="login-buttons"><button type="submit">✔ 登入</button></div>
        <div className="login-foot">非官方練習工具，與任何 ERP 軟體廠商無關。</div>
      </form>
    </div>
  )
}
