// Mais variações: letra que falta, ligar letra à figura, tocar a quantidade,
// número que vem depois, soma e subtração com objetos.
import { useMemo, useState } from 'react';
import {
  CONSOANTES_1,
  INICIAIS,
  OBJETOS_CONTAGEM,
  PALAVRAS_CVCV,
  VOGAIS,
  embaralhar,
  sortear,
  sortearVarios,
  type Palavra,
} from './data';
import { NumCor, type PropsJogo } from './games';
import { escolherPorPeso as escolherP } from './srs';


function useErros() {
  const [erros, setErros] = useState(0);
  const [tremendo, setTremendo] = useState<string | null>(null);
  const errar = (id: string) => {
    setErros((e) => e + 1);
    setTremendo(id);
    window.setTimeout(() => setTremendo((t) => (t === id ? null : t)), 450);
  };
  return { erros, errar, tremendo, dica: erros >= 2 };
}

// ---------------- Letra que Falta ----------------
// Vogais: falta uma vogal no meio (B_LA). Consoantes: falta a primeira letra (_ACA).

export function LetraQueFalta({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const rodada = useMemo(() => {
    const ehVogal = fase.id === 'vogais';
    const letrasFase = fase.letras ?? (fase.id === 'palavras' ? [...CONSOANTES_1] : [...VOGAIS]);
    const palavras = PALAVRAS_CVCV.filter((p) =>
      ehVogal ? true : letrasFase.includes(p.palavra[0]),
    );
    const palavra = escolherP('lqf', palavras, (p) => 'palavra:' + p.palavra, itens);
    let pos: number;
    if (ehVogal) {
      const posicoesVogais = [...palavra.palavra].map((c, i) => (VOGAIS.includes(c as never) ? i : -1)).filter((i) => i >= 0);
      pos = sortear(posicoesVogais);
    } else if (fase.id === 'palavras') {
      pos = sortear([0, 2]); // primeira letra de cada sílaba
    } else pos = 0;
    const certa = palavra.palavra[pos];
    const pool = ehVogal ? [...VOGAIS] : [...CONSOANTES_1];
    const opcoes = embaralhar([certa, ...sortearVarios(pool, 2, [certa])]);
    return { palavra, pos, certa, opcoes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);

  const tocar = (l: string) => {
    if (feito) return;
    if (l === rodada.certa) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'letra:' + rodada.certa), 650);
    } else {
      errar(l);
      onErro('letra:' + rodada.certa);
    }
  };

  return (
    <div className="jogo">
      <div className="figura-grande">{rodada.palavra.figura}</div>
      <div className="slots">
        {[...rodada.palavra.palavra].map((c, i) =>
          i === rodada.pos ? (
            <div key={i} className={`slot letra-slot ${feito ? 'cheio' : 'ativo'}`}>
              {feito ? c : ''}
            </div>
          ) : (
            <div key={i} className="slot letra-slot fixo">
              {c}
            </div>
          ),
        )}
      </div>
      <div className="fileira">
        {rodada.opcoes.map((l) => (
          <button
            key={l}
            className={`carta letra ${tremendo === l ? 'treme' : ''} ${dica && !feito && l === rodada.certa ? 'pulsa' : ''}`}
            onClick={() => tocar(l)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Liga Letra ----------------
// Três letras e três figuras. Toque numa letra e depois na figura que começa com ela.

export function LigaLetra({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const rodada = useMemo(() => {
    const letras = fase.letras ?? [...VOGAIS];
    const primeira = escolherP('liga', letras, (x) => 'letra:' + x, itens);
    const escolhidas = [primeira, ...sortearVarios(letras, 2, [primeira])];
    const pares = escolhidas.map((l) => ({ l, p: sortear(INICIAIS[l]) as Palavra }));
    return { letras: embaralhar(pares.map((x) => x.l)), figuras: embaralhar(pares), chave: primeira };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sel, setSel] = useState<string | null>(null);
  const [ligadas, setLigadas] = useState<string[]>([]);
  const { erros, errar, tremendo, dica } = useErros();

  const tocarFigura = (alvo: { l: string; p: Palavra }) => {
    if (ligadas.includes(alvo.l)) return;
    if (!sel) {
      errar('f' + alvo.l);
      return;
    }
    if (sel === alvo.l) {
      const novas = [...ligadas, sel];
      setLigadas(novas);
      setSel(null);
      if (novas.length === 3) window.setTimeout(() => onAcerto(erros, 'letra:' + rodada.chave), 400);
    } else {
      errar('f' + alvo.l);
      onErro('letra:' + sel);
      setSel(null);
    }
  };

  // Dica: a primeira letra ainda não ligada e sua figura piscam
  const letraDica = dica ? rodada.letras.find((l) => !ligadas.includes(l)) : undefined;

  return (
    <div className="jogo liga">
      <div className="fileira">
        {rodada.letras.map((l) => (
          <button
            key={l}
            className={`carta letra ${ligadas.includes(l) ? 'certa' : ''} ${sel === l ? 'selecionada' : ''} ${
              letraDica === l && !sel ? 'pulsa' : ''
            }`}
            disabled={ligadas.includes(l)}
            onClick={() => setSel(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="seta-liga">{sel ? '⬇️' : '👆'}</div>
      <div className="grade grade-3">
        {rodada.figuras.map((x) => (
          <button
            key={x.l}
            className={`carta figura ${ligadas.includes(x.l) ? 'certa' : ''} ${tremendo === 'f' + x.l ? 'treme' : ''} ${
              letraDica === x.l && sel ? 'pulsa' : ''
            }`}
            onClick={() => tocarFigura(x)}
          >
            <span className="emoji">{x.p.figura}</span>
            <span className="palavra-legenda">
              {ligadas.includes(x.l) ? (
                <>
                  <b>{x.p.palavra[0]}</b>
                  {x.p.palavra.slice(1)}
                </>
              ) : (
                x.p.palavra
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Toque a Quantidade ----------------
// Mostra um número; a criança acende essa quantidade de objetos e aperta PRONTO.

export function ToqueQuantidade({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const [min, max] = fase.faixa ?? [1, 5];
  const rodada = useMemo(() => {
    const nums = Array.from({ length: max - Math.max(1, min) + 1 }, (_, i) => Math.max(1, min) + i);
    const n = escolherP('toque', nums, (x) => 'num:' + x, itens);
    return { n, objeto: sortear(OBJETOS_CONTAGEM), casas: max > 10 ? 20 : 10 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [acesos, setAcesos] = useState(0);
  const [feito, setFeito] = useState(false);
  const { erros, errar, tremendo, dica } = useErros();

  const tocarCasa = (i: number) => {
    if (feito) return;
    // tocar numa casa acende até ela; tocar na última acesa apaga
    setAcesos(i + 1 === acesos ? i : i + 1);
  };
  const pronto = () => {
    if (feito) return;
    if (acesos === rodada.n) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'num:' + rodada.n), 600);
    } else {
      errar('pronto');
      onErro('num:' + rodada.n);
    }
  };

  const quadros = Array.from({ length: rodada.casas / 10 }, (_, q) => Array.from({ length: 10 }, (_, k) => q * 10 + k));
  return (
    <div className="jogo">
      <div className="alvo-grande numero-alvo">{rodada.n}</div>
      <div className="quadros">
        {quadros.map((q, qi) => (
          <div className="quadro-10" key={qi}>
            {q.map((i) => (
              <button
                key={i}
                className={`obj ${i < acesos ? 'marcado' : 'apagado'} ${dica && i === rodada.n - 1 && acesos !== rodada.n ? 'pulsa-obj' : ''}`}
                onClick={() => tocarCasa(i)}
                aria-label={`casa ${i + 1}`}
              >
                {i < acesos ? rodada.objeto : ''}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="dica-toque">Acesos: {acesos}</div>
      <button className={`botao-grande vermelho ${tremendo === 'pronto' ? 'treme' : ''} ${feito ? 'ok' : ''}`} onClick={pronto}>
        PRONTO ✓
      </button>
    </div>
  );
}

// ---------------- Depois ----------------
// Uma fileira de números com um buraco: 3, 4, __ (ou 3, __, 5).

export function Depois({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const [min, max] = fase.faixa ?? [1, 5];
  const rodada = useMemo(() => {
    const inicio0 = Math.max(0, min);
    const inicios = Array.from({ length: Math.max(1, max - inicio0 - 1) }, (_, i) => inicio0 + i);
    const ini = escolherP('depois', inicios, (x) => 'num:' + (x + 2), itens);
    const seq = [ini, ini + 1, ini + 2];
    const buraco = Math.random() < 0.7 ? 2 : 1; // quase sempre "o que vem depois"
    const certa = seq[buraco];
    const outras = [certa - 1, certa + 1, certa + 2, certa - 2].filter((x) => x >= 0 && x !== certa && x <= max + 1);
    return { seq, buraco, certa, opcoes: embaralhar([certa, ...sortearVarios(outras, 2)]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);

  const tocar = (x: number) => {
    if (feito) return;
    if (x === rodada.certa) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'num:' + rodada.certa), 600);
    } else {
      errar(String(x));
      onErro('num:' + rodada.certa);
    }
  };

  return (
    <div className="jogo">
      <div className="trilha-numeros">
        {rodada.seq.map((x, i) => (
          <div key={i} className={`pedra ${i === rodada.buraco ? (feito ? 'cheio' : 'ativo') : ''}`}>
            {i === rodada.buraco && !feito ? '?' : <NumCor n={x} />}
          </div>
        ))}
      </div>
      <div className="dica-toque">Os números andam de um em um, como degraus.</div>
      <div className="fileira">
        {rodada.opcoes.map((x) => (
          <button
            key={x}
            className={`carta numero ${tremendo === String(x) ? 'treme' : ''} ${dica && !feito && x === rodada.certa ? 'pulsa' : ''}`}
            onClick={() => tocar(x)}
          >
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Soma e Subtração ----------------
// Soma: dois grupos de cores diferentes que se juntam. Subtração: alguns objetos vão embora (ficam riscados).

function contas(tipo: 'soma' | 'subtracao', maximo: number) {
  const lista: { a: number; b: number; r: number; id: string }[] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      if (tipo === 'soma' && a + b <= maximo) lista.push({ a, b, r: a + b, id: `${a}+${b}` });
      if (tipo === 'subtracao' && a <= maximo && b < a) lista.push({ a, b, r: a - b, id: `${a}-${b}` });
    }
  }
  return lista;
}

function Conta({ tipo, fase, itens, onAcerto, onErro }: PropsJogo & { tipo: 'soma' | 'subtracao' }) {
  const rodada = useMemo(() => {
    const c = escolherP(tipo, contas(tipo, fase.maximo ?? 5), (x) => (tipo === 'soma' ? 'soma:' : 'sub:') + x.id, itens);
    const perto = [c.r - 1, c.r + 1, c.r + 2, c.r - 2].filter((x) => x >= 0 && x <= 10 && x !== c.r);
    return { ...c, objeto: sortear(OBJETOS_CONTAGEM), opcoes: embaralhar([c.r, ...sortearVarios(perto, 2)]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);
  const [mostrar, setMostrar] = useState(false); // passo "juntar" / "tirar" animado
  const [contados, setContados] = useState<number[]>([]);
  const sinal = tipo === 'soma' ? '+' : '−';

  const tocar = (x: number) => {
    if (feito) return;
    if (x === rodada.r) {
      setFeito(true);
      setMostrar(true);
      window.setTimeout(() => onAcerto(erros, (tipo === 'soma' ? 'soma:' : 'sub:') + rodada.id), 900);
    } else {
      errar(String(x));
      onErro((tipo === 'soma' ? 'soma:' : 'sub:') + rodada.id);
      setMostrar(true); // depois de errar, mostra a ação para ajudar
    }
  };

  const contar = (i: number) => setContados((c) => (c.includes(i) ? c : [...c, i]));

  return (
    <div className="jogo conta">
      <div className="expressao">
        <span className="num-a">{rodada.a}</span>
        <span className="op">{sinal}</span>
        <span className="num-b">{rodada.b}</span>
        <span className="op">=</span>
        <span className={`resp ${feito ? 'cheio' : ''}`}>{feito ? rodada.r : '?'}</span>
      </div>

      {tipo === 'soma' ? (
        <div className={`grupos ${mostrar ? 'juntos' : ''}`}>
          <div className="grupo a">
            {Array.from({ length: rodada.a }, (_, i) => (
              <button key={i} className={`obj ${contados.includes(i) ? 'marcado' : ''}`} onClick={() => contar(i)}>
                {rodada.objeto}
              </button>
            ))}
          </div>
          <div className="grupo-mais">+</div>
          <div className="grupo b">
            {Array.from({ length: rodada.b }, (_, i) => (
              <button
                key={i}
                className={`obj ${contados.includes(100 + i) ? 'marcado' : ''}`}
                onClick={() => contar(100 + i)}
              >
                {rodada.objeto}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grupos">
          <div className="grupo a">
            {Array.from({ length: rodada.a }, (_, i) => {
              const vai = i >= rodada.a - rodada.b;
              return (
                <button
                  key={i}
                  className={`obj ${vai ? 'sai' : ''} ${vai && mostrar ? 'foi' : ''} ${!vai && contados.includes(i) ? 'marcado' : ''}`}
                  onClick={() => !vai && contar(i)}
                >
                  {rodada.objeto}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="dica-toque">
        {tipo === 'soma'
          ? `Junte e conte tudo: ${contados.length}`
          : `${rodada.b} vão embora (riscados). Conte os que ficam: ${contados.length}`}
      </div>
      <div className="fileira">
        {rodada.opcoes.map((x) => (
          <button
            key={x}
            className={`carta numero ${tremendo === String(x) ? 'treme' : ''} ${dica && !feito && x === rodada.r ? 'pulsa' : ''}`}
            onClick={() => tocar(x)}
          >
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}

export const Soma = (p: PropsJogo) => <Conta {...p} tipo="soma" />;
export const Subtracao = (p: PropsJogo) => <Conta {...p} tipo="subtracao" />;
