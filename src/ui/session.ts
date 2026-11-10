import { createContext, useContext, type FC } from 'react'

export type ProgProps = { close: () => void }
export type ProgramDef = {
  code: string; name: string; sys: 'ADM' | 'INV' | 'COP' | 'PUR'; folder: string
  kind: 'I' | 'B' | 'Q'; comp: FC<ProgProps>; w: number; h: number
  /** 程式代號是推測的，不顯示在標題 */
  hideCode?: boolean
}

export const Session = createContext<{ user: string; open: (code: string) => void }>({ user: '', open: () => {} })
export const useSession = () => useContext(Session)
