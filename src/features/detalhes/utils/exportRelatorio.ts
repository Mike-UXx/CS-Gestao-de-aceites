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
  lines.push(csvRow(['Nome', 'Situação', 'Data e hora do aceite', 'IP de origem', 'Geolocalização (lat, long)']))
  for (const s of signatarios) {
    lines.push(csvRow([
      s.nome,
      s.situacao,
      s.dataHoraAceite ?? '—',
      s.ip ?? '—',
      s.geolocalizacao ?? '—',
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

  const logoUrl = `${window.location.origin}/logo-contato-seguro.svg`
  const dataGeracao = new Date().toLocaleString('pt-BR')
  const dataCurta = new Date().toLocaleDateString('pt-BR')
  const PER_PAGE = 22 // linhas de signatários por página (cabe numa A4 com folga)

  const metaRows = metadados(doc)
    .map(([label, valor]) =>
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(valor)}</td></tr>`)
    .join('')

  function sigRowHtml(s: ReturnType<typeof buildSignatarios>[number]): string {
    const concluido = s.situacao === 'Concluído'
    const cor = concluido ? '#389e0d' : '#D46B08'
    const bg = concluido ? '#F6FFED' : '#FFF7E6'
    return `<tr>
      <td class="nome">${escapeHtml(s.nome)}</td>
      <td><span class="badge" style="color:${cor};border-color:${cor};background:${bg}">${escapeHtml(s.situacao)}</span></td>
      <td>${escapeHtml(s.dataHoraAceite ?? '—')}</td>
      <td>${escapeHtml(s.ip ?? '—')}</td>
      <td>${escapeHtml(s.geolocalizacao ?? '—')}</td>
    </tr>`
  }

  const COLGROUP = `<colgroup><col class="c-nome"/><col class="c-sit"/><col class="c-data"/><col class="c-ip"/><col class="c-geo"/></colgroup>`
  const SIG_HEAD = `<thead><tr><th>Nome</th><th>Situação</th><th>Data e hora do aceite</th><th>IP de origem</th><th>Geolocalização</th></tr></thead>`

  /* ── Conteúdo das páginas (após a capa) ── */
  const contentInners: string[] = [
    `<h2>Dados do documento</h2><table class="meta"><tbody>${metaRows}</tbody></table>`,
  ]
  for (let i = 0; i < signatarios.length; i += PER_PAGE) {
    const rows = signatarios.slice(i, i + PER_PAGE).map(sigRowHtml).join('')
    const heading = i === 0
      ? `<h2>Signatários (${signatarios.length})</h2>`
      : `<h2>Signatários (continuação)</h2>`
    contentInners.push(`${heading}<table class="sig">${COLGROUP}${SIG_HEAD}<tbody>${rows}</tbody></table>`)
  }

  const totalPages = 1 + contentInners.length // capa + páginas de conteúdo

  /* ── Folha de conteúdo com cabeçalho, corpo e rodapé (com nº de página) ── */
  const contentSheets = contentInners.map((inner, i) => `
    <section class="sheet">
      <div class="sheet-header">
        <img src="${logoUrl}" alt="Contato Seguro" />
        <span class="sh-title">Relatório de aceites</span>
        <span class="sh-date">${escapeHtml(dataCurta)}</span>
      </div>
      <div class="sheet-body">${inner}</div>
      <div class="sheet-footer">
        <span>Documento gerado pela Plataforma de Gestão de Documentos e Aceites — Contato Seguro</span>
        <span>Página ${i + 2} de ${totalPages}</span>
      </div>
    </section>`).join('')

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de aceites — ${escapeHtml(doc.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  :root { --brand: #263072; }
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Montserrat', -apple-system, 'Segoe UI', sans-serif; color: #1F2430; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }

  .sheet { width: 210mm; min-height: 297mm; padding: 15mm 14mm; page-break-after: always; display: flex; flex-direction: column; }
  .sheet:last-child { page-break-after: auto; }

  /* Capa */
  .cover-sheet { align-items: center; justify-content: center; text-align: center; }
  .cover-sheet img { height: 56px; margin-bottom: 40px; }
  .cover-sheet .kicker { font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--brand); text-transform: uppercase; margin-bottom: 14px; }
  .cover-sheet .title { font-size: 30px; font-weight: 800; color: #1F2430; max-width: 80%; line-height: 1.25; margin: 0 0 0; }
  .cover-sheet .rule { width: 64px; height: 4px; background: var(--brand); border-radius: 2px; margin: 22px 0; }
  .cover-sheet .meta { font-size: 12px; color: #6B7280; }

  /* Cabeçalho / rodapé de cada folha de conteúdo */
  .sheet-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--brand); padding-bottom: 8px; margin-bottom: 18px; }
  .sheet-header img { height: 20px; }
  .sheet-header .sh-title { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--brand); text-transform: uppercase; }
  .sheet-header .sh-date { font-size: 10px; color: #6B7280; }
  .sheet-body { flex: 1; }
  .sheet-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #E5E7EB; padding-top: 8px; margin-top: 16px; font-size: 8.5px; color: #9CA3AF; }

  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--brand); margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; }
  h2 + h2 { margin-top: 0; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .meta th { text-align: left; width: 38%; color: #6B7280; font-weight: 600; padding: 7px 10px; vertical-align: top; }
  .meta td { padding: 7px 10px; word-break: break-all; font-weight: 500; }
  .meta tr { border-bottom: 1px solid #F0F0F0; }

  .sig { table-layout: fixed; }
  .sig th { text-align: left; background: var(--brand); color: #fff; font-weight: 600; font-size: 10px; padding: 8px; }
  .sig td { padding: 7px 8px; border-bottom: 1px solid #F0F0F0; font-size: 10px; vertical-align: top; }
  .sig .nome { font-weight: 600; }
  .sig col.c-nome { width: 22%; } .sig col.c-sit { width: 13%; } .sig col.c-data { width: 21%; }
  .sig col.c-ip { width: 21%; } .sig col.c-geo { width: 23%; }
  .badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 8px; border-radius: 10px; border: 1px solid; }
</style>
</head>
<body>
  <section class="sheet cover-sheet">
    <img src="${logoUrl}" alt="Contato Seguro" />
    <div class="kicker">Relatório de aceites</div>
    <h1 class="title">${escapeHtml(doc.titulo)}</h1>
    <div class="rule"></div>
    <div class="meta">Gerado em ${escapeHtml(dataGeracao)}</div>
  </section>
  ${contentSheets}
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
