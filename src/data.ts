// Conteúdo pedagógico do Jogo do Davi.
// Ordem fixa e sistemática: vogais → consoantes → sílabas CV → palavras CV+CV.
// Tudo em letra de forma MAIÚSCULA nesta entrega (minúscula entra na fase 6).

export type Palavra = { palavra: string; silabas: string[]; figura: string };

export const VOGAIS = ['A', 'E', 'I', 'O', 'U'] as const;

// Consoantes da fase 2: sons fáceis e sem pares parecidos (b/d, p/q ficam separados).
export const CONSOANTES_1 = ['M', 'P', 'B', 'L', 'V', 'F', 'C', 'T'] as const;

// Figuras para "com que letra começa". Palavras do dia a dia brasileiro.
export const INICIAIS: Record<string, Palavra[]> = {
  A: [
    { palavra: 'ABACAXI', silabas: ['A', 'BA', 'CA', 'XI'], figura: '🍍' },
    { palavra: 'AVIÃO', silabas: ['A', 'VI', 'ÃO'], figura: '✈️' },
    { palavra: 'ABELHA', silabas: ['A', 'BE', 'LHA'], figura: '🐝' },
  ],
  E: [
    { palavra: 'ELEFANTE', silabas: ['E', 'LE', 'FAN', 'TE'], figura: '🐘' },
    { palavra: 'ESTRELA', silabas: ['ES', 'TRE', 'LA'], figura: '⭐' },
    { palavra: 'ESCOVA', silabas: ['ES', 'CO', 'VA'], figura: '🪥' },
  ],
  I: [
    { palavra: 'ILHA', silabas: ['I', 'LHA'], figura: '🏝️' },
    { palavra: 'IGREJA', silabas: ['I', 'GRE', 'JA'], figura: '⛪' },
    { palavra: 'IOIÔ', silabas: ['IO', 'IÔ'], figura: '🪀' },
  ],
  O: [
    { palavra: 'OVO', silabas: ['O', 'VO'], figura: '🥚' },
    { palavra: 'OLHO', silabas: ['O', 'LHO'], figura: '👁️' },
    { palavra: 'OVELHA', silabas: ['O', 'VE', 'LHA'], figura: '🐑' },
  ],
  U: [
    { palavra: 'UVA', silabas: ['U', 'VA'], figura: '🍇' },
    { palavra: 'URSO', silabas: ['UR', 'SO'], figura: '🐻' },
    { palavra: 'UNICÓRNIO', silabas: ['U', 'NI', 'CÓR', 'NIO'], figura: '🦄' },
  ],
  M: [
    { palavra: 'MACACO', silabas: ['MA', 'CA', 'CO'], figura: '🐒' },
    { palavra: 'MILHO', silabas: ['MI', 'LHO'], figura: '🌽' },
    { palavra: 'MALA', silabas: ['MA', 'LA'], figura: '🧳' },
  ],
  P: [
    { palavra: 'PATO', silabas: ['PA', 'TO'], figura: '🦆' },
    { palavra: 'PIPOCA', silabas: ['PI', 'PO', 'CA'], figura: '🍿' },
    { palavra: 'PEIXE', silabas: ['PEI', 'XE'], figura: '🐟' },
  ],
  B: [
    { palavra: 'BOLA', silabas: ['BO', 'LA'], figura: '⚽' },
    { palavra: 'BANANA', silabas: ['BA', 'NA', 'NA'], figura: '🍌' },
    { palavra: 'BOLO', silabas: ['BO', 'LO'], figura: '🎂' },
  ],
  L: [
    { palavra: 'LUA', silabas: ['LU', 'A'], figura: '🌙' },
    { palavra: 'LEÃO', silabas: ['LE', 'ÃO'], figura: '🦁' },
    { palavra: 'LIMÃO', silabas: ['LI', 'MÃO'], figura: '🍋' },
  ],
  V: [
    { palavra: 'VACA', silabas: ['VA', 'CA'], figura: '🐄' },
    { palavra: 'VELA', silabas: ['VE', 'LA'], figura: '🕯️' },
    { palavra: 'VIOLÃO', silabas: ['VI', 'O', 'LÃO'], figura: '🎸' },
  ],
  F: [
    { palavra: 'FOCA', silabas: ['FO', 'CA'], figura: '🦭' },
    { palavra: 'FOGO', silabas: ['FO', 'GO'], figura: '🔥' },
    { palavra: 'FADA', silabas: ['FA', 'DA'], figura: '🧚' },
  ],
  C: [
    { palavra: 'CASA', silabas: ['CA', 'SA'], figura: '🏠' },
    { palavra: 'COCO', silabas: ['CO', 'CO'], figura: '🥥' },
    { palavra: 'CAVALO', silabas: ['CA', 'VA', 'LO'], figura: '🐴' },
  ],
  T: [
    { palavra: 'TOMATE', silabas: ['TO', 'MA', 'TE'], figura: '🍅' },
    { palavra: 'TARTARUGA', silabas: ['TAR', 'TA', 'RU', 'GA'], figura: '🐢' },
    { palavra: 'TELEFONE', silabas: ['TE', 'LE', 'FO', 'NE'], figura: '📱' },
  ],
};

// Palavras de 2 sílabas simples (CV+CV) só com as letras já ensinadas.
export const PALAVRAS_CVCV: Palavra[] = [
  { palavra: 'VACA', silabas: ['VA', 'CA'], figura: '🐄' },
  { palavra: 'BOLA', silabas: ['BO', 'LA'], figura: '⚽' },
  { palavra: 'PATO', silabas: ['PA', 'TO'], figura: '🦆' },
  { palavra: 'MALA', silabas: ['MA', 'LA'], figura: '🧳' },
  { palavra: 'BOLO', silabas: ['BO', 'LO'], figura: '🎂' },
  { palavra: 'FOCA', silabas: ['FO', 'CA'], figura: '🦭' },
  { palavra: 'MOTO', silabas: ['MO', 'TO'], figura: '🏍️' },
  { palavra: 'PIPA', silabas: ['PI', 'PA'], figura: '🪁' },
  { palavra: 'BOTA', silabas: ['BO', 'TA'], figura: '🥾' },
  { palavra: 'MAPA', silabas: ['MA', 'PA'], figura: '🗺️' },
  { palavra: 'CAMA', silabas: ['CA', 'MA'], figura: '🛏️' },
  { palavra: 'LOBO', silabas: ['LO', 'BO'], figura: '🐺' },
  { palavra: 'BOCA', silabas: ['BO', 'CA'], figura: '👄' },
  { palavra: 'COCO', silabas: ['CO', 'CO'], figura: '🥥' },
  { palavra: 'VELA', silabas: ['VE', 'LA'], figura: '🕯️' },
  { palavra: 'FOGO', silabas: ['FO', 'GO'], figura: '🔥' },
];

// Sílabas simples formadas com as consoantes da fase 2.
// C só com A e O (CE/CI têm outro som e ficam para depois).
export function silabasCV(): string[] {
  const out: string[] = [];
  for (const c of CONSOANTES_1) {
    for (const v of VOGAIS) {
      if (c === 'C' && (v === 'E' || v === 'I')) continue;
      if (c === 'C' && v === 'U') continue; // evita palavrão no jogo
      out.push(c + v);
    }
  }
  return out;
}

export const OBJETOS_CONTAGEM = ['🕷️', '⭐', '🍎', '⚽', '🛹', '🍌', '🐟', '🌽'];

// ---------- Fases ----------

export type TipoJogo =
  | 'caca-letra'
  | 'teia-letras'
  | 'junta-silaba'
  | 'silaba-inicial'
  | 'monta-palavra'
  | 'conta-teia'
  | 'letra-que-falta'
  | 'liga-letra'
  | 'toque-quantidade'
  | 'depois'
  | 'soma'
  | 'subtracao'
  | 'dez-mais';

export type Fase = {
  id: string;
  trilha: 'letras' | 'numeros' | 'contas' | 'familia';
  numero: string;
  titulo: string;
  descricao: string;
  jogos: TipoJogo[];
  // conteúdo da fase
  letras?: string[];
  silabas?: string[];
  palavras?: Palavra[];
  faixa?: [number, number];
  // contas: maior resultado (soma) ou maior número de partida (subtração)
  maximo?: number;
};

// ---------- Família da semana ----------
// Troque aqui para mudar o foco da semana (ex.: ['BA', 'BO'] e palavras com BA/BO).
export const FAMILIA_SEMANA = {
  titulo: 'Família do C',
  silabas: ['CA', 'CO'],
  palavras: [
    { palavra: 'VACA', silabas: ['VA', 'CA'], figura: '🐄' },
    { palavra: 'COCO', silabas: ['CO', 'CO'], figura: '🥥' },
    { palavra: 'FOCA', silabas: ['FO', 'CA'], figura: '🦭' },
    { palavra: 'CAMA', silabas: ['CA', 'MA'], figura: '🛏️' },
    { palavra: 'BOCA', silabas: ['BO', 'CA'], figura: '👄' },
    { palavra: 'CASA', silabas: ['CA', 'SA'], figura: '🏠' },
    { palavra: 'COPO', silabas: ['CO', 'PO'], figura: '🥛' },
    { palavra: 'MACACO', silabas: ['MA', 'CA', 'CO'], figura: '🐒' },
    { palavra: 'PIPOCA', silabas: ['PI', 'PO', 'CA'], figura: '🍿' },
    { palavra: 'CAVALO', silabas: ['CA', 'VA', 'LO'], figura: '🐴' },
  ] as Palavra[],
};

export const FASES: Fase[] = [
  {
    id: 'familia',
    trilha: 'familia',
    numero: '★',
    titulo: FAMILIA_SEMANA.titulo,
    descricao: FAMILIA_SEMANA.silabas.join(' '),
    jogos: ['junta-silaba', 'silaba-inicial', 'monta-palavra'],
    silabas: FAMILIA_SEMANA.silabas,
    palavras: FAMILIA_SEMANA.palavras,
  },
  {
    id: 'vogais',
    trilha: 'letras',
    numero: '1',
    titulo: 'Vogais',
    descricao: 'A E I O U',
    jogos: ['caca-letra', 'teia-letras', 'letra-que-falta', 'liga-letra'],
    letras: [...VOGAIS],
  },
  {
    id: 'consoantes',
    trilha: 'letras',
    numero: '2',
    titulo: 'Primeiras consoantes',
    descricao: 'M P B L V F C T',
    jogos: ['caca-letra', 'liga-letra', 'letra-que-falta', 'teia-letras'],
    letras: [...CONSOANTES_1],
  },
  {
    id: 'silabas',
    trilha: 'letras',
    numero: '3',
    titulo: 'Sílabas',
    descricao: 'BA BE BI BO BU',
    jogos: ['junta-silaba', 'silaba-inicial', 'junta-silaba'],
    silabas: silabasCV(),
  },
  {
    id: 'palavras',
    trilha: 'letras',
    numero: '4',
    titulo: 'Palavras',
    descricao: 'VA + CA = VACA',
    jogos: ['monta-palavra', 'silaba-inicial', 'letra-que-falta', 'monta-palavra'],
    palavras: PALAVRAS_CVCV,
  },
  {
    id: 'num-5',
    trilha: 'numeros',
    numero: '1',
    titulo: 'Números até 5',
    descricao: '1 2 3 4 5',
    jogos: ['conta-teia', 'toque-quantidade', 'depois'],
    faixa: [1, 5],
  },
  {
    id: 'num-10',
    trilha: 'numeros',
    numero: '2',
    titulo: 'Números até 10',
    descricao: '6 7 8 9 10',
    jogos: ['conta-teia', 'toque-quantidade', 'depois'],
    faixa: [0, 10],
  },
  {
    id: 'num-15',
    trilha: 'numeros',
    numero: '3',
    titulo: 'Números 11 a 15',
    descricao: '10 + 1 … 10 + 5',
    jogos: ['dez-mais', 'conta-teia', 'depois'],
    faixa: [11, 15],
  },
  {
    id: 'num-20',
    trilha: 'numeros',
    numero: '4',
    titulo: 'Números 16 a 20',
    descricao: '10 + 6 … 10 + 10',
    jogos: ['dez-mais', 'conta-teia', 'toque-quantidade'],
    faixa: [16, 20],
  },
  {
    id: 'soma-5',
    trilha: 'contas',
    numero: '1',
    titulo: 'Somar até 5',
    descricao: '2 + 1 = 3',
    jogos: ['soma', 'soma', 'soma'],
    maximo: 5,
  },
  {
    id: 'soma-9',
    trilha: 'contas',
    numero: '2',
    titulo: 'Somar até 9',
    descricao: '4 + 3 = 7',
    jogos: ['soma', 'soma', 'soma'],
    maximo: 9,
  },
  {
    id: 'sub-5',
    trilha: 'contas',
    numero: '3',
    titulo: 'Tirar até 5',
    descricao: '5 − 2 = 3',
    jogos: ['subtracao', 'subtracao', 'subtracao'],
    maximo: 5,
  },
  {
    id: 'sub-9',
    trilha: 'contas',
    numero: '4',
    titulo: 'Tirar até 9',
    descricao: '8 − 3 = 5',
    jogos: ['subtracao', 'subtracao', 'subtracao'],
    maximo: 9,
  },
  {
    id: 'mistura-9',
    trilha: 'contas',
    numero: '5',
    titulo: 'Somar e tirar',
    descricao: '+ e −',
    jogos: ['soma', 'subtracao', 'soma'],
    maximo: 9,
  },
];

export const RODADAS_POR_JOGO = 4;
export const ACERTO_PARA_PASSAR = 0.8;

// Cores de skate que o jogador ganha ao terminar sessões.
export const CORES_SKATE = [
  { id: 'roxo', nome: 'Roxo', cor: '#7b3fe4' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#e23b3b' },
  { id: 'azul', nome: 'Azul', cor: '#2f6fe0' },
  { id: 'laranja', nome: 'Laranja', cor: '#ff8a1f' },
  { id: 'amarelo', nome: 'Amarelo', cor: '#f5c518' },
  { id: 'rosa', nome: 'Rosa', cor: '#ff5fa2' },
  { id: 'verde', nome: 'Verde', cor: '#2fae4f' },
  { id: 'preto', nome: 'Preto', cor: '#222831' },
];

// ---------- utilidades ----------

export function embaralhar<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sortear<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sortearVarios<T>(arr: readonly T[], n: number, excluir: T[] = []): T[] {
  return embaralhar(arr.filter((x) => !excluir.includes(x))).slice(0, n);
}
