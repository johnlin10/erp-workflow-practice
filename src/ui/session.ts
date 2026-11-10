import { createContext, useContext, type FC } from 'react'

/** arg：從其他作業「串查」開啟時帶入的資料鍵（單據為 單別-單號，基本資料為代號） */
export type ProgProps = { close: () => void; arg?: string }
export type ProgramDef = {
  code: string; name: string; sys: 'ADM' | 'INV' | 'COP' | 'PUR'; folder: string
  kind: 'I' | 'B' | 'Q'; comp: FC<ProgProps>; w: number; h: number
  /** 程式代號是推測的，不顯示在標題 */
  hideCode?: boolean
}

export const Session = createContext<{ user: string; open: (code: string, arg?: string) => void }>({ user: '', open: () => {} })
export const useSession = () => useContext(Session)

/** 目前視窗的標題，對話框（複製前置單別等）沿用 */
export const WinTitle = createContext('')
export const useWinTitle = () => useContext(WinTitle)
