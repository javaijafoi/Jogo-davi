// Cópia do progresso no servidor (Supabase), para não perder a evolução do Davi.
// Cada aparelho tem um "código do jogador". Com o mesmo código, outro aparelho recupera o progresso.
// Se estiver sem internet, o jogo segue normal e salva no aparelho; a cópia vai quando der.
import type { Progresso } from './storage';

const URL_SUPABASE = 'https://klydltytocppfvofowbf.supabase.co';
// Chave pública (publishable). Só permite chamar as funções jogo_davi_* abaixo.
const CHAVE_PUBLICA = 'sb_publishable_3VXB8zqdJ40ecWHH3RZ4sg_BKJaWBSu';
const CHAVE_CODIGO = 'jogo-davi:codigo';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I para não confundir

export function novoCodigo(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export function normalizarCodigo(c: string): string {
  const s = c.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 10 ? `${s.slice(0, 5)}-${s.slice(5)}` : s;
}

export function codigoDoAparelho(): string {
  try {
    let c = localStorage.getItem(CHAVE_CODIGO);
    if (!c) {
      c = novoCodigo();
      localStorage.setItem(CHAVE_CODIGO, c);
    }
    return c;
  } catch {
    return novoCodigo();
  }
}

export function trocarCodigo(c: string) {
  try {
    localStorage.setItem(CHAVE_CODIGO, c);
  } catch {
    /* ignora */
  }
}

async function rpc<T>(fn: string, corpo: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: CHAVE_PUBLICA,
      Authorization: `Bearer ${CHAVE_PUBLICA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status}`);
  const txt = await r.text();
  return (txt ? JSON.parse(txt) : null) as T;
}

export const servidor = {
  salvar: (codigo: string, dados: Progresso) => rpc<string>('jogo_davi_salvar', { p_codigo: codigo, p_dados: dados }),
  carregar: (codigo: string) => rpc<Progresso | null>('jogo_davi_carregar', { p_codigo: codigo }),
  registrarSessao: (codigo: string, fase: string, acertos: number, total: number) =>
    rpc<null>('jogo_davi_registrar_sessao', { p_codigo: codigo, p_fase: fase, p_acertos: acertos, p_total: total }),
  historico: (codigo: string) =>
    rpc<{ fase: string; acertos: number; total: number; feita_em: string }[]>('jogo_davi_historico', {
      p_codigo: codigo,
    }),
};

// Sessões que não conseguiram ir para o servidor ficam numa fila e são reenviadas depois.
const CHAVE_FILA = 'jogo-davi:fila-sessoes';
type SessaoPendente = { fase: string; acertos: number; total: number };

function lerFila(): SessaoPendente[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FILA) ?? '[]');
  } catch {
    return [];
  }
}
function gravarFila(f: SessaoPendente[]) {
  try {
    localStorage.setItem(CHAVE_FILA, JSON.stringify(f.slice(-200)));
  } catch {
    /* ignora */
  }
}

export async function enviarSessao(codigo: string, s: SessaoPendente) {
  gravarFila([...lerFila(), s]);
  await esvaziarFila(codigo);
}

export async function esvaziarFila(codigo: string) {
  let fila = lerFila();
  while (fila.length) {
    const s = fila[0];
    try {
      await servidor.registrarSessao(codigo, s.fase, s.acertos, s.total);
    } catch {
      return; // sem internet: tenta de novo depois
    }
    fila = fila.slice(1);
    gravarFila(fila);
  }
}
