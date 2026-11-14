// Repetição espaçada simples (estilo "caixas de Leitner") por item:
// cada letra, sílaba, palavra, número ou conta tem uma caixa de 0 a 4.
// Acertou de primeira: sobe uma caixa. Errou: volta para a caixa 0.
// Itens em caixas baixas aparecem mais vezes; nunca o mesmo item duas rodadas seguidas.
import { sortear } from './data';

export type ItemStat = {
  caixa: number; // 0 = precisa treinar muito ... 4 = dominado
  acertos: number; // acertos de primeira
  erros: number; // toques errados
  vezes: number; // vezes que apareceu
  ultimo: number; // timestamp da última vez
};

export type Itens = Record<string, ItemStat>;

const PESO_CAIXA = [6, 4, 2.5, 1.5, 0.7];
const PESO_NOVO = 3;

const ultimoPorJogo: Record<string, string[]> = {};

export function escolherPorPeso<T>(chaveJogo: string, pool: readonly T[], id: (x: T) => string, itens: Itens): T {
  const recentes = ultimoPorJogo[chaveJogo] ?? [];
  // evita os 2 últimos itens deste jogo (quando houver opção)
  let candidatos = pool.filter((x) => !recentes.includes(id(x)));
  if (!candidatos.length) candidatos = [...pool];
  const pesos = candidatos.map((x) => {
    const s = itens[id(x)];
    if (!s) return PESO_NOVO;
    return PESO_CAIXA[Math.max(0, Math.min(4, s.caixa))];
  });
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let escolhido = candidatos[candidatos.length - 1];
  for (let i = 0; i < candidatos.length; i++) {
    r -= pesos[i];
    if (r <= 0) {
      escolhido = candidatos[i];
      break;
    }
  }
  ultimoPorJogo[chaveJogo] = [id(escolhido), ...recentes].slice(0, Math.min(2, pool.length - 1));
  return escolhido;
}

export function registrarAcerto(itens: Itens, item: string, errosNaRodada: number): Itens {
  const s = itens[item] ?? { caixa: 0, acertos: 0, erros: 0, vezes: 0, ultimo: 0 };
  const deCara = errosNaRodada === 0;
  return {
    ...itens,
    [item]: {
      caixa: deCara ? Math.min(4, s.caixa + 1) : 0,
      acertos: s.acertos + (deCara ? 1 : 0),
      erros: s.erros,
      vezes: s.vezes + 1,
      ultimo: Date.now(),
    },
  };
}

export function registrarErro(itens: Itens, item: string): Itens {
  const s = itens[item] ?? { caixa: 0, acertos: 0, erros: 0, vezes: 0, ultimo: 0 };
  return { ...itens, [item]: { ...s, caixa: 0, erros: s.erros + 1, ultimo: Date.now() } };
}

export { sortear };

// ---------- leitura para o relatório ----------

export const TIPOS_ITEM: Record<string, string> = {
  letra: 'Letras',
  silaba: 'Sílabas',
  palavra: 'Palavras',
  num: 'Números',
  soma: 'Somas',
  sub: 'Subtrações',
};

export function nomeItem(chave: string): string {
  const [, valor] = chave.split(':');
  if (chave.startsWith('sub:')) return valor.replace('-', ' − ');
  if (chave.startsWith('soma:')) return valor.replace('+', ' + ');
  return valor ?? chave;
}
