/* ─────────────────────────────────────────────────────────────
   src/features/dashboard/utils/metrics.ts
   Cálculo das métricas agregadas (cross-documento) do Dashboard do Gestor.
   Função pura — recebe a lista de documentos e a data de referência.
───────────────────────────────────────────────────────────── */
import dayjs from 'dayjs'
import { GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import type { Documento } from '@/features/listagem/types/documento'

export interface DocAtencao {
  id: string
  titulo: string
  area: string
  /** Dias até a expiração (negativo = já vencido) */
  diasRestantes: number
  dataExpiracao: string
  pendencias: number
}

export interface AreaPendencia {
  area: string
  pendencias: number
  /** Soma de destinatários dos documentos ativos da área */
  destinatarios: number
}

export interface DashboardMetrics {
  totalPublicados: number
  ativos: number
  agendados: number
  concluidos: number
  expirados: number
  inativos: number
  /** % média de adesão entre os documentos ativos com destinatários */
  adesaoMedia: number
  destinatariosTotais: number
  aceitesTotais: number
  pendenciasTotais: number
  /** Ativos cuja vigência já passou (status ainda Ativo) */
  vencidos: number
  /** Ativos que vencem nos próximos 30 dias */
  vencendo30: number
  /** Ativos que vencem nos próximos 7 dias */
  vencendo7: number
  /** Documentos que requerem atenção (vencidos + vencendo em 30d), ordenados por urgência */
  atencao: DocAtencao[]
  /** Pendências de aceite agrupadas por área responsável (apenas áreas com ativos) */
  pendenciasPorArea: AreaPendencia[]
}

function areaLabel(value: string): string {
  return GESTOES_RESPONSAVEIS.find((g) => g.value === value)?.label ?? value
}

export function getDashboardMetrics(
  docs: Documento[],
  hoje: dayjs.Dayjs = dayjs(),
): DashboardMetrics {
  const publicados = docs.filter((d) => d.status !== 'Rascunho')
  const ativos = publicados.filter((d) => d.status === 'Ativo')

  const pendenciasDoc = (d: Documento) => Math.max(d.totalDestinatarios - d.totalAceites, 0)

  /* ── Adesão média (somente ativos com destinatários) ── */
  const ativosComDest = ativos.filter((d) => d.totalDestinatarios > 0)
  const adesaoMedia = ativosComDest.length
    ? Math.round(
        ativosComDest.reduce((acc, d) => acc + d.totalAceites / d.totalDestinatarios, 0) /
          ativosComDest.length * 100,
      )
    : 0

  /* ── Vigência ── */
  const diasAte = (d: Documento) => dayjs(d.dataExpiracao).startOf('day').diff(hoje.startOf('day'), 'day')

  const atencao: DocAtencao[] = ativos
    .filter((d) => d.dataExpiracao && diasAte(d) <= 30)
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      area: areaLabel(d.gestaoResponsavel),
      diasRestantes: diasAte(d),
      dataExpiracao: d.dataExpiracao as string,
      pendencias: pendenciasDoc(d),
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  /* ── Pendências por área (ativos) ── */
  const areaMap = new Map<string, AreaPendencia>()
  for (const d of ativos) {
    const label = areaLabel(d.gestaoResponsavel)
    const cur = areaMap.get(label) ?? { area: label, pendencias: 0, destinatarios: 0 }
    cur.pendencias += pendenciasDoc(d)
    cur.destinatarios += d.totalDestinatarios
    areaMap.set(label, cur)
  }
  const pendenciasPorArea = Array.from(areaMap.values()).sort((a, b) => b.pendencias - a.pendencias)

  return {
    totalPublicados: publicados.length,
    ativos: ativos.length,
    agendados: publicados.filter((d) => d.status === 'Agendado').length,
    concluidos: publicados.filter((d) => d.status === 'Concluído').length,
    expirados: publicados.filter((d) => d.status === 'Expirado').length,
    inativos: publicados.filter((d) => d.status === 'Inativo').length,
    adesaoMedia,
    destinatariosTotais: ativos.reduce((acc, d) => acc + d.totalDestinatarios, 0),
    aceitesTotais: ativos.reduce((acc, d) => acc + d.totalAceites, 0),
    pendenciasTotais: ativos.reduce((acc, d) => acc + pendenciasDoc(d), 0),
    vencidos: ativos.filter((d) => d.dataExpiracao && diasAte(d) < 0).length,
    vencendo30: ativos.filter((d) => d.dataExpiracao && diasAte(d) >= 0 && diasAte(d) <= 30).length,
    vencendo7: ativos.filter((d) => d.dataExpiracao && diasAte(d) >= 0 && diasAte(d) <= 7).length,
    atencao,
    pendenciasPorArea,
  }
}
