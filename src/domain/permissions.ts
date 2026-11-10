import type { DB, PermLine } from '../db/schema'

export type Action = 'run' | 'add' | 'query' | 'edit' | 'del' | 'confirm' | 'unconfirm' | 'void' | 'output'

export const isSuper = (db: DB, user: string) => !!db.perms.find(p => p.userId === user)?.superuser

export function permLine(db: DB, user: string, program: string): PermLine | undefined {
  return db.perms.find(p => p.userId === user)?.lines.find(l => l.program === program)
}

export function can(db: DB, user: string, program: string, action: Action) {
  if (isSuper(db, user)) return true
  const l = permLine(db, user, program)
  return !!l && l.run && l[action]
}

export function visibility(db: DB, user: string, program: string, what: 'price' | 'cost') {
  if (isSuper(db, user)) return 'general'
  return permLine(db, user, program)?.[what] ?? 'general'
}
