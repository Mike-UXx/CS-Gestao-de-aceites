/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/signatarios.ts
   Deriva a lista de signatários (pendentes/concluídos) de um documento.
   Fonte única reaproveitada pelo PendenciasDrawer e pela exportação.
───────────────────────────────────────────────────────────── */
import dayjs from 'dayjs'
import { COLABORADORES } from '@/data/mockClassifications'
import type { Documento } from '@/features/listagem/types/documento'

export type SituacaoSignatario = 'Pendente' | 'Concluído'

export interface Signatario {
  nome: string
  situacao: SituacaoSignatario
  /** Data de aceite (DD/MM/YYYY) — apenas para concluídos; null para pendentes */
  dataAceite: string | null
  /** Departamento do colaborador — apenas quando o envio é por departamento */
  departamento?: string
}

/** Conjunto padrão de departamentos para distribuir quando o alvo é "Todos". */
const DEPTOS_PADRAO = ['RH', 'Jurídico', 'TI', 'Compliance', 'Financeiro']

/**
 * Constrói a lista determinística de signatários de um documento.
 * - Pendentes: os primeiros N colaboradores (N = destinatários − aceites).
 * - Concluídos: os colaboradores seguintes, com data de aceite determinística.
 * Quando o envio é por departamento, atribui cada colaborador a um dos
 * departamentos-alvo (round-robin), para permitir o agrupamento no relatório.
 */
export function buildSignatarios(doc: Documento): Signatario[] {
  const pendentes = Math.max(doc.totalDestinatarios - doc.totalAceites, 0)

  const porDepto = doc.modalidadeEnvio === 'departamento'
  const poolRaw = (doc.destinatariosPreview ?? []).filter((p) => p && p !== 'Todos')
  const pool = poolRaw.length ? poolRaw : DEPTOS_PADRAO
  const deptDe = (idx: number): string | undefined => (porDepto ? pool[idx % pool.length] : undefined)

  const pendentesList: Signatario[] = COLABORADORES
    .slice(0, pendentes)
    .map((c, i) => ({ nome: c.label, situacao: 'Pendente' as const, dataAceite: null, departamento: deptDe(i) }))

  const base = dayjs(doc.dataLancamento ?? doc.criadoEm)
  const concluidosList: Signatario[] = COLABORADORES
    .slice(pendentes, doc.totalDestinatarios)
    .map((c, i) => ({
      nome: c.label,
      situacao: 'Concluído' as const,
      dataAceite: base.add(i * 2 + 1, 'day').format('DD/MM/YYYY'),
      departamento: deptDe(pendentes + i),
    }))

  return [...pendentesList, ...concluidosList]
}
