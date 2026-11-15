// Cópia do progresso no servidor (Supabase), para não perder a evolução do jogador.
// Para entrar: número de 4 dígitos + primeiro nome da mãe (cadastrado na primeira vez).
// O nome da mãe NÃO fica guardado no aparelho: depois de entrar, o servidor devolve um
// token aleatório, e só ele (com o número) fica salvo aqui.
// Se estiver sem internet, o jogo segue normal e salva no aparelho; a cópia vai quando der.
import type { Progresso } from './storage';

const URL_SUPABASE = 'https://klydltytocppfvofowbf.supabase.co';
// Chave pública (publishable). Só permite chamar as funções jogo_davi_* abaixo.
const CHAVE_PUBLICA = 'sb_publishable_3VXB8zqdJ40ecWHH3RZ4sg_BKJaWBSu';

export class TokenInvalido extends Error {}

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
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    if (txt.includes('token_invalido')) throw new TokenInvalido(fn);
    throw new Error(`${fn}: ${r.status}`);
  }
  const txt = await r.text();
  return (txt ? JSON.parse(txt) : null) as T;
}

export const servidor = {
  salvar: (token: string, dados: Progresso) => rpc<string>('jogo_davi_salvar3', { p_token: token, p_dados: dados }),
  carregar: (token: string) => rpc<Progresso | null>('jogo_davi_carregar3', { p_token: token }),
  registrarSessao: (token: string, s: SessaoPendente) =>
    rpc<null>('jogo_davi_registrar_sessao3', {
      p_token: token,
      p_fase: s.fase,
      p_acertos: s.acertos,
      p_total: s.total,
      p_erros: s.erros ?? [],
    }),
  historico: (token: string) =>
    rpc<{ fase: string; acertos: number; total: number; feita_em: string; erros?: string[] }[]>('jogo_davi_historico3', {
      p_token: token,
    }),
  sair: (token: string) => rpc<null>('jogo_davi_sair', { p_token: token }),
};

// ---------- Fila de sessões ----------
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

export async function enviarSessao(token: string, s: SessaoPendente) {
  gravarFila([...lerFila(), s]);
  await esvaziarFila(token);
}

export async function esvaziarFila(token: string) {
  let fila = lerFila();
  while (fila.length) {
    const s = fila[0];
    try {
      await servidor.registrarSessao(token, s);
    } catch (e) {
      if (e instanceof TokenInvalido) throw e;
      return; // sem internet: tenta de novo depois
    }
    fila = fila.slice(1);
    gravarFila(fila);
  }
}

// ---------- Entrada (número + nome da mãe) ----------

const CHAVE_ENTRADA = 'jogo-davi:entrada';
// Chaves da versão antiga: o número sozinho e o código aleatório do aparelho.
const CHAVE_NUMERO_ANTIGO = 'jogo-davi:numero';
const CHAVE_CODIGO_ANTIGO = 'jogo-davi:codigo';

export type Entrada = { numero: string; token: string };

export function entradaSalva(): Entrada | null {
  try {
    localStorage.removeItem(CHAVE_NUMERO_ANTIGO); // a versão antiga entrava só com o número
    const e = JSON.parse(localStorage.getItem(CHAVE_ENTRADA) ?? 'null');
    return e && typeof e.numero === 'string' && typeof e.token === 'string' ? e : null;
  } catch {
    return null;
  }
}

function guardarEntrada(e: Entrada) {
  try {
    localStorage.setItem(CHAVE_ENTRADA, JSON.stringify(e));
  } catch {
    /* ignora */
  }
}

export function esquecerEntrada(token?: string) {
  if (token) servidor.sair(token).catch(() => {});
  try {
    localStorage.removeItem(CHAVE_ENTRADA);
    localStorage.removeItem(CHAVE_FILA);
  } catch {
    /* ignora */
  }
}

// Sem acento, sem maiúsculas e sem espaços sobrando: "  Cárina " e "CARINA" viram "carina".
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type ErroEntrada = 'nao_existe' | 'nome_errado' | 'bloqueado' | 'muitas_tentativas' | 'dados_invalidos' | 'sem_internet';
export type ResultadoEntrada =
  | { ok: true; entrada: Entrada; progresso: Progresso; novo: boolean }
  | { ok: false; erro: ErroEntrada };

function codigoAntigo(): string | null {
  try {
    return localStorage.getItem(CHAVE_CODIGO_ANTIGO);
  } catch {
    return null;
  }
}

// Entra com número + nome da mãe. Com criar = true, cadastra o número se ele ainda não existe.
// Fica com o progresso mais avançado entre o do servidor e o deste aparelho.
export async function entrar(numero: string, nomeMae: string, criar: boolean, local: Progresso): Promise<ResultadoEntrada> {
  const antigo = codigoAntigo();
  let r: { erro?: ErroEntrada; token?: string; novo?: boolean; dados?: Progresso | null };
  try {
    r = await rpc('jogo_davi_entrar', {
      p_numero: numero,
      p_mae: normalizarNome(nomeMae),
      p_criar: criar,
      p_codigo_antigo: antigo,
    });
  } catch {
    return { ok: false, erro: 'sem_internet' };
  }
  if (r.erro || !r.token) return { ok: false, erro: r.erro ?? 'dados_invalidos' };

  const entrada = { numero, token: r.token };
  guardarEntrada(entrada);
  if (antigo) {
    try {
      localStorage.removeItem(CHAVE_CODIGO_ANTIGO);
    } catch {
      /* ignora */
    }
  }

  const remoto = r.dados ?? null;
  const localTemAlgo = local.sessoes > 0;
  let escolhido: Progresso;
  if (!remoto) escolhido = local;
  else if (!localTemAlgo) escolhido = remoto;
  else if ((local.sessoes ?? 0) !== (remoto.sessoes ?? 0)) escolhido = local.sessoes > remoto.sessoes ? local : remoto;
  else escolhido = (local.atualizadoEm ?? 0) >= (remoto.atualizadoEm ?? 0) ? local : remoto;

  if (escolhido === local && localTemAlgo) {
    servidor.salvar(entrada.token, { ...local, atualizadoEm: Date.now() }).catch(() => {});
  }
  return { ok: true, entrada, progresso: escolhido, novo: !remoto };
}
