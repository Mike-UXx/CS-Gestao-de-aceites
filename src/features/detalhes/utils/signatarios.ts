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
  /** Data e hora do aceite (DD/MM/YYYY HH:mm) — evidência; null para pendentes */
  dataHoraAceite: string | null
  /** IP de origem do aceite — evidência; null para pendentes */
  ip: string | null
  /** Geolocalização do aceite (latitude, longitude) — evidência; null para pendentes */
  geolocalizacao: string | null
  /** Departamento do colaborador — apenas quando o envio é por departamento */
  departamento?: string
}

/** Conjunto padrão de departamentos para distribuir quando o alvo é "Todos". */
const DEPTOS_PADRAO = ['RH', 'Jurídico', 'TI', 'Compliance', 'Financeiro']

/** Coordenadas-base (capitais BR) para simular a geolocalização do aceite. */
const COORDS: [number, number][] = [
  [-23.5505, -46.6333], [-22.9068, -43.1729], [-19.9167, -43.9345], [-30.0346, -51.2177],
  [-25.4284, -49.2733], [-8.0476, -34.8770], [-12.9777, -38.5016], [-15.7939, -47.8828],
  [-3.7319, -38.5267], [-27.5949, -48.5482],
]

/** Gera um IP de origem determinístico (simulado) a partir de um índice. */
function fakeIp(n: number): string {
  return `189.${(n * 13) % 200 + 20}.${(n * 7) % 256}.${(n * 29) % 253 + 1}`
}

/** Geolocalização (lat, long) determinística, com leve variação por índice. */
function fakeGeo(n: number): string {
  const [lat, lng] = COORDS[n % COORDS.length]
  const dLat = (((n * 17) % 100) - 50) / 10000
  const dLng = (((n * 23) % 100) - 50) / 10000
  return `${(lat + dLat).toFixed(6)}, ${(lng + dLng).toFixed(6)}`
}

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
    .map((c, i) => ({
      nome: c.label, situacao: 'Pendente' as const,
      dataAceite: null, dataHoraAceite: null, ip: null, geolocalizacao: null, hashAceite: null,
      departamento: deptDe(i),
    }))

  const base = dayjs(doc.dataLancamento ?? doc.criadoEm)
  const concluidosList: Signatario[] = COLABORADORES
    .slice(pendentes, doc.totalDestinatarios)
    .map((c, i) => {
      const aceite = base.add(i * 2 + 1, 'day').hour(8 + (i % 9)).minute((i * 7) % 60)
      const seed = pendentes + i
      return {
        nome: c.label,
        situacao: 'Concluído' as const,
        dataAceite: aceite.format('DD/MM/YYYY'),
        dataHoraAceite: aceite.format('DD/MM/YYYY HH:mm'),
        ip: fakeIp(seed),
        geolocalizacao: fakeGeo(seed),
        departamento: deptDe(seed),
      }
    })

  return [...pendentesList, ...concluidosList]
}
