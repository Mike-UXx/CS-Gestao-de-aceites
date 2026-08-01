/* ─────────────────────────────────────────────────────────────
   src/data/mockVersoes.ts
   Histórico de versões (mock, RN17) — compartilhado entre a tela de
   Detalhes (campo "Versão") e o drawer "Histórico do documento".
───────────────────────────────────────────────────────────── */
export interface VersaoDoc {
  versao: string
  data: string
  responsavel: string
  depto: string
  motivo: string
}

export const VERSION_HISTORY: Record<string, VersaoDoc[]> = {
  'doc-001': [
    { versao: 'V1', data: '2024-10-10', responsavel: 'Ana Silva',    depto: 'Compliance', motivo: 'Publicação inicial do documento.' },
    { versao: 'V2', data: '2025-02-14', responsavel: 'Bruno Costa',  depto: 'Jurídico',   motivo: 'Revisão de cláusulas para adequação à Lei 14.611/2023.' },
    { versao: 'V3', data: '2025-12-31', responsavel: 'Carla Mendes', depto: 'Compliance', motivo: 'Atualização dos itens 4.2 e 7.1 — nova política de privacidade LGPD.' },
  ],
  'doc-002': [
    { versao: 'V1', data: '2025-03-10', responsavel: 'Daniel Oliveira', depto: 'TI',      motivo: 'Publicação inicial.' },
    { versao: 'V2', data: '2025-08-01', responsavel: 'Eduarda Lima',    depto: 'TI',      motivo: 'Inclusão de seção sobre segurança em nuvem (AWS/Azure).' },
  ],
  'doc-003': [
    { versao: 'V1', data: '2025-01-08', responsavel: 'Felipe Rocha',    depto: 'Jurídico', motivo: 'Publicação inicial do termo.' },
  ],
  'doc-004': [
    { versao: 'V1', data: '2025-02-01', responsavel: 'Gabriela Souza',  depto: 'RH',       motivo: 'Publicação inicial da política de home office.' },
  ],
  'doc-005': [
    { versao: 'V1', data: '2025-10-15', responsavel: 'Henrique Alves',  depto: 'TI',       motivo: 'Publicação para entrega dos ativos do ciclo 2025.' },
  ],
  'doc-006': [
    { versao: 'V1', data: '2025-03-20', responsavel: 'Isabela Ferreira', depto: 'TI',      motivo: 'Criação do manual atualizado para 2025.' },
  ],
  'doc-007': [
    { versao: 'V1', data: '2025-03-28', responsavel: 'João Pedro',      depto: 'TI',       motivo: 'Publicação inicial da política de dispositivos móveis.' },
  ],
  'doc-008': [
    { versao: 'V1', data: '2025-02-14', responsavel: 'Karina Matos',    depto: 'RH',       motivo: 'Comunicado sobre atualização do plano de saúde — vigência março 2025.' },
  ],
}
