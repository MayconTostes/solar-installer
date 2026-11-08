// src/data/checklist.js
// Checklist de comissionamento.
//
// Tipos de item:
//  - 'check':   marcar como feito
//  - 'escolha': escolher uma opção da lista
//  - 'simnao':  responder Sim ou Não
//  - 'medicao': valor numérico com unidade
//
// "mostrarSe": o item só aparece (e só é obrigatório) quando a resposta de outro item
// tem o valor indicado. Ex.: o Logger só é pedido se a obra tiver Wi-Fi.

export const SECOES = [
  {
    titulo: 'Estrutura e módulos',
    itens: [
      { id: 'trilhos', tipo: 'check', titulo: 'Trilhos fixados' },
      { id: 'modulos', tipo: 'check', titulo: 'Módulos presos e alinhados' },
    ],
  },
  {
    titulo: 'Cabeamento DC',
    itens: [
      { id: 'cabosDC', tipo: 'check', titulo: 'Cabos medidos e identificados' },
      { id: 'mc4Modulos', tipo: 'check', titulo: 'Conector MC4 para os módulos' },
      { id: 'mc4Inversor', tipo: 'check', titulo: 'Conector MC4 para o inversor' },
    ],
  },
  {
    titulo: 'Proteções dos cabos DC/AC',
    itens: [
      { id: 'conduletesDC', tipo: 'check', titulo: 'Conduletes parte DC' },
      { id: 'conduletesAC', tipo: 'check', titulo: 'Conduletes parte AC' },
      { id: 'conduletesAterramento', tipo: 'check', titulo: 'Conduletes parte aterramento' },
    ],
  },
  {
    titulo: 'Equipamentos',
    itens: [
      { id: 'inversorFixado', tipo: 'check', titulo: 'Inversor fixado' },
      { id: 'quadroAC', tipo: 'check', titulo: 'Quadro AC fixado' },
      { id: 'disjuntor', tipo: 'check', titulo: 'Disjuntor fixado' },
      { id: 'dps', tipo: 'check', titulo: 'DPS fixado' },
      { id: 'cabosAC', tipo: 'check', titulo: 'Cabos AC do inversor ao quadro de distribuição' },
      {
        id: 'ligacaoRede',
        tipo: 'escolha',
        titulo: 'Saída AC ligada à rede do cliente',
        desc: 'Pergunte ao cliente antes: ramal, cabo de cobre ou os dois.',
        opcoes: ['Ramal', 'Cabo de cobre', 'Ramal e cabo de cobre'],
      },
      { id: 'caboAterramento', tipo: 'check', titulo: 'Cabo de aterramento fixado' },
      { id: 'hasteAterramento', tipo: 'check', titulo: 'Haste de aterramento fixada' },
    ],
  },
  {
    titulo: 'Configuração do inversor e Wi-Fi',
    itens: [
      { id: 'inversorConfigurado', tipo: 'check', titulo: 'Inversor configurado dentro dos padrões da rede' },
      { id: 'wifi', tipo: 'simnao', titulo: 'Tem rede Wi-Fi?', desc: 'A rede precisa ser 2.4 GHz.' },
      {
        id: 'loggerWifi',
        tipo: 'check',
        titulo: 'Logger configurado na Wi-Fi do cliente',
        mostrarSe: { id: 'wifi', valor: 'sim' },
      },
      { id: 'appInversor', tipo: 'check', titulo: 'App do inversor no celular do cliente, com a conta criada' },
    ],
  },
  {
    titulo: 'Medições de comissionamento',
    itens: [
      { id: 'tensaoRede', tipo: 'medicao', unidade: 'V', titulo: 'Tensão da rede no disjuntor', desc: 'Ex: 220 ou 260 V.' },
    ],
  },
];

export const ITENS = SECOES.flatMap((secao) =>
  secao.itens.map((item) => ({ ...item, secao: secao.titulo }))
);

export function itemAtivo(item, respostas) {
  if (!item.mostrarSe) return true;
  return respostas[item.mostrarSe.id]?.valor === item.mostrarSe.valor;
}

// Aceita vírgula ou ponto como separador decimal
export function normalizarNumero(valor) {
  return String(valor ?? '').replace(',', '.');
}

export function itemConcluido(item, resposta) {
  switch (item.tipo) {
    case 'check':
      return !!resposta?.checked;
    case 'medicao':
      return Number(normalizarNumero(resposta?.valor)) > 0;
    default: // 'escolha' e 'simnao'
      return !!resposta?.valor;
  }
}

export function calcularProgresso(respostas) {
  const ativos = ITENS.filter((item) => itemAtivo(item, respostas));
  const pendentes = ativos.filter((item) => !itemConcluido(item, respostas[item.id]));
  const feitos = ativos.length - pendentes.length;

  return {
    feitos,
    total: ativos.length,
    pendentes,
    pct: ativos.length === 0 ? 0 : Math.round((feitos / ativos.length) * 100),
  };
}

// Registro do checklist que vai para a OS no banco
export function montarChecklist(respostas) {
  return ITENS.map((item) => ({
    id: item.id,
    secao: item.secao,
    titulo: item.titulo,
    tipo: item.tipo,
    ativo: itemAtivo(item, respostas),
    concluido: itemConcluido(item, respostas[item.id]),
    resposta: respostas[item.id] ?? null,
  }));
}
