/* ─────────────────────────────────────────────────────────────
   src/data/mockClassificacoes.ts
   Classificações escopadas por GESTÃO RESPONSÁVEL (não mais por empresa).
   Hierarquia: Empresa → Gestão responsável → Classificação.
   Espelha o padrão da listagem de documentos (tabela única + coluna de
   gestão responsável), evitando um segundo Select de empresa/gestão.
───────────────────────────────────────────────────────────── */

export interface Classificacao {
  id: string
  nome: string
  /** Cor de exibição da tag (hex) */
  cor: string
  descricao: string
  /** Gestão responsável dona da classificação (value de GESTOES_RESPONSAVEIS) */
  gestao: string
  /** Quantidade de documentos vinculados */
  documentos: number
}

/**
 * Gestões responsáveis a que o usuário logado tem acesso.
 * Em produção virá do RBAC/perfil; aqui simula um gestor com várias áreas.
 */
export const USUARIO_GESTOES: string[] = ['compliance', 'ti', 'juridico', 'rh']

export const MOCK_CLASSIFICACOES: Classificacao[] = [
  /* ── Compliance ── */
  { id: 'cl-01', nome: 'Políticas',     cor: '#FA541C', gestao: 'compliance', documentos: 5, descricao: 'Normas institucionais que orientam diretrizes e comportamentos da empresa.' },
  { id: 'cl-02', nome: 'Códigos',       cor: '#13C2C2', gestao: 'compliance', documentos: 2, descricao: 'Códigos de conduta e ética de observância obrigatória.' },
  /* ── TI ── */
  { id: 'cl-03', nome: 'Procedimentos', cor: '#13C2C2', gestao: 'ti',         documentos: 3, descricao: 'Instruções operacionais que definem como atividades devem ser executadas.' },
  { id: 'cl-04', nome: 'Manuais',       cor: '#A0D911', gestao: 'ti',         documentos: 1, descricao: 'Guias técnicos de uso de sistemas e equipamentos.' },
  { id: 'cl-05', nome: 'Normas',        cor: '#FAAD14', gestao: 'ti',         documentos: 0, descricao: 'Regras específicas relacionadas a práticas internas de tecnologia.' },
  /* ── Jurídico ── */
  { id: 'cl-06', nome: 'Termos',        cor: '#722ED1', gestao: 'juridico',   documentos: 4, descricao: 'Documentos formais de ciência ou responsabilidade do colaborador.' },
  { id: 'cl-07', nome: 'Contratos',     cor: '#2F54EB', gestao: 'juridico',   documentos: 1, descricao: 'Acordos e contratos com colaboradores e terceiros.' },
  /* ── RH ── */
  { id: 'cl-08', nome: 'Comunicados',   cor: '#EB2F96', gestao: 'rh',         documentos: 2, descricao: 'Documentos informativos que não exigem aceite.' },
  { id: 'cl-09', nome: 'Cartilhas',     cor: '#722ED1', gestao: 'rh',         documentos: 0, descricao: 'Materiais de orientação e boas práticas para colaboradores.' },
]
