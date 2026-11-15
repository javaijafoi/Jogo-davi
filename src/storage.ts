// Progresso salvo no próprio aparelho. Sem conta e sem servidor.
import { FASES } from './data';
import type { Itens } from './srs';

export type ResultadoFase = { melhor: number; vezes: number; estrelas: number };

export type Progresso = {
  fases: Record<string, ResultadoFase>;
  liberadas: string[];
  teias: number;
  coresGanhas: string[];
  corSkate: string;
  sessoes: number;
  errosPorItem: Record<string, number>; // antigo, mantido só para compatibilidade
  itens: Itens; // repetição espaçada por item
  tempoHoje: { dia: string; ms: number }; // tempo jogado hoje
  limiteMin: number; // minutos por dia antes do "volta amanhã" (0 = sem limite)
  treinoFeitoEm: string; // dia em que o treino do dia foi feito
  atualizadoEm: number;
};

export function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function minutosHoje(p: Progresso): number {
  return p.tempoHoje?.dia === hoje() ? p.tempoHoje.ms / 60000 : 0;
}

const CHAVE = 'jogo-davi:v1';

export function progressoInicial(): Progresso {
  return {
    fases: {},
    liberadas: ['vogais', 'num-5', 'soma-5', 'familia'],
    teias: 0,
    coresGanhas: ['roxo'],
    corSkate: 'roxo',
    sessoes: 0,
    errosPorItem: {},
    itens: {},
    tempoHoje: { dia: '', ms: 0 },
    limiteMin: 20,
    treinoFeitoEm: '',
    atualizadoEm: 0,
  };
}

export function carregar(): Progresso {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return progressoInicial();
    return mesclarPadrao(JSON.parse(raw));
  } catch {
    return progressoInicial();
  }
}

export function salvar(p: Progresso) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    /* sem armazenamento: o jogo segue funcionando nesta sessão */
  }
}

export function proximaFase(id: string): string | undefined {
  const atual = FASES.find((f) => f.id === id);
  if (!atual) return undefined;
  const mesmaTrilha = FASES.filter((f) => f.trilha === atual.trilha);
  const i = mesmaTrilha.findIndex((f) => f.id === id);
  return mesmaTrilha[i + 1]?.id;
}

export function estrelasPara(taxa: number): number {
  if (taxa >= 0.95) return 3;
  if (taxa >= 0.8) return 2;
  if (taxa >= 0.5) return 1;
  return 0;
}

// Junta o progresso salvo com os padrões novos (ex.: fases que passaram a vir liberadas),
// sem perder nada do que já foi feito.
export function mesclarPadrao(salvo: Partial<Progresso>): Progresso {
  const base = progressoInicial();
  return {
    ...base,
    ...salvo,
    liberadas: Array.from(
      new Set([
        ...(salvo.liberadas ?? []),
        ...base.liberadas,
        // a fase "até 20" virou duas (11–15 e 16–20): quem já tinha a de 20 ganha a de 15
        ...((salvo.liberadas ?? []).includes('num-20') ? ['num-15'] : []),
      ]),
    ),
    itens: salvo.itens ?? {},
  };
}
