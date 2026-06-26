/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/exportRelatorio.ts
   Geração real de relatórios de auditoria (zero dependências):
   - CSV (abre no Excel pt-BR, UTF-8 BOM, separador ';')
   - PDF (janela de impressão estilizada → "Salvar como PDF" no navegador)
───────────────────────────────────────────────────────────── */
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { STATUS_LABEL } from '@/features/listagem/types/documento'
import type { Documento } from '@/features/listagem/types/documento'
import { buildSignatarios } from './signatarios'

/* ── Helpers de rótulo ──────────────────────────────────────── */
const TIPO_LABEL: Record<Documento['tipo'], string> = {
  adesao: 'Documento com aceite (Adesão)',
  ciencia: 'Documento informativo (Ciência)',
}

function areaLabel(value: string): string {
  return GESTOES_RESPONSAVEIS.find((g) => g.value === value)?.label ?? value
}

function classifLabels(values: string[]): string {
  return values
    .map((v) => CLASSIFICATIONS.find((c) => c.value === v)?.label ?? v)
    .join(', ')
}

function adesaoPct(doc: Documento): number {
  return doc.totalDestinatarios > 0
    ? Math.round((doc.totalAceites / doc.totalDestinatarios) * 100)
    : 0
}

/** Pares (rótulo, valor) dos metadados do documento — usado por CSV e PDF. */
function metadados(doc: Documento): [string, string][] {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
  return [
    ['Título', doc.titulo],
    ['ID do documento', doc.id],
    ['Status', STATUS_LABEL[doc.status]],
    ['Tipo', TIPO_LABEL[doc.tipo]],
    ['Área responsável', areaLabel(doc.gestaoResponsavel)],
    ['Classificações', classifLabels(doc.classificacoes)],
    ['Início da vigência', fmt(doc.dataLancamento)],
    ['Fim da vigência', fmt(doc.dataExpiracao)],
    ['Hash SHA-256', doc.fileHash ?? '—'],
    ['Arquivo', doc.fileName ?? '—'],
    ['Total de destinatários', String(doc.totalDestinatarios)],
    ['Total de aceites', String(doc.totalAceites)],
    ['Adesão', `${adesaoPct(doc)}%`],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ]
}

/* ── Download genérico ──────────────────────────────────────── */
function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── CSV ────────────────────────────────────────────────────── */
const SEP = ';'

/** Escapa um campo CSV (aspas, separador, quebras de linha). */
function csvCell(value: string): string {
  const needsQuote = /["\n\r;]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(SEP)
}

export function exportarRelatorioCSV(doc: Documento): void {
  const signatarios = buildSignatarios(doc)
  const lines: string[] = []

  lines.push(csvRow(['Relatório de auditoria']))
  lines.push('')
  for (const [label, valor] of metadados(doc)) {
    lines.push(csvRow([label, valor]))
  }
  lines.push('')
  lines.push(csvRow(['Nome', 'Situação', 'Data e hora do aceite', 'IP de origem', 'Geolocalização (lat, long)', 'Hash do aceite']))
  for (const s of signatarios) {
    lines.push(csvRow([
      s.nome,
      s.situacao,
      s.dataHoraAceite ?? '—',
      s.ip ?? '—',
      s.geolocalizacao ?? '—',
      s.hashAceite ?? '—',
    ]))
  }

  // BOM (﻿) garante acentuação correta no Excel pt-BR.
  const content = '﻿' + lines.join('\r\n')
  downloadBlob(content, `relatorio-auditoria-${doc.id}.csv`, 'text/csv;charset=utf-8')
}

/* ── PDF (via impressão do navegador) ───────────────────────── */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Abre uma janela de impressão estilizada. O usuário escolhe "Salvar como PDF".
 * @returns false se o popup foi bloqueado pelo navegador.
 */
export function exportarRelatorioPDF(doc: Documento): boolean {
  const signatarios = buildSignatarios(doc)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return false

  const metaRows = metadados(doc)
    .map(([label, valor]) =>
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(valor)}</td></tr>`)
    .join('')

  const sigRows = signatarios
    .map((s) => {
      const cor = s.situacao === 'Concluído' ? '#389e0d' : '#D46B08'
      return `<tr>
        <td>${escapeHtml(s.nome)}</td>
        <td><span class="badge" style="color:${cor};border-color:${cor}">${escapeHtml(s.situacao)}</span></td>
        <td>${escapeHtml(s.dataHoraAceite ?? '—')}</td>
        <td>${escapeHtml(s.ip ?? '—')}</td>
        <td>${escapeHtml(s.geolocalizacao ?? '—')}</td>
        <td class="hash">${escapeHtml(s.hashAceite ?? '—')}</td>
      </tr>`
    })
    .join('')

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de auditoria — ${escapeHtml(doc.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Montserrat', -apple-system, 'Segoe UI', sans-serif; color: #1F2430; margin: 32px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #8C8C8C; font-size: 12px; margin: 0 0 24px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #6B7280; margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .sig { table-layout: fixed; }
  .sig td.hash { font-family: 'Courier New', monospace; font-size: 9px; color: #6B7280; word-break: break-all; }
  .meta th { text-align: left; width: 200px; color: #6B7280; font-weight: 600; padding: 6px 8px; vertical-align: top; }
  .meta td { padding: 6px 8px; word-break: break-all; }
  .meta tr { border-bottom: 1px solid #F0F0F0; }
  .sig th { text-align: left; background: #FAFAFA; color: #6B7280; font-weight: 600; padding: 8px; border-bottom: 1px solid #E8E8E8; }
  .sig td { padding: 8px; border-bottom: 1px solid #F0F0F0; }
  .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 10px; border: 1px solid; }
  .foot { margin-top: 32px; font-size: 10px; color: #BFBFBF; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Relatório de auditoria</h1>
  <p class="sub">${escapeHtml(doc.titulo)}</p>

  <h2>Informações do documento</h2>
  <table class="meta"><tbody>${metaRows}</tbody></table>

  <h2>Signatários (${signatarios.length})</h2>
  <table class="sig">
    <thead><tr><th>Nome</th><th>Situação</th><th>Data e hora do aceite</th><th>IP de origem</th><th>Geolocalização (lat, long)</th><th>Hash do aceite</th></tr></thead>
    <tbody>${sigRows}</tbody>
  </table>

  <p class="foot">Documento gerado pela Plataforma de Gestão de Documentos e Aceites — Contato Seguro.</p>
</body>
</html>`)
  win.document.close()
  win.focus()
  // Imprime uma única vez, assim que o conteúdo estiver pronto.
  let printed = false
  const doPrint = () => { if (printed) return; printed = true; try { win.print() } catch { /* noop */ } }
  win.onload = doPrint
  // Fallback caso onload não dispare (conteúdo já escrito de forma síncrona).
  setTimeout(doPrint, 400)
  return true
}
