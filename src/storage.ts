// Progresso salvo no próprio aparelho. Sem conta e sem servidor.
import { FASES } from './data';

export type ResultadoFase = { melhor: number; vezes: number; estrelas: number };

export type Progresso = {
  fases: Record<string, ResultadoFase>;
  liberadas: string[];
  teias: number;
  coresGanhas: string[];
  corSkate: string;
  sessoes: number;
  errosPorItem: Record<string, number>;
  atualizadoEm: number;
};

const CHAVE = 'jogo-davi:v1';

export function progressoInicial(): Progresso {
  return {
    fases: {},
    liberadas: ['vogais', 'num-5'],
    teias: 0,
    coresGanhas: ['roxo'],
    corSkate: 'roxo',
    sessoes: 0,
    errosPorItem: {},
    atualizadoEm: 0,
  };
}

export function carregar(): Progresso {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return progressoInicial();
    return { ...progressoInicial(), ...JSON.parse(raw) };
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
