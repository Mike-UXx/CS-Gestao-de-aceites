/* ─────────────────────────────────────────────────────────────
   src/auth/RoleContext.tsx
   Contexto do perfil ativo (RBAC simulado). Persiste no localStorage
   e expõe helpers de permissão e escopo por gestão.
───────────────────────────────────────────────────────────── */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  type Role, type Permission, DEFAULT_ROLE, hasPermission, gestoesDoPerfil, podeVerGestao,
} from './roles'

const STORAGE_KEY = 'gestao_aceites_role'

interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
  can: (perm: Permission) => boolean
  /** Gestões acessíveis pelo perfil ('all' = todas) */
  gestoes: string[] | 'all'
  /** Se o perfil enxerga documentos/classificações de uma gestão */
  podeVerGestao: (gestao: string) => boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

function readStoredRole(): Role {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as Role | null
    if (raw === 'admin' || raw === 'gestor' || raw === 'aprovador' || raw === 'auditor') return raw
  } catch { /* noop */ }
  return DEFAULT_ROLE
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => readStoredRole())

  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    try { localStorage.setItem(STORAGE_KEY, r) } catch { /* noop */ }
  }, [])

  const can = useCallback((perm: Permission) => hasPermission(role, perm), [role])
  const verGestao = useCallback((gestao: string) => podeVerGestao(role, gestao), [role])

  return (
    <RoleContext.Provider value={{ role, setRole, can, gestoes: gestoesDoPerfil(role), podeVerGestao: verGestao }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole deve ser usado dentro de RoleProvider')
  return ctx
}
