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
  registrarSessao: (codigo: string, s: SessaoPendente) =>
    rpc<null>('jogo_davi_registrar_sessao2', {
      p_codigo: codigo,
      p_fase: s.fase,
      p_acertos: s.acertos,
      p_total: s.total,
      p_erros: s.erros ?? [],
    }),
  historico: (codigo: string) =>
    rpc<{ fase: string; acertos: number; total: number; feita_em: string; erros?: string[] }[]>('jogo_davi_historico2', {
      p_codigo: codigo,
    }),
  migrar: (de: string, para: string) => rpc<null>('jogo_davi_migrar', { p_de: de, p_para: para }),
};

// Sessões que não conseguiram ir para o servidor ficam numa fila e são reenviadas depois.
const CHAVE_FILA = 'jogo-davi:fila-sessoes';
type SessaoPendente = { fase: string; acertos: number; total: number; erros?: string[] };

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
      await servidor.registrarSessao(codigo, s);
    } catch {
      return; // sem internet: tenta de novo depois
    }
    fila = fila.slice(1);
    gravarFila(fila);
  }
}

// ---------- Entrada por número (ex.: 4444) ----------
// O número vira o código no servidor. Em qualquer aparelho, o mesmo número continua o mesmo progresso.

const CHAVE_NUMERO = 'jogo-davi:numero';

export function codigoDoNumero(num: string) {
  return `JOGADOR-${num}`;
}

export function numeroSalvo(): string | null {
  try {
    return localStorage.getItem(CHAVE_NUMERO);
  } catch {
    return null;
  }
}

export function guardarNumero(num: string) {
  try {
    localStorage.setItem(CHAVE_NUMERO, num);
  } catch {
    /* ignora */
  }
}

export function esquecerNumero() {
  try {
    localStorage.removeItem(CHAVE_NUMERO);
  } catch {
    /* ignora */
  }
}

function codigoAntigo(): string | null {
  try {
    return localStorage.getItem(CHAVE_CODIGO);
  } catch {
    return null;
  }
}

// Entra com o número. Fica com o progresso mais avançado entre o do servidor e o deste aparelho,
// e leva junto o histórico do código antigo (versão anterior do jogo), para nada se perder.
export async function entrarComNumero(num: string, local: Progresso): Promise<{ progresso: Progresso; novo: boolean }> {
  const codigo = codigoDoNumero(num);
  let remoto: Progresso | null = null;
  try {
    remoto = await servidor.carregar(codigo);
  } catch {
    return { progresso: local, novo: false }; // sem internet: entra com o que tem aqui
  }
  const localTemAlgo = local.sessoes > 0;
  let escolhido: Progresso;
  if (!remoto) escolhido = local;
  else if (!localTemAlgo) escolhido = remoto;
  else if ((local.sessoes ?? 0) !== (remoto.sessoes ?? 0)) escolhido = local.sessoes > remoto.sessoes ? local : remoto;
  else escolhido = (local.atualizadoEm ?? 0) >= (remoto.atualizadoEm ?? 0) ? local : remoto;

  const antigo = codigoAntigo();
  try {
    if (escolhido === local && localTemAlgo) {
      await servidor.salvar(codigo, { ...local, atualizadoEm: Date.now() });
    }
    if (antigo && antigo !== codigo && localTemAlgo) {
      await servidor.migrar(antigo, codigo);
      trocarCodigo(codigo);
    }
  } catch {
    /* tenta de novo na próxima vez */
  }
  return { progresso: escolhido, novo: !remoto };
}
