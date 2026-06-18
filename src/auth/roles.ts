/* ─────────────────────────────────────────────────────────────
   src/auth/roles.ts
   RBAC simulado (protótipo): perfis, permissões e escopo por gestão.
   Baseado na tabela de permissões EP02 da pesquisa.
───────────────────────────────────────────────────────────── */

export type Role = 'admin' | 'gestor' | 'aprovador' | 'auditor'

export type Permission =
  | 'documento:criar'        // iniciar o wizard de criação
  | 'documento:gerenciar'    // editar, inativar, excluir, nova versão, duplicar, encerrar
  | 'documento:aprovar'      // aprovar / solicitar ajustes em documentos "Em revisão"
  | 'relatorio:exportar'     // exportar relatórios de auditoria (CSV/PDF)
  | 'classificacao:gerenciar'// criar/editar/excluir classificações
  | 'config:acessar'         // abrir Configurações
  | 'dashboard:acessar'      // ver Dashboard/Estatísticas

export interface RoleMeta {
  value: Role
  label: string
  descricao: string
  /** Iniciais para o avatar do seletor */
  iniciais: string
}

export const ROLES: RoleMeta[] = [
  { value: 'admin',     label: 'Admin Geral',    descricao: 'Acesso total · todas as gestões',        iniciais: 'AG' },
  { value: 'gestor',    label: 'Usuário Gestor', descricao: 'Gestão de TI · cria e cobra documentos', iniciais: 'GT' },
  { value: 'aprovador', label: 'Aprovador',      descricao: 'Revisa e aprova documentos',             iniciais: 'AP' },
  { value: 'auditor',   label: 'Auditor',        descricao: 'Somente leitura · exporta relatórios',   iniciais: 'AU' },
]

export const DEFAULT_ROLE: Role = 'admin'

/** Permissões por perfil. */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'documento:criar', 'documento:gerenciar', 'documento:aprovar', 'relatorio:exportar',
    'classificacao:gerenciar', 'config:acessar', 'dashboard:acessar',
  ],
  // Gestor: cria/gerencia documentos da sua área e usa classificações,
  // mas NÃO gerencia classificações (tabela EP02 → leitura).
  gestor: [
    'documento:criar', 'documento:gerenciar', 'relatorio:exportar',
    'config:acessar', 'dashboard:acessar',
  ],
  // Aprovador: revisa/aprova documentos; leitura nos demais fluxos.
  aprovador: [
    'documento:aprovar', 'dashboard:acessar',
  ],
  // Auditor: somente leitura + exportação de relatórios.
  auditor: [
    'relatorio:exportar', 'dashboard:acessar',
  ],
}

/**
 * Gestões responsáveis acessíveis por perfil.
 * 'all' = todas. Gestor é vinculado a TI para demonstrar o escopo por área.
 */
const ROLE_GESTOES: Record<Role, string[] | 'all'> = {
  admin: 'all',
  gestor: ['ti'],
  aprovador: 'all',
  auditor: 'all',
}

export function roleMeta(role: Role): RoleMeta {
  return ROLES.find((r) => r.value === role) ?? ROLES[0]
}

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm)
}

export function gestoesDoPerfil(role: Role): string[] | 'all' {
  return ROLE_GESTOES[role]
}

export function podeVerGestao(role: Role, gestao: string): boolean {
  const g = ROLE_GESTOES[role]
  return g === 'all' || g.includes(gestao)
}
