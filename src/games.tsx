// Mini-jogos. Cada componente mostra UMA rodada e chama onAcerto(erros) quando a criança resolve.
// Regras de foco: uma tarefa por tela, poucas opções, erro sem punição, dica depois de 2 erros.
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
  type Fase,
  type Palavra,
  type TipoJogo,
} from './data';
import { escolherPorPeso, type Itens } from './srs';
import { Depois, LetraQueFalta, LigaLetra, Soma, Subtracao, ToqueQuantidade } from './games2';

export type PropsJogo = {
  fase: Fase;
  rodada: number;
  itens: Itens;
  onAcerto: (erros: number, item: string) => void;
  onErro: (item: string) => void;
};

export const INFO_JOGOS: Record<TipoJogo, { nome: string; instrucao: string; icone: string }> = {
  'caca-letra': { nome: 'Caça-Letra', instrucao: 'Toque em todas as letras iguais', icone: '🔎' },
  'teia-letras': { nome: 'Teia das Letras', instrucao: 'Qual figura começa com essa letra?', icone: '🕸️' },
  'junta-silaba': { nome: 'Junta-Sílaba', instrucao: 'Monte a sílaba: primeiro a consoante, depois a vogal', icone: '🧩' },
  'silaba-inicial': { nome: 'Sílaba que Falta', instrucao: 'Qual pedaço completa a palavra?', icone: '✂️' },
  'monta-palavra': { nome: 'Monta-Palavra', instrucao: 'Monte a palavra com as sílabas, na ordem', icone: '🛹' },
  'conta-teia': { nome: 'Conta-Teia', instrucao: 'Conte e toque no número certo', icone: '🔢' },
  'letra-que-falta': { nome: 'Letra que Falta', instrucao: 'Qual letra completa a palavra?', icone: '🔤' },
  'liga-letra': { nome: 'Liga-Letra', instrucao: 'Toque numa letra e depois na figura que começa com ela', icone: '🔗' },
  'toque-quantidade': { nome: 'Acende a Teia', instrucao: 'Acenda a quantidade do número e aperte PRONTO', icone: '💡' },
  depois: { nome: 'Degraus', instrucao: 'Qual número falta na escada?', icone: '🪜' },
  soma: { nome: 'Junta-Junta', instrucao: 'Junte os dois grupos e conte tudo', icone: '➕' },
  subtracao: { nome: 'Vai Embora', instrucao: 'Alguns vão embora. Quantos ficam?', icone: '➖' },
  'dez-mais': { nome: 'Dez e Mais', instrucao: 'Um quadro cheio é 10. Quanto dá 10 e mais esses?', icone: '🔟' },
};

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

// ---------------- Caça-Letra ----------------

export function CacaLetra({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const letras = fase.letras ?? [...VOGAIS];
  const rodada = useMemo(() => {
    const alvo = escolherPorPeso('caca', letras, (x) => 'letra:' + x, itens);
    const outras = letras.filter((l) => l !== alvo);
    const distratores = Array.from({ length: 5 }, (_, i) => outras[i % outras.length]);
    const celulas = embaralhar([alvo, alvo, alvo, ...embaralhar(distratores)]).map((l, i) => ({ id: i, l }));
    return { alvo, celulas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pegas, setPegas] = useState<number[]>([]);
  const { erros, errar, tremendo, dica } = useErros();

  const tocar = (id: number, l: string) => {
    if (pegas.includes(id)) return;
    if (l === rodada.alvo) {
      const novas = [...pegas, id];
      setPegas(novas);
      if (novas.length === 3) window.setTimeout(() => onAcerto(erros, 'letra:' + rodada.alvo), 250);
    } else {
      errar(String(id));
      onErro('letra:' + rodada.alvo);
    }
  };

  return (
    <div className="jogo">
      <div className="alvo-grande letra">{rodada.alvo}</div>
      <div className="contador-pegas" aria-label={`${pegas.length} de 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < pegas.length ? 'on' : ''} />
        ))}
      </div>
      <div className="grade grade-4">
        {rodada.celulas.map(({ id, l }) => {
          const pega = pegas.includes(id);
          return (
            <button
              key={id}
              className={`carta letra ${pega ? 'pega' : ''} ${tremendo === String(id) ? 'treme' : ''} ${
                dica && l === rodada.alvo && !pega ? 'pulsa' : ''
              }`}
              onClick={() => tocar(id, l)}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Teia das Letras ----------------

export function TeiaLetras({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const letras = fase.letras ?? [...VOGAIS];
  const rodada = useMemo(() => {
    const alvo = escolherPorPeso('teia', letras, (x) => 'letra:' + x, itens);
    const certa = sortear(INICIAIS[alvo]);
    const outrasLetras = sortearVarios(letras, 2, [alvo]);
    const erradas = outrasLetras.map((l) => sortear(INICIAIS[l]));
    return { alvo, opcoes: embaralhar([certa, ...erradas]), certa };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);

  const tocar = (p: Palavra) => {
    if (feito) return;
    if (p === rodada.certa) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'letra:' + rodada.alvo), 250);
    } else {
      errar(p.palavra);
      onErro('letra:' + rodada.alvo);
    }
  };

  return (
    <div className="jogo">
      <div className="alvo-grande letra">{rodada.alvo}</div>
      <div className="grade grade-3">
        {rodada.opcoes.map((p) => (
          <button
            key={p.palavra}
            className={`carta figura ${tremendo === p.palavra ? 'treme' : ''} ${
              feito && p === rodada.certa ? 'certa' : ''
            } ${dica && p === rodada.certa && !feito ? 'pulsa' : ''}`}
            onClick={() => tocar(p)}
          >
            <span className="emoji">{p.figura}</span>
            <span className="palavra-legenda">
              <b>{p.palavra[0]}</b>
              {p.palavra.slice(1)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Junta-Sílaba ----------------

export function JuntaSilaba({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const silabas = fase.silabas ?? [];
  const rodada = useMemo(() => {
    const alvo = escolherPorPeso('junta', silabas, (x) => 'silaba:' + x, itens);
    const c = alvo[0];
    const v = alvo[1];
    const consoantes = embaralhar([c, ...sortearVarios(CONSOANTES_1, 2, [c])]);
    const vogais = embaralhar([v, ...sortearVarios(VOGAIS, 2, [v])]);
    return { alvo, c, v, consoantes, vogais };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [slot1, setSlot1] = useState<string | null>(null);
  const [slot2, setSlot2] = useState<string | null>(null);
  const { erros, errar, tremendo, dica } = useErros();

  const tocarC = (l: string) => {
    if (slot1) return;
    if (l === rodada.c) setSlot1(l);
    else {
      errar('c' + l);
      onErro('silaba:' + rodada.alvo);
    }
  };
  const tocarV = (l: string) => {
    if (!slot1 || slot2) {
      if (!slot1) errar('v' + l);
      return;
    }
    if (l === rodada.v) {
      setSlot2(l);
      window.setTimeout(() => onAcerto(erros, 'silaba:' + rodada.alvo), 600);
    } else {
      errar('v' + l);
      onErro('silaba:' + rodada.alvo);
    }
  };

  return (
    <div className="jogo">
      <div className="balao-alvo letra">{rodada.alvo}</div>
      <div className="slots">
        <div className={`slot letra ${slot1 ? 'cheio' : 'ativo'}`}>{slot1 ?? ''}</div>
        <span className="mais">+</span>
        <div className={`slot letra ${slot2 ? 'cheio' : slot1 ? 'ativo' : ''}`}>{slot2 ?? ''}</div>
        <span className="mais">=</span>
        <div className={`slot resultado letra ${slot2 ? 'cheio' : ''}`}>{slot2 ? rodada.alvo : '?'}</div>
      </div>
      <div className="fileira">
        {rodada.consoantes.map((l) => (
          <button
            key={'c' + l}
            className={`carta letra consoante ${tremendo === 'c' + l ? 'treme' : ''} ${slot1 === l ? 'usada' : ''} ${
              dica && !slot1 && l === rodada.c ? 'pulsa' : ''
            }`}
            onClick={() => tocarC(l)}
            disabled={!!slot1}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="fileira">
        {rodada.vogais.map((l) => (
          <button
            key={'v' + l}
            className={`carta letra vogal ${tremendo === 'v' + l ? 'treme' : ''} ${slot2 === l ? 'usada' : ''} ${
              dica && slot1 && !slot2 && l === rodada.v ? 'pulsa' : ''
            }`}
            onClick={() => tocarV(l)}
            disabled={!!slot2}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Sílaba que Falta ----------------

export function SilabaInicial({ fase, rodada: n, itens, onAcerto, onErro }: PropsJogo) {
  const rodada = useMemo(() => {
    const lista = fase.trilha === 'familia' && fase.palavras ? fase.palavras : PALAVRAS_CVCV;
    const palavra = escolherPorPeso('sil-ini', lista, (p) => 'palavra:' + p.palavra, itens);
    let falta: number;
    if (fase.trilha === 'familia' && fase.silabas) {
      // família da semana: o buraco cai sempre numa sílaba da família (CA, CO…)
      const posicoes = palavra.silabas.map((s, i) => (fase.silabas!.includes(s) ? i : -1)).filter((i) => i >= 0);
      falta = sortear(posicoes.length ? posicoes : [0]);
    } else {
      // fase 3: sempre falta a primeira sílaba; fase 4: pode faltar qualquer uma
      falta = fase.id === 'palavras' && Math.random() < 0.5 ? palavra.silabas.length - 1 : 0;
    }
    const certa = palavra.silabas[falta];
    const pool = Array.from(new Set([...PALAVRAS_CVCV, ...lista].flatMap((p) => p.silabas)));
    // distratores parecidos: mesma consoante ou mesma vogal ajudam a olhar com atenção
    const parecidas = pool.filter((s) => s !== certa && (s[0] === certa[0] || s[1] === certa[1]));
    const erradas = sortearVarios(parecidas.length >= 2 ? parecidas : pool, 2, [certa]);
    return { palavra, falta, certa, opcoes: embaralhar([certa, ...erradas]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);
  const mostrarModelo = n < 2;

  const tocar = (s: string) => {
    if (feito) return;
    if (s === rodada.certa) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'palavra:' + rodada.palavra.palavra), 600);
    } else {
      errar(s);
      onErro('palavra:' + rodada.palavra.palavra);
    }
  };

  return (
    <div className="jogo">
      <div className="figura-grande">{rodada.palavra.figura}</div>
      {mostrarModelo && <div className="modelo">{rodada.palavra.palavra}</div>}
      <div className="slots">
        {rodada.palavra.silabas.map((s, i) =>
          i === rodada.falta ? (
            <div key={i} className={`slot silaba ${feito ? 'cheio' : 'ativo'}`}>
              {feito ? s : ''}
            </div>
          ) : (
            <div key={i} className="slot silaba fixo">
              {s}
            </div>
          ),
        )}
      </div>
      <div className="fileira">
        {rodada.opcoes.map((s) => (
          <button
            key={s}
            className={`carta silaba ${tremendo === s ? 'treme' : ''} ${dica && !feito && s === rodada.certa ? 'pulsa' : ''}`}
            onClick={() => tocar(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Monta-Palavra ----------------

export function MontaPalavra({ fase, rodada: n, itens, onAcerto, onErro }: PropsJogo) {
  const palavras = fase.palavras ?? PALAVRAS_CVCV;
  const rodada = useMemo(() => {
    const palavra = escolherPorPeso('monta', palavras, (p) => 'palavra:' + p.palavra, itens);
    const pool = Array.from(new Set(palavras.flatMap((p) => p.silabas)));
    const extra = sortearVarios(pool, 1, palavra.silabas);
    const pecas = embaralhar([...palavra.silabas, ...extra]).map((s, i) => ({ id: i, s }));
    return { palavra, pecas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [usadas, setUsadas] = useState<number[]>([]);
  const { erros, errar, tremendo, dica } = useErros();
  const pos = usadas.length;
  const completo = pos === rodada.palavra.silabas.length;
  const mostrarModelo = n < 2;

  const tocar = (id: number, s: string) => {
    if (completo || usadas.includes(id)) return;
    if (s === rodada.palavra.silabas[pos]) {
      const novas = [...usadas, id];
      setUsadas(novas);
      if (novas.length === rodada.palavra.silabas.length) {
        window.setTimeout(() => onAcerto(erros, 'palavra:' + rodada.palavra.palavra), 700);
      }
    } else {
      errar(String(id));
      onErro('palavra:' + rodada.palavra.palavra);
    }
  };

  const proximaCerta = rodada.pecas.find((p) => !usadas.includes(p.id) && p.s === rodada.palavra.silabas[pos]);

  return (
    <div className="jogo">
      <div className="figura-grande">{rodada.palavra.figura}</div>
      {mostrarModelo && <div className="modelo">{rodada.palavra.palavra}</div>}
      <div className="slots">
        {rodada.palavra.silabas.map((s, i) => (
          <div key={i} className={`slot silaba ${i < pos ? 'cheio' : i === pos ? 'ativo' : ''}`}>
            {i < pos ? s : ''}
          </div>
        ))}
      </div>
      {completo && <div className="palavra-pronta">{rodada.palavra.palavra}</div>}
      <div className="fileira">
        {rodada.pecas.map(({ id, s }) => (
          <button
            key={id}
            className={`carta silaba ${usadas.includes(id) ? 'usada' : ''} ${tremendo === String(id) ? 'treme' : ''} ${
              dica && proximaCerta?.id === id ? 'pulsa' : ''
            }`}
            onClick={() => tocar(id, s)}
            disabled={usadas.includes(id)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Conta-Teia ----------------

export function ContaTeia({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const [min, max] = fase.faixa ?? [1, 5];
  const rodada = useMemo(() => {
    const numeros = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const n = escolherPorPeso('conta', numeros, (x) => 'num:' + x, itens);
    const perto = numeros.filter((x) => x !== n && Math.abs(x - n) <= 3);
    const erradas = sortearVarios(perto.length >= 2 ? perto : numeros, 2, [n]);
    return { n, objeto: sortear(OBJETOS_CONTAGEM), opcoes: embaralhar([n, ...erradas]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);
  const [marcados, setMarcados] = useState<number[]>([]);

  // Objetos em "quadros de 10" (2 fileiras de 5): ajuda a ver dezenas
  const quadros: number[][] = [];
  for (let i = 0; i < rodada.n; i += 10) {
    quadros.push(Array.from({ length: 10 }, (_, k) => i + k));
  }
  if (rodada.n === 0) quadros.push(Array.from({ length: 10 }, (_, k) => k));

  const tocar = (x: number) => {
    if (feito) return;
    if (x === rodada.n) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'num:' + rodada.n), 600);
    } else {
      errar(String(x));
      onErro('num:' + rodada.n);
    }
  };

  return (
    <div className="jogo">
      <div className="quadros">
        {quadros.map((q, qi) => (
          <div className={`quadro-10 ${rodada.n > 10 ? (qi === 0 ? 'q-dezena' : 'q-unidade') : ''}`} key={qi}>
            {q.map((idx) =>
              idx < rodada.n ? (
                <button
                  key={idx}
                  className={`obj ${marcados.includes(idx) ? 'marcado' : ''}`}
                  onClick={() => setMarcados((m) => (m.includes(idx) ? m : [...m, idx]))}
                  aria-label="objeto"
                >
                  {rodada.objeto}
                </button>
              ) : (
                <span key={idx} className="obj vazio" />
              ),
            )}
          </div>
        ))}
      </div>
      {rodada.n > 10 ? (
        <div className="dica-toque">
          Um quadro cheio é <b className="dez">10</b>. Mais <b className="uni">{rodada.n - 10}</b>.
        </div>
      ) : (
        <div className="dica-toque">Toque em cada um para contar: {marcados.length}</div>
      )}
      <div className="fileira">
        {rodada.opcoes.map((x) => (
          <button
            key={x}
            className={`carta numero ${tremendo === String(x) ? 'treme' : ''} ${
              feito && x === rodada.n ? 'certa' : ''
            } ${dica && !feito && x === rodada.n ? 'pulsa' : ''}`}
            onClick={() => tocar(x)}
          >
            <NumCor n={x} />
          </button>
        ))}
      </div>
    </div>
  );
}

// Número com a dezena em azul e a unidade em vermelho (18 = 1 dezena + 8).
export function NumCor({ n }: { n: number }) {
  if (n < 10 || n > 99) return <>{n}</>;
  return (
    <span className="numcor">
      <span className="dez">{Math.floor(n / 10)}</span>
      <span className="uni">{n % 10}</span>
    </span>
  );
}

// ---------------- Dez e Mais ----------------
// Um quadro cheio (10) + alguns soltos. 10 + 8 = 18. A opção trocada (81) treina a ordem dos algarismos.

export function DezMais({ fase, itens, onAcerto, onErro }: PropsJogo) {
  const [min, max] = fase.faixa ?? [11, 15];
  const rodada = useMemo(() => {
    const nums = Array.from({ length: max - Math.max(11, min) + 1 }, (_, i) => Math.max(11, min) + i);
    const n = escolherPorPeso('dez', nums, (x) => 'num:' + x, itens);
    const k = n - 10;
    const trocado = k > 0 && k < 10 ? k * 10 + 1 : n + 2;
    const vizinho = n + (Math.random() < 0.5 ? -1 : 1);
    const opcoes = embaralhar(Array.from(new Set([n, trocado === n ? n + 2 : trocado, vizinho])));
    return { n, k, objeto: sortear(OBJETOS_CONTAGEM), opcoes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { erros, errar, tremendo, dica } = useErros();
  const [feito, setFeito] = useState(false);

  const tocar = (x: number) => {
    if (feito) return;
    if (x === rodada.n) {
      setFeito(true);
      window.setTimeout(() => onAcerto(erros, 'num:' + rodada.n), 700);
    } else {
      errar(String(x));
      onErro('num:' + rodada.n);
    }
  };

  return (
    <div className="jogo">
      <div className="expressao">
        <span className="dez">10</span>
        <span className="op">+</span>
        <span className="uni">{rodada.k}</span>
        <span className="op">=</span>
        <span className={`resp ${feito ? 'cheio' : ''}`}>{feito ? <NumCor n={rodada.n} /> : '?'}</span>
      </div>
      <div className="quadros">
        <div className="quadro-10 q-dezena">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="obj">
              {rodada.objeto}
            </span>
          ))}
        </div>
        <div className="quadro-10 q-unidade">
          {Array.from({ length: 10 }, (_, i) =>
            i < rodada.k ? (
              <span key={i} className="obj">
                {rodada.objeto}
              </span>
            ) : (
              <span key={i} className="obj vazio" />
            ),
          )}
        </div>
      </div>
      <div className="dica-toque">
        O <b className="dez">1</b> da frente é o quadro cheio. O <b className="uni">{rodada.k % 10}</b> é o que sobra.
      </div>
      <div className="fileira">
        {rodada.opcoes.map((x) => (
          <button
            key={x}
            className={`carta numero ${tremendo === String(x) ? 'treme' : ''} ${feito && x === rodada.n ? 'certa' : ''} ${
              dica && !feito && x === rodada.n ? 'pulsa' : ''
            }`}
            onClick={() => tocar(x)}
          >
            <NumCor n={x} />
          </button>
        ))}
      </div>
    </div>
  );
}

export const JOGOS: Record<TipoJogo, (p: PropsJogo) => React.JSX.Element> = {
  'caca-letra': CacaLetra,
  'teia-letras': TeiaLetras,
  'junta-silaba': JuntaSilaba,
  'silaba-inicial': SilabaInicial,
  'monta-palavra': MontaPalavra,
  'conta-teia': ContaTeia,
  'letra-que-falta': LetraQueFalta,
  'liga-letra': LigaLetra,
  'toque-quantidade': ToqueQuantidade,
  depois: Depois,
  soma: Soma,
  subtracao: Subtracao,
  'dez-mais': DezMais,
};
