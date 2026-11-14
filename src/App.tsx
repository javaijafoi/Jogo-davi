import { useEffect, useMemo, useRef, useState } from 'react';
import { ACERTO_PARA_PASSAR, CORES_SKATE, FASES, RODADAS_POR_JOGO, type Fase } from './data';
import { Davi } from './Davi';
import { INFO_JOGOS, JOGOS } from './games';
import { carregar, estrelasPara, progressoInicial, proximaFase, salvar, type Progresso } from './storage';
import { IconeTeia, Teia } from './Teia';
import { codigoDoAparelho, enviarSessao, esvaziarFila, normalizarCodigo, servidor, trocarCodigo } from './sync';

type EstadoNuvem = '...' | 'ok' | 'offline';

type Tela =
  | { nome: 'inicio' }
  | { nome: 'mapa' }
  | { nome: 'sessao'; faseId: string }
  | { nome: 'resultado'; faseId: string; acertos: number; total: number; corNova?: string; liberou?: string; novaFase?: boolean }
  | { nome: 'garagem' }
  | { nome: 'adulto' };

const ELOGIOS = ['BOA!', 'ISSO AÍ!', 'MANDOU BEM!', 'DEMAIS!', 'ARRASOU!', 'SHOW!'];

export default function App() {
  const [tela, setTela] = useState<Tela>({ nome: 'inicio' });
  const [prog, setProg] = useState<Progresso>(() => carregar());
  const [codigo, setCodigo] = useState(() => codigoDoAparelho());
  const [nuvem, setNuvem] = useState<EstadoNuvem>('...');
  // Toda mudança feita pelo jogo marca a hora, para saber qual cópia é a mais nova.
  const atualizar = (fn: (p: Progresso) => Progresso) => setProg((p) => ({ ...fn(p), atualizadoEm: Date.now() }));

  useEffect(() => salvar(prog), [prog]);

  // Ao abrir: busca a cópia do servidor e fica com a mais nova.
  useEffect(() => {
    let vivo = true;
    servidor
      .carregar(codigo)
      .then((remoto) => {
        if (!vivo) return;
        if (remoto && (remoto.atualizadoEm ?? 0) > (carregar().atualizadoEm ?? 0)) {
          setProg({ ...progressoInicial(), ...remoto });
        }
        setNuvem('ok');
      })
      .catch(() => vivo && setNuvem('offline'));
    esvaziarFila(codigo);
    return () => {
      vivo = false;
    };
  }, [codigo]);

  // Envia para o servidor 1,5 s depois da última mudança.
  useEffect(() => {
    if (!prog.atualizadoEm) return;
    const t = window.setTimeout(() => {
      servidor
        .salvar(codigo, prog)
        .then(() => setNuvem('ok'))
        .catch(() => setNuvem('offline'));
    }, 1500);
    return () => window.clearTimeout(t);
  }, [prog, codigo]);
  const corSkate = CORES_SKATE.find((c) => c.id === prog.corSkate)?.cor ?? '#7b3fe4';

  return (
    <div className="app">
      <Teia className="teia-canto tl" tamanho={150} />
      <Teia className="teia-canto br" tamanho={150} />
      {tela.nome === 'inicio' && (
        <Inicio corSkate={corSkate} onJogar={() => setTela({ nome: 'mapa' })} teias={prog.teias} />
      )}
      {tela.nome === 'mapa' && (
        <Mapa
          prog={prog}
          corSkate={corSkate}
          onFase={(id) => setTela({ nome: 'sessao', faseId: id })}
          onVoltar={() => setTela({ nome: 'inicio' })}
          onGaragem={() => setTela({ nome: 'garagem' })}
          onAdulto={() => setTela({ nome: 'adulto' })}
        />
      )}
      {tela.nome === 'sessao' && (
        <Sessao
          key={tela.faseId + prog.sessoes}
          fase={FASES.find((f) => f.id === tela.faseId)!}
          prog={prog}
          corSkate={corSkate}
          onSair={() => setTela({ nome: 'mapa' })}
          onErroItem={(item) =>
            atualizar((p) => ({ ...p, errosPorItem: { ...p.errosPorItem, [item]: (p.errosPorItem[item] ?? 0) + 1 } }))
          }
          onAcertoItem={(item, erros) =>
            atualizar((p) => {
              const atual = p.errosPorItem[item] ?? 0;
              const novo = erros === 0 ? Math.max(0, atual - 1) : atual;
              return { ...p, teias: p.teias + 1, errosPorItem: { ...p.errosPorItem, [item]: novo } };
            })
          }
          onFim={(acertos, total) => {
            const faseId = tela.faseId;
            const taxa = acertos / total;
            const p = prog;
            const antes = p.fases[faseId];
            const prox = proximaFase(faseId);
            const passou = taxa >= ACERTO_PARA_PASSAR;
            const liberadas = passou && prox && !p.liberadas.includes(prox) ? [...p.liberadas, prox] : p.liberadas;
            const proxCor = CORES_SKATE.find((c) => !p.coresGanhas.includes(c.id));
            enviarSessao(codigo, { fase: faseId, acertos, total });
            atualizar((cur) => ({
              ...cur,
              sessoes: cur.sessoes + 1,
              liberadas: Array.from(new Set([...cur.liberadas, ...liberadas])),
              coresGanhas: proxCor ? Array.from(new Set([...cur.coresGanhas, proxCor.id])) : cur.coresGanhas,
              fases: {
                ...cur.fases,
                [faseId]: {
                  melhor: Math.max(antes?.melhor ?? 0, taxa),
                  vezes: (antes?.vezes ?? 0) + 1,
                  estrelas: Math.max(antes?.estrelas ?? 0, estrelasPara(taxa)),
                },
              },
            }));
            setTela({
              nome: 'resultado',
              faseId,
              acertos,
              total,
              corNova: proxCor?.id,
              liberou: passou && prox ? prox : undefined,
              novaFase: passou && !!prox && !p.liberadas.includes(prox),
            });
          }}
        />
      )}
      {tela.nome === 'resultado' && (
        <Resultado
          {...tela}
          corSkate={corSkate}
          onDeNovo={() => setTela({ nome: 'sessao', faseId: tela.faseId })}
          onProxima={tela.liberou ? () => setTela({ nome: 'sessao', faseId: tela.liberou! }) : undefined}
          onMapa={() => setTela({ nome: 'mapa' })}
          onUsarCor={(id) => atualizar((p) => ({ ...p, corSkate: id }))}
        />
      )}
      {tela.nome === 'garagem' && (
        <Garagem prog={prog} onEscolher={(id) => atualizar((p) => ({ ...p, corSkate: id }))} onVoltar={() => setTela({ nome: 'mapa' })} />
      )}
      {tela.nome === 'adulto' && (
        <Adulto
          prog={prog}
          atualizar={atualizar}
          codigo={codigo}
          nuvem={nuvem}
          onTrocarCodigo={async (novo) => {
            const remoto = await servidor.carregar(novo);
            if (!remoto) return false;
            trocarCodigo(novo);
            setProg({ ...progressoInicial(), ...remoto });
            setCodigo(novo);
            return true;
          }}
          onVoltar={() => setTela({ nome: 'mapa' })}
        />
      )}
    </div>
  );
}

// ---------------- Início ----------------

function Inicio({ corSkate, onJogar, teias }: { corSkate: string; onJogar: () => void; teias: number }) {
  return (
    <main className="tela inicio">
      <h1 className="titulo">
        <span className="t1">JOGO DO</span>
        <span className="t2">DAVI</span>
      </h1>
      <div className="cena-inicio">
        <Davi corSkate={corSkate} tamanho={170} className="anda" />
      </div>
      <button className="botao-grande vermelho" onClick={onJogar}>
        JOGAR ▶
      </button>
      {teias > 0 && (
        <div className="placar-teias">
          <IconeTeia /> {teias}
        </div>
      )}
    </main>
  );
}

// ---------------- Mapa ----------------

function Mapa(props: {
  prog: Progresso;
  corSkate: string;
  onFase: (id: string) => void;
  onVoltar: () => void;
  onGaragem: () => void;
  onAdulto: () => void;
}) {
  const { prog, onFase } = props;
  const letras = FASES.filter((f) => f.trilha === 'letras');
  const numeros = FASES.filter((f) => f.trilha === 'numeros');
  // Fase atual = a última liberada da trilha de letras
  const atual = [...letras].reverse().find((f) => prog.liberadas.includes(f.id));

  const Predio = ({ f }: { f: Fase }) => {
    const livre = prog.liberadas.includes(f.id);
    const est = prog.fases[f.id]?.estrelas ?? 0;
    return (
      <button className={`predio ${f.trilha} ${livre ? '' : 'trancado'}`} disabled={!livre} onClick={() => onFase(f.id)}>
        <span className="predio-num">{f.numero}</span>
        <span className="predio-titulo">{f.titulo}</span>
        <span className="predio-desc">{f.descricao}</span>
        <span className="estrelas">
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= est ? 'on' : ''}>
              ★
            </span>
          ))}
        </span>
        {!livre && (
          <span className="cadeado">
            <IconeTeia tamanho={34} />
          </span>
        )}
        {atual?.id === f.id && <Davi corSkate={props.corSkate} tamanho={46} className="davi-no-predio" />}
      </button>
    );
  };

  return (
    <main className="tela mapa">
      <header className="barra">
        <button className="botao-icone" onClick={props.onVoltar} aria-label="Voltar">
          ◀
        </button>
        <div className="placar-teias">
          <IconeTeia /> {prog.teias}
        </div>
        <button className="botao-icone" onClick={props.onGaragem} aria-label="Garagem">
          🛹
        </button>
        <button className="botao-icone pequeno" onClick={props.onAdulto} aria-label="Área do adulto">
          👤
        </button>
      </header>
      <h2 className="secao">LETRAS</h2>
      <div className="cidade">
        {letras.map((f) => (
          <Predio key={f.id} f={f} />
        ))}
        {['Mais letras', 'Maiúscula e minúscula', 'Palavras grandes'].map((t, i) => (
          <div className="predio em-breve" key={t}>
            <span className="predio-num">{5 + i}</span>
            <span className="predio-titulo">{t}</span>
            <span className="predio-desc">em breve</span>
          </div>
        ))}
      </div>
      <h2 className="secao azul">NÚMEROS</h2>
      <div className="cidade">
        {numeros.map((f) => (
          <Predio key={f.id} f={f} />
        ))}
        <div className="predio em-breve">
          <span className="predio-num">4</span>
          <span className="predio-titulo">Números até 100</span>
          <span className="predio-desc">em breve</span>
        </div>
      </div>
    </main>
  );
}

// ---------------- Sessão ----------------

function Sessao(props: {
  fase: Fase;
  prog: Progresso;
  corSkate: string;
  onSair: () => void;
  onFim: (acertos: number, total: number) => void;
  onErroItem: (item: string) => void;
  onAcertoItem: (item: string, erros: number) => void;
}) {
  const { fase } = props;
  const total = fase.jogos.length * RODADAS_POR_JOGO;
  const [passo, setPasso] = useState(0); // 0..total-1
  const [acertos, setAcertos] = useState(0);
  const [festa, setFesta] = useState<string | null>(null);
  const [intro, setIntro] = useState(true);
  const [sair, setSair] = useState(false);
  const fim = useRef(false);
  const jogoIdx = Math.floor(passo / RODADAS_POR_JOGO);
  const rodada = passo % RODADAS_POR_JOGO;
  const tipo = fase.jogos[jogoIdx];
  const Jogo = JOGOS[tipo];
  const info = INFO_JOGOS[tipo];
  const revisar = useMemo(
    () => Object.entries(props.prog.errosPorItem).filter(([, n]) => n > 0).map(([k]) => k),
    // revisão calculada no início da sessão
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Mostra o nome do mini-jogo por um instante sempre que ele muda
  useEffect(() => {
    if (rodada !== 0) return;
    setIntro(true);
    const t = window.setTimeout(() => setIntro(false), 1600);
    return () => window.clearTimeout(t);
  }, [jogoIdx, rodada]);

  const acertou = (erros: number, item: string) => {
    props.onAcertoItem(item, erros);
    const novoAcertos = acertos + (erros === 0 ? 1 : 0);
    setAcertos(novoAcertos);
    setFesta(erros === 0 ? ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)] : 'CONSEGUIU!');
    window.setTimeout(() => {
      setFesta(null);
      if (passo + 1 >= total) {
        if (!fim.current) {
          fim.current = true;
          props.onFim(novoAcertos, total);
        }
      } else setPasso((p) => p + 1);
    }, 1100);
  };

  return (
    <main className={`tela sessao trilha-${fase.trilha}`}>
      <header className="barra">
        <button className="botao-icone" onClick={() => setSair(true)} aria-label="Sair">
          ✕
        </button>
        <div className="progresso-teias" aria-label={`${passo} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < passo ? 'feito' : i === passo ? 'agora' : ''} />
          ))}
        </div>
      </header>
      <div className="instrucao">
        <span className="instrucao-icone">{info.icone}</span>
        <span>{info.instrucao}</span>
      </div>
      <div className="palco">
        {intro ? (
          <div className="intro-jogo">
            <Davi corSkate={props.corSkate} tamanho={110} className="anda" />
            <div className="intro-nome">{info.nome}</div>
          </div>
        ) : (
          <Jogo
            key={passo}
            fase={fase}
            rodada={rodada}
            revisar={revisar}
            onAcerto={acertou}
            onErro={props.onErroItem}
          />
        )}
      </div>
      {sair && (
        <div className="confirmar">
          <div className="caixa">
            <p>Parar agora?</p>
            <div className="botoes">
              <button className="botao-grande azul" onClick={() => setSair(false)}>
                CONTINUAR
              </button>
              <button className="botao-medio" onClick={props.onSair}>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
      {festa && (
        <div className="festa" role="status">
          <div className="balao-hq">{festa}</div>
          <Davi humor="festa" corSkate={props.corSkate} tamanho={120} />
        </div>
      )}
    </main>
  );
}

// ---------------- Resultado ----------------

function Resultado(props: {
  faseId: string;
  acertos: number;
  total: number;
  corNova?: string;
  liberou?: string;
  novaFase?: boolean;
  corSkate: string;
  onDeNovo: () => void;
  onProxima?: () => void;
  onMapa: () => void;
  onUsarCor: (id: string) => void;
}) {
  const taxa = props.acertos / props.total;
  const est = estrelasPara(taxa);
  const cor = CORES_SKATE.find((c) => c.id === props.corNova);
  const proxima = FASES.find((f) => f.id === props.liberou);
  return (
    <main className="tela resultado">
      <div className="balao-hq grande">{est >= 2 ? 'VOCÊ CONSEGUIU!' : 'MUITO BEM, VAMOS TREINAR MAIS!'}</div>
      <div className="estrelas grandes">
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= est ? 'on' : ''} style={{ animationDelay: `${i * 0.25}s` }}>
            ★
          </span>
        ))}
      </div>
      <Davi humor="festa" corSkate={props.corSkate} tamanho={100} />
      <div className="placar-teias grande">
        <IconeTeia tamanho={30} /> {props.acertos} de {props.total} de primeira
      </div>
      {cor && (
        <div className="premio">
          <span>Skate novo!</span>
          <svg viewBox="0 0 100 30" width="140" height="42" aria-hidden="true">
            <rect x="4" y="6" width="92" height="10" rx="5" fill={cor.cor} />
            <circle cx="20" cy="22" r="5" fill="#eee" />
            <circle cx="80" cy="22" r="5" fill="#eee" />
          </svg>
          <button className="botao-medio" onClick={() => props.onUsarCor(cor.id)}>
            Usar {cor.nome}
          </button>
        </div>
      )}
      {proxima && props.novaFase && <div className="liberou">Fase nova liberada: {proxima.titulo}</div>}
      <div className="botoes">
        {props.onProxima && (
          <button className="botao-grande vermelho" onClick={props.onProxima}>
            PRÓXIMA ▶
          </button>
        )}
        <button className="botao-grande azul" onClick={props.onDeNovo}>
          DE NOVO ↻
        </button>
        <button className="botao-medio" onClick={props.onMapa}>
          Mapa
        </button>
      </div>
      <p className="aviso-pausa">Hora de uma pausa! Volte amanhã para mais.</p>
    </main>
  );
}

// ---------------- Garagem ----------------

function Garagem({ prog, onEscolher, onVoltar }: { prog: Progresso; onEscolher: (id: string) => void; onVoltar: () => void }) {
  const cor = CORES_SKATE.find((c) => c.id === prog.corSkate)?.cor;
  return (
    <main className="tela garagem">
      <header className="barra">
        <button className="botao-icone" onClick={onVoltar} aria-label="Voltar">
          ◀
        </button>
        <h2 className="secao">GARAGEM</h2>
      </header>
      <Davi corSkate={cor} tamanho={180} />
      <p className="texto-claro">Escolha o skate. Termine fases para ganhar cores novas.</p>
      <div className="cores">
        {CORES_SKATE.map((c) => {
          const tem = prog.coresGanhas.includes(c.id);
          return (
            <button
              key={c.id}
              className={`cor ${prog.corSkate === c.id ? 'escolhida' : ''}`}
              style={{ background: tem ? c.cor : undefined }}
              disabled={!tem}
              onClick={() => onEscolher(c.id)}
              aria-label={c.nome}
            >
              {!tem && '?'}
            </button>
          );
        })}
      </div>
    </main>
  );
}

// ---------------- Área do adulto ----------------

function Adulto({
  prog,
  atualizar,
  codigo,
  nuvem,
  onTrocarCodigo,
  onVoltar,
}: {
  prog: Progresso;
  atualizar: (fn: (p: Progresso) => Progresso) => void;
  codigo: string;
  nuvem: EstadoNuvem;
  onTrocarCodigo: (novo: string) => Promise<boolean>;
  onVoltar: () => void;
}) {
  const [historico, setHistorico] = useState<{ fase: string; acertos: number; total: number; feita_em: string }[] | null>(null);
  const [outroCodigo, setOutroCodigo] = useState('');
  const [msgCodigo, setMsgCodigo] = useState('');
  const [conta] = useState(() => {
    const a = 3 + Math.floor(Math.random() * 6);
    const b = 3 + Math.floor(Math.random() * 6);
    return { a, b };
  });
  const [resp, setResp] = useState('');
  const [ok, setOk] = useState(false);
  const [confirmarZerar, setConfirmarZerar] = useState(false);

  if (!ok) {
    return (
      <main className="tela adulto">
        <header className="barra">
          <button className="botao-icone" onClick={onVoltar} aria-label="Voltar">
            ◀
          </button>
          <h2 className="secao">ÁREA DO ADULTO</h2>
        </header>
        <p className="texto-claro">
          Para entrar, quanto é {conta.a} × {conta.b}?
        </p>
        <form
          className="porta"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(resp) === conta.a * conta.b) setOk(true);
            else setResp('');
          }}
        >
          <input inputMode="numeric" value={resp} onChange={(e) => setResp(e.target.value)} autoFocus />
          <button className="botao-medio">Entrar</button>
        </form>
      </main>
    );
  }

  const errosTop = Object.entries(prog.errosPorItem)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <main className="tela adulto">
      <header className="barra">
        <button className="botao-icone" onClick={onVoltar} aria-label="Voltar">
          ◀
        </button>
        <h2 className="secao">ÁREA DO ADULTO</h2>
      </header>
      <section className="painel">
        <h3>Progresso</h3>
        <table>
          <thead>
            <tr>
              <th>Fase</th>
              <th>Vezes</th>
              <th>Melhor acerto</th>
              <th>Liberada</th>
            </tr>
          </thead>
          <tbody>
            {FASES.map((f) => {
              const r = prog.fases[f.id];
              return (
                <tr key={f.id}>
                  <td>{f.titulo}</td>
                  <td>{r?.vezes ?? 0}</td>
                  <td>{r ? Math.round(r.melhor * 100) + '%' : '–'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={prog.liberadas.includes(f.id)}
                      onChange={(e) =>
                        atualizar((p) => ({
                          ...p,
                          liberadas: e.target.checked
                            ? [...p.liberadas, f.id]
                            : p.liberadas.filter((x) => x !== f.id),
                        }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="nota">Passa de fase com 80% de acerto de primeira. Sessões feitas: {prog.sessoes}.</p>
      </section>
      <section className="painel">
        <h3>Evolução</h3>
        {historico === null ? (
          <button
            className="botao-medio"
            onClick={() =>
              servidor
                .historico(codigo)
                .then(setHistorico)
                .catch(() => setHistorico([]))
            }
          >
            Ver sessões salvas
          </button>
        ) : historico.length === 0 ? (
          <p className="nota">Nenhuma sessão salva no servidor ainda (ou sem internet).</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Dia</th>
                <th>Fase</th>
                <th>Acerto</th>
              </tr>
            </thead>
            <tbody>
              {historico.slice(0, 50).map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.feita_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{FASES.find((f) => f.id === h.fase)?.titulo ?? h.fase}</td>
                  <td>{Math.round((h.acertos / h.total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="painel">
        <h3>Onde ele mais erra</h3>
        {errosTop.length === 0 ? (
          <p className="nota">Nada ainda.</p>
        ) : (
          <div className="chips">
            {errosTop.map(([k, n]) => (
              <span key={k} className="chip">
                {k} <small>×{n}</small>
              </span>
            ))}
          </div>
        )}
        <p className="nota">Esses itens voltam com mais frequência nas próximas sessões.</p>
      </section>
      <section className="painel">
        <h3>Cópia no servidor</h3>
        <p className="nota">
          {nuvem === 'ok' ? '✅ Progresso salvo no servidor.' : nuvem === 'offline' ? '⚠️ Sem conexão: salvo só neste aparelho por enquanto.' : 'Verificando…'}
        </p>
        <p className="nota">
          Código do jogador: <b className="codigo">{codigo}</b>
        </p>
        <p className="nota">Anote este código. Em outro celular ou tablet, digite-o abaixo para continuar de onde parou.</p>
        <form
          className="porta"
          onSubmit={async (e) => {
            e.preventDefault();
            const c = normalizarCodigo(outroCodigo);
            if (c.length < 8) return setMsgCodigo('Código incompleto.');
            setMsgCodigo('Buscando…');
            const ok = await onTrocarCodigo(c).catch(() => false);
            setMsgCodigo(ok ? 'Pronto! Progresso recuperado.' : 'Não achei esse código.');
          }}
        >
          <input className="campo-codigo" placeholder="XXXXX-XXXXX" value={outroCodigo} onChange={(e) => setOutroCodigo(e.target.value)} />
          <button className="botao-medio">Usar</button>
        </form>
        {msgCodigo && <p className="nota">{msgCodigo}</p>}
      </section>
      <section className="painel">
        <h3>Como usar</h3>
        <ul className="nota">
          <li>Sessões curtas: uma fase por vez, cerca de 10 minutos, de preferência todo dia.</li>
          <li>No começo, sente junto e leia em voz alta a letra, a sílaba e o nome das figuras.</li>
          <li>Depois ele pode repetir sozinho as fases que já conhece.</li>
        </ul>
      </section>
      <section className="painel">
        {confirmarZerar ? (
          <div className="botoes">
            <span className="nota">Apagar todo o progresso?</span>
            <button
              className="botao-medio perigo"
              onClick={() => {
                atualizar(() => progressoInicial());
                setConfirmarZerar(false);
              }}
            >
              Sim, apagar
            </button>
            <button className="botao-medio" onClick={() => setConfirmarZerar(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="botao-medio perigo" onClick={() => setConfirmarZerar(true)}>
            Zerar progresso
          </button>
        )}
      </section>
    </main>
  );
}
