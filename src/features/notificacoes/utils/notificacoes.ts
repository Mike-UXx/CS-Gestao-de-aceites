/* ─────────────────────────────────────────────────────────────
   src/features/notificacoes/utils/notificacoes.ts
   Deriva notificações do gestor a partir dos documentos:
   vencimento proativo (vencidos / vencendo em 30 dias) e adesão baixa.
   Escopável por gestão (RBAC) via predicado podeVer.
───────────────────────────────────────────────────────────── */
import dayjs from 'dayjs'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import type { Documento } from '@/features/listagem/types/documento'

export type NotificacaoTipo = 'vencido' | 'vencendo' | 'pendencia'

export interface Notificacao {
  id: string
  docId: string
  titulo: string
  tipo: NotificacaoTipo
  mensagem: string
  /** Para ordenação: maior = mais urgente */
  peso: number
}

const ADESAO_BAIXA = 50 // % — abaixo disso, gera alerta de pendência

export function buildNotificacoes(
  podeVer: (gestao: string) => boolean = () => true,
  docs: Documento[] = MOCK_DOCUMENTOS,
  hoje: dayjs.Dayjs = dayjs(),
): Notificacao[] {
  const ativos = docs.filter((d) => d.status === 'Ativo' && podeVer(d.gestaoResponsavel))
  const diasAte = (d: Documento) => dayjs(d.dataExpiracao).startOf('day').diff(hoje.startOf('day'), 'day')

  const out: Notificacao[] = []

  for (const d of ativos) {
    const pct = d.totalDestinatarios > 0 ? Math.round((d.totalAceites / d.totalDestinatarios) * 100) : 100
    const pendentes = Math.max(d.totalDestinatarios - d.totalAceites, 0)

    /* ── Vigência ── */
    if (d.dataExpiracao) {
      const dias = diasAte(d)
      if (dias < 0) {
        out.push({
          id: `venc-${d.id}`, docId: d.id, titulo: d.titulo, tipo: 'vencido',
          mensagem: `Venceu há ${Math.abs(dias)} dia(s) · requer nova versão`,
          peso: 1000 + Math.abs(dias),
        })
        continue // já é o alerta mais grave do documento
      }
      if (dias <= 30) {
        out.push({
          id: `venc-${d.id}`, docId: d.id, titulo: d.titulo, tipo: 'vencendo',
          mensagem: dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s)`,
          peso: 500 - dias,
        })
        continue
      }
    }

    /* ── Adesão baixa (só quando não há alerta de vigência) ── */
    if (pendentes > 0 && pct < ADESAO_BAIXA) {
      out.push({
        id: `pend-${d.id}`, docId: d.id, titulo: d.titulo, tipo: 'pendencia',
        mensagem: `Adesão de ${pct}% · ${pendentes} pendente(s)`,
        peso: 100 + pendentes,
      })
    }
  }

  return out.sort((a, b) => b.peso - a.peso)
}
