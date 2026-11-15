// Treino do dia: 3 mini-jogos de fases diferentes, escolhidas pelas dificuldades dele.
// Dentro de cada jogo, a repetição espaçada já puxa os itens em que ele mais erra.
import { FASES, PALAVRAS_CVCV, embaralhar, sortear, type Fase, type TipoJogo } from './data';
import type { Progresso } from './storage';

export type PassoPlano = { fase: Fase; tipo: TipoJogo };

export const FASE_TREINO: Fase = {
  id: 'treino',
  trilha: 'letras',
  numero: '★',
  titulo: 'Treino do dia',
  descricao: 'o que mais precisa',
  jogos: [],
};

function contem(f: Fase, item: string): boolean {
  const [tipo, valor] = item.split(':');
  switch (tipo) {
    case 'letra':
      return !!f.letras?.includes(valor);
    case 'silaba':
      return !!f.silabas?.includes(valor);
    case 'palavra':
      return (
        !!f.palavras?.some((p) => p.palavra === valor) ||
        (f.id === 'silabas' && PALAVRAS_CVCV.some((p) => p.palavra === valor))
      );
    case 'num': {
      const n = Number(valor);
      return !!f.faixa && n >= f.faixa[0] && n <= f.faixa[1];
    }
    case 'soma': {
      const [a, b] = valor.split('+').map(Number);
      return f.jogos.includes('soma') && (f.maximo ?? 0) >= a + b;
    }
    case 'sub': {
      const [a] = valor.split('-').map(Number);
      return f.jogos.includes('subtracao') && (f.maximo ?? 0) >= a;
    }
  }
  return false;
}

// Jogo da fase que mais combina com o tipo de item difícil
function jogoPara(f: Fase, item?: string): TipoJogo {
  if (item?.startsWith('soma:') && f.jogos.includes('soma')) return 'soma';
  if (item?.startsWith('sub:') && f.jogos.includes('subtracao')) return 'subtracao';
  if (item?.startsWith('num:') && Number(item.split(':')[1]) > 10 && f.jogos.includes('dez-mais')) return 'dez-mais';
  return sortear(f.jogos);
}

export function montarTreino(prog: Progresso): PassoPlano[] {
  const livres = FASES.filter((f) => prog.liberadas.includes(f.id));
  const dificeis = Object.entries(prog.itens)
    .filter(([, s]) => s.caixa <= 1 && s.erros > 0)
    .sort((a, b) => b[1].erros - a[1].erros || a[1].caixa - b[1].caixa)
    .map(([k]) => k);

  const plano: PassoPlano[] = [];
  const usadas = new Set<string>();
  for (const item of dificeis) {
    if (plano.length >= 3) break;
    // a fase liberada mais simples que contém o item
    const f = livres.find((x) => !usadas.has(x.id) && contem(x, item));
    if (!f) continue;
    usadas.add(f.id);
    plano.push({ fase: f, tipo: jogoPara(f, item) });
  }
  // completa com fases de trilhas diferentes, para variar
  const resto = embaralhar(livres.filter((f) => !usadas.has(f.id)));
  const trilhasNoPlano = new Set(plano.map((p) => p.fase.trilha));
  resto.sort((a, b) => Number(trilhasNoPlano.has(a.trilha)) - Number(trilhasNoPlano.has(b.trilha)));
  for (const f of resto) {
    if (plano.length >= 3) break;
    usadas.add(f.id);
    trilhasNoPlano.add(f.trilha);
    plano.push({ fase: f, tipo: jogoPara(f) });
  }
  return plano;
}
