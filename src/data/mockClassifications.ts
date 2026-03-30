/** Mock data — will be replaced by API calls */
export const CLASSIFICATIONS = [
  { label: 'Políticas', value: 'politicas' },
  { label: 'Cartilhas', value: 'cartilhas' },
  { label: 'Procedimentos', value: 'procedimentos' },
  { label: 'Manuais', value: 'manuais' },
  { label: 'Comunicação Interna', value: 'comunicacao-interna' },
]

export const GESTOES_RESPONSAVEIS = [
  { label: 'RH', value: 'rh' },
  { label: 'Jurídico', value: 'juridico' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'TI', value: 'ti' },
  { label: 'Financeiro', value: 'financeiro' },
]

/** Simulates existing document names for duplicate-check (AC4) */
export const EXISTING_DOCUMENT_NAMES = [
  'Código de conduta',
  'Política de privacidade (LGPD)',
  'Termo de confidencialidade',
]

/** Mock departamentos */
export const DEPARTAMENTOS = [
  { label: 'Recursos Humanos', value: 'rh' },
  { label: 'Jurídico', value: 'juridico' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Tecnologia da Informação', value: 'ti' },
  { label: 'Financeiro', value: 'financeiro' },
  { label: 'Comercial', value: 'comercial' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Operações', value: 'operacoes' },
  { label: 'Logística', value: 'logistica' },
  { label: 'Atendimento ao Cliente', value: 'atendimento' },
  { label: 'Produto', value: 'produto' },
  { label: 'Administrativo', value: 'administrativo' },
]

/** Mock colaboradores (simula lista grande — em produção virá paginado via API) */
export const COLABORADORES = Array.from({ length: 48 }, (_, i) => {
  const nomes = [
    'Ana Silva','Bruno Costa','Carla Mendes','Daniel Oliveira','Eduarda Lima',
    'Felipe Rocha','Gabriela Souza','Henrique Alves','Isabela Ferreira','João Pedro',
    'Karina Matos','Lucas Teixeira','Mariana Cardoso','Nicolas Barros','Olívia Reis',
    'Pedro Nunes','Queila Moreira','Rafael Cunha','Sara Monteiro','Thiago Batista',
    'Ursula Vaz','Victor Hugo','Wanessa Gomes','Xavier Lopes','Yasmin Freitas',
    'Zélia Duarte','André Machado','Beatriz Pinto','Cássio Ribeiro','Débora Araújo',
    'Emerson Farias','Flávia Correia','Gustavo Dias','Helena Castro','Iago Martins',
    'Juliana Campos','Kelvin Sousa','Larissa Barbosa','Márcio Vieira','Natália Cruz',
    'Otávio Lima','Patrícia Borges','Quirino Santos','Renata Flores','Sandro Leite',
    'Tatiane Coelho','Ulisses Ramos','Valéria Andrade',
  ]
  return { label: nomes[i] ?? `Colaborador ${i + 1}`, value: `col-${i + 1}` }
})
