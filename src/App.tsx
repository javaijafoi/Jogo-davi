import { useEffect, useRef, useState } from 'react';
import { ACERTO_PARA_PASSAR, CORES_SKATE, FASES, RODADAS_POR_JOGO, type Fase } from './data';
import { Davi } from './Davi';
import { INFO_JOGOS, JOGOS } from './games';
import { carregar, estrelasPara, hoje, mesclarPadrao, minutosHoje, progressoInicial, proximaFase, salvar, type Progresso } from './storage';
import { FASE_TREINO, montarTreino, type PassoPlano } from './treino';
import { IconeTeia, Teia } from './Teia';
import { entradaSalva, entrar, enviarSessao, esquecerEntrada, esvaziarFila, servidor, TokenInvalido, type Entrada as DadosEntrada, type ErroEntrada, type ResultadoEntrada } from './sync';
import { nomeItem, registrarAcerto, registrarErro, TIPOS_ITEM } from './srs';

type EstadoNuvem = '...' | 'ok' | 'offline';

type Tela =
  | { nome: 'inicio' }
  | { nome: 'mapa' }
  | { nome: 'sessao'; faseId: string; plano?: PassoPlano[] }
  | { nome: 'resultado'; faseId: string; acertos: number; total: number; corNova?: string; liberou?: string; novaFase?: boolean }
  | { nome: 'garagem' }
  | { nome: 'adulto' };

const ELOGIOS = ['BOA!', 'ISSO AÍ!', 'MANDOU BEM!', 'DEMAIS!', 'ARRASOU!', 'SHOW!'];

export default function App() {
  const [tela, setTela] = useState<Tela>({ nome: 'inicio' });
  const [prog, setProg] = useState<Progresso>(() => carregar());
  const [conta, setConta] = useState<DadosEntrada | null>(() => entradaSalva());
  const numero = conta?.numero ?? null;
  const token = conta?.token ?? null;
  const [nuvem, setNuvem] = useState<EstadoNuvem>('...');
  // Toda mudança feita pelo jogo marca a hora, para saber qual cópia é a mais nova.
  const atualizar = (fn: (p: Progresso) => Progresso) => setProg((p) => ({ ...fn(p), atualizadoEm: Date.now() }));

  useEffect(() => salvar(prog), [prog]);

  // Token recusado pelo servidor (ex.: saiu em outro lugar): volta para a tela de entrada.
  // Só desconecta se o token recusado ainda for o desta conta (pedidos antigos podem chegar atrasados).
  const tokenRecusado = (tok: string) => (e: unknown) => {
    if (!(e instanceof TokenInvalido)) return false;
    if (entradaSalva()?.token !== tok) return true;
    esquecerEntrada();
    setConta((c) => (c?.token === tok ? null : c));
    return true;
  };

  // Ao abrir: busca a cópia do servidor e fica com a mais nova.
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    servidor
      .carregar(token)
      .then((remoto) => {
        if (!vivo) return;
        if (remoto && (remoto.atualizadoEm ?? 0) > (carregar().atualizadoEm ?? 0)) {
          setProg(mesclarPadrao(remoto));
        }
        setNuvem('ok');
      })
      .catch((e) => vivo && !tokenRecusado(token)(e) && setNuvem('offline'));
    esvaziarFila(token).catch(tokenRecusado(token));
    return () => {
      vivo = false;
    };
  }, [token]);

  // Envia para o servidor 1,5 s depois da última mudança.
  useEffect(() => {
    if (!prog.atualizadoEm || !token) return;
    const t = window.setTimeout(() => {
      servidor
        .salvar(token, prog)
        .then(() => setNuvem('ok'))
        .catch((e) => !tokenRecusado(token)(e) && setNuvem('offline'));
    }, 1500);
    return () => window.clearTimeout(t);
  }, [prog, token]);

  if (!numero || !token) {
    return (
      <div className="app">
        <Teia className="teia-canto tl" tamanho={150} />
        <Teia className="teia-canto br" tamanho={150} />
        <Entrada
          onEntrar={async (num, mae, criar) => {
            const r = await entrar(num, mae, criar, prog);
            if (r.ok) {
              const pr = mesclarPadrao(r.progresso);
              setProg(pr);
              salvar(pr);
              setConta(r.entrada);
            }
            return r;
          }}
        />
      </div>
    );
  }
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
          onTreino={() => setTela({ nome: 'sessao', faseId: 'treino', plano: montarTreino(prog) })}
          onVoltar={() => setTela({ nome: 'inicio' })}
          onGaragem={() => setTela({ nome: 'garagem' })}
          onAdulto={() => setTela({ nome: 'adulto' })}
        />
      )}
      {tela.nome === 'sessao' && (
        <Sessao
          key={tela.faseId + prog.sessoes}
          fase={tela.faseId === 'treino' ? FASE_TREINO : FASES.find((f) => f.id === tela.faseId)!}
          plano={tela.plano}
          onTempo={(ms) =>
            atualizar((p) => {
              const dia = hoje();
              const antes = p.tempoHoje?.dia === dia ? p.tempoHoje.ms : 0;
              return { ...p, tempoHoje: { dia, ms: antes + ms } };
            })
          }
          prog={prog}
          corSkate={corSkate}
          onSair={() => setTela({ nome: 'mapa' })}
          onErroItem={(item) => atualizar((p) => ({ ...p, itens: registrarErro(p.itens, item) }))}
          onAcertoItem={(item, erros) =>
            atualizar((p) => ({ ...p, teias: p.teias + 1, itens: registrarAcerto(p.itens, item, erros) }))
          }
          onFim={(acertos, total, errosItens) => {
            const faseId = tela.faseId;
            const taxa = acertos / total;
            const p = prog;
            const antes = p.fases[faseId];
            const ehTreino = faseId === 'treino';
            const prox = ehTreino ? undefined : proximaFase(faseId);
            const passou = taxa >= ACERTO_PARA_PASSAR;
            const liberadas = passou && prox && !p.liberadas.includes(prox) ? [...p.liberadas, prox] : p.liberadas;
            const proxCor = CORES_SKATE.find((c) => !p.coresGanhas.includes(c.id));
            enviarSessao(token, { fase: faseId, acertos, total, erros: errosItens }).catch(tokenRecusado(token));
            atualizar((cur) => ({
              ...cur,
              treinoFeitoEm: ehTreino ? hoje() : cur.treinoFeitoEm,
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
          onDeNovo={() =>
            setTela(
              tela.faseId === 'treino'
                ? { nome: 'sessao', faseId: 'treino', plano: montarTreino(prog) }
                : { nome: 'sessao', faseId: tela.faseId },
            )
          }
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
          token={token}
          numero={numero}
          nuvem={nuvem}
          onTrocarJogador={() => {
            esquecerEntrada(token);
            // o próximo jogador começa do zero neste aparelho (o progresso do jogador anterior está salvo no servidor)
            setProg(progressoInicial());
            salvar(progressoInicial());
            setConta(null);
            setTela({ nome: 'inicio' });
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
  onTreino: () => void;
  onVoltar: () => void;
  onGaragem: () => void;
  onAdulto: () => void;
}) {
  const { prog, onFase } = props;
  const letras = FASES.filter((f) => f.trilha === 'letras');
  const numeros = FASES.filter((f) => f.trilha === 'numeros');
  const contas = FASES.filter((f) => f.trilha === 'contas');
  const familia = FASES.filter((f) => f.trilha === 'familia');
  const minutos = minutosHoje(prog);
  const cansou = prog.limiteMin > 0 && minutos >= prog.limiteMin;
  const treinoFeito = prog.treinoFeitoEm === hoje();
  // Fase atual = a última liberada da trilha de letras
  const atual = [...letras].reverse().find((f) => prog.liberadas.includes(f.id));

  const Predio = ({ f }: { f: Fase }) => {
    const livre = prog.liberadas.includes(f.id);
    const est = prog.fases[f.id]?.estrelas ?? 0;
    return (
      <button className={`predio ${f.trilha} ${livre ? '' : 'trancado'}`} disabled={!livre || cansou} onClick={() => onFase(f.id)}>
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
      {cansou && (
        <div className="descanso">
          <Davi humor="festa" corSkate={props.corSkate} tamanho={110} />
          <div className="balao-hq">HORA DE DESCANSAR!</div>
          <p className="texto-claro">Você jogou {Math.round(minutos)} minutos hoje. Volta amanhã para mais! 🛹</p>
        </div>
      )}
      <button className={`treino-dia ${treinoFeito ? 'feito' : ''}`} onClick={props.onTreino} disabled={cansou}>
        <span className="treino-estrela">{treinoFeito ? '✓' : '★'}</span>
        <span>
          <b>TREINO DO DIA</b>
          <small>{treinoFeito ? 'Feito hoje! Pode treinar de novo.' : '3 jogos com o que você mais precisa'}</small>
        </span>
      </button>
      <h2 className="secao roxo">FAMÍLIA DA SEMANA</h2>
      <div className="cidade">
        {familia.map((f) => (
          <Predio key={f.id} f={f} />
        ))}
      </div>
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
      <h2 className="secao laranja">CONTAS</h2>
      <div className="cidade">
        {contas.map((f) => (
          <Predio key={f.id} f={f} />
        ))}
      </div>
      <h2 className="secao azul">NÚMEROS</h2>
      <div className="cidade">
        {numeros.map((f) => (
          <Predio key={f.id} f={f} />
        ))}
        <div className="predio em-breve">
          <span className="predio-num">5</span>
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
  onFim: (acertos: number, total: number, errosItens: string[]) => void;
  onErroItem: (item: string) => void;
  onAcertoItem: (item: string, erros: number) => void;
  plano?: PassoPlano[];
  onTempo: (ms: number) => void;
}) {
  const { fase } = props;
  const [plano] = useState<PassoPlano[]>(() => props.plano ?? fase.jogos.map((tipo) => ({ fase, tipo })));
  const total = plano.length * RODADAS_POR_JOGO;
  // conta o tempo jogado (para o "volta amanhã")
  const onTempo = useRef(props.onTempo);
  onTempo.current = props.onTempo;
  useEffect(() => {
    const t0 = Date.now();
    return () => onTempo.current(Date.now() - t0);
  }, []);
  const [passo, setPasso] = useState(0); // 0..total-1
  const [acertos, setAcertos] = useState(0);
  const [festa, setFesta] = useState<string | null>(null);
  const [intro, setIntro] = useState(true);
  const [sair, setSair] = useState(false);
  const fim = useRef(false);
  const jogoIdx = Math.floor(passo / RODADAS_POR_JOGO);
  const rodada = passo % RODADAS_POR_JOGO;
  const tipo = plano[jogoIdx].tipo;
  const faseDoJogo = plano[jogoIdx].fase;
  const Jogo = JOGOS[tipo];
  const info = INFO_JOGOS[tipo];
  const errosSessao = useRef<Set<string>>(new Set());

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
          props.onFim(novoAcertos, total, [...errosSessao.current]);
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
            fase={faseDoJogo}
            rodada={rodada}
            itens={props.prog.itens}
            onAcerto={acertou}
            onErro={(item) => {
              errosSessao.current.add(item);
              props.onErroItem(item);
            }}
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

type Sessao = { fase: string; acertos: number; total: number; feita_em: string; erros?: string[] };

function Adulto({
  prog,
  atualizar,
  numero,
  token,
  nuvem,
  onTrocarJogador,
  onVoltar,
}: {
  prog: Progresso;
  atualizar: (fn: (p: Progresso) => Progresso) => void;
  numero: string;
  token: string;
  nuvem: EstadoNuvem;
  onTrocarJogador: () => void;
  onVoltar: () => void;
}) {
  const [conta] = useState(() => ({ a: 3 + Math.floor(Math.random() * 6), b: 3 + Math.floor(Math.random() * 6) }));
  const [resp, setResp] = useState('');
  const [ok, setOk] = useState(false);
  const [confirmarZerar, setConfirmarZerar] = useState(false);
  const [historico, setHistorico] = useState<Sessao[] | null>(null);

  useEffect(() => {
    if (!ok) return;
    servidor
      .historico(token)
      .then(setHistorico)
      .catch(() => setHistorico([]));
  }, [ok, token]);

  const cabecalho = (
    <header className="barra">
      <button className="botao-icone" onClick={onVoltar} aria-label="Voltar">
        ◀
      </button>
      <h2 className="secao">ÁREA DO ADULTO</h2>
    </header>
  );

  if (!ok) {
    return (
      <main className="tela adulto">
        {cabecalho}
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

  // Relatório por tipo de item
  const grupos = Object.keys(TIPOS_ITEM).map((tipo) => {
    const lista = Object.entries(prog.itens).filter(([k]) => k.startsWith(tipo + ':'));
    const dificil = lista
      .filter(([, s]) => s.erros > 0 && s.caixa <= 1)
      .sort((a, b) => b[1].erros - a[1].erros);
    const domina = lista.filter(([, s]) => s.caixa >= 3).sort((a, b) => b[1].acertos - a[1].acertos);
    const vistos = lista.length;
    return { tipo, nome: TIPOS_ITEM[tipo], dificil, domina, vistos };
  });

  const ultimas = (historico ?? []).slice(0, 20).reverse();

  return (
    <main className="tela adulto">
      {cabecalho}

      <section className="painel">
        <h3>Jogador {numero}</h3>
        <p className="nota">
          {nuvem === 'ok'
            ? '✅ Progresso salvo no servidor. Em qualquer celular ou tablet, é só abrir o jogo e digitar o número ' + numero + ' e o primeiro nome da(do) responsável.'
            : nuvem === 'offline'
              ? '⚠️ Sem conexão agora: salvo neste aparelho e enviado quando a internet voltar.'
              : 'Verificando…'}
        </p>
        <button className="botao-medio" onClick={onTrocarJogador}>
          Trocar de jogador
        </button>
      </section>

      <section className="painel">
        <h3>Onde ele precisa de ajuda</h3>
        <p className="nota">
          Itens que ele errou e ainda não acertou de primeira. Eles aparecem mais vezes no jogo, misturados com os outros.
        </p>
        {grupos.every((g) => g.dificil.length === 0) && <p className="nota">Nada por enquanto. 🎉</p>}
        {grupos
          .filter((g) => g.dificil.length > 0)
          .map((g) => (
            <div key={g.tipo} className="relatorio-linha">
              <b>{g.nome}</b>
              <div className="chips">
                {g.dificil.map(([k, s]) => (
                  <span key={k} className="chip dificil">
                    {nomeItem(k)} <small>errou {s.erros}×</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
      </section>

      <section className="painel">
        <h3>O que ele já domina</h3>
        <p className="nota">Acertou de primeira 3 vezes seguidas ou mais. Esses aparecem menos.</p>
        {grupos.every((g) => g.domina.length === 0) && <p className="nota">Ainda nada. Continue jogando!</p>}
        {grupos
          .filter((g) => g.domina.length > 0)
          .map((g) => (
            <div key={g.tipo} className="relatorio-linha">
              <b>{g.nome}</b>
              <div className="chips">
                {g.domina.map(([k]) => (
                  <span key={k} className="chip domina">
                    {nomeItem(k)}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </section>

      <section className="painel">
        <h3>Evolução</h3>
        {historico === null ? (
          <p className="nota">Carregando…</p>
        ) : historico.length === 0 ? (
          <p className="nota">Nenhuma sessão salva no servidor ainda (ou sem internet).</p>
        ) : (
          <>
            <div className="grafico" aria-label="Acerto de primeira nas últimas sessões">
              {ultimas.map((h, i) => {
                const pct = Math.round((h.acertos / h.total) * 100);
                return (
                  <div key={i} className="barra-col" title={`${pct}%`}>
                    <span className="barra-val">{pct}</span>
                    <span className={`barra-fill ${pct >= 80 ? 'boa' : pct >= 50 ? 'media' : 'baixa'}`} style={{ height: `${Math.max(4, pct)}%` }} />
                  </div>
                );
              })}
            </div>
            <p className="nota">Acerto de primeira (%) nas últimas {ultimas.length} sessões, da mais antiga à mais nova.</p>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Fase</th>
                  <th>Acerto</th>
                  <th>Errou</th>
                </tr>
              </thead>
              <tbody>
                {historico.slice(0, 40).map((h, i) => (
                  <tr key={i}>
                    <td>
                      {new Date(h.feita_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{FASES.find((f) => f.id === h.fase)?.titulo ?? h.fase}</td>
                    <td>{Math.round((h.acertos / h.total) * 100)}%</td>
                    <td className="errou">{(h.erros ?? []).map(nomeItem).join(', ') || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="painel">
        <h3>Tempo por dia</h3>
        <p className="nota">
          Hoje: {Math.round(minutosHoje(prog))} min. Ao chegar no limite, o jogo mostra "Hora de descansar! Volta amanhã".
        </p>
        <div className="chips">
          {[10, 20, 30, 0].map((m) => (
            <button
              key={m}
              className={`chip opcao ${prog.limiteMin === m ? 'on' : ''}`}
              onClick={() => atualizar((p) => ({ ...p, limiteMin: m }))}
            >
              {m === 0 ? 'Sem limite' : `${m} min`}
            </button>
          ))}
        </div>
        {prog.limiteMin > 0 && minutosHoje(prog) >= prog.limiteMin && (
          <button className="botao-medio" style={{ marginTop: 10 }} onClick={() => atualizar((p) => ({ ...p, tempoHoje: { dia: hoje(), ms: 0 } }))}>
            Liberar mais um pouco hoje
          </button>
        )}
      </section>

      <section className="painel">
        <h3>Fases</h3>
        <table>
          <thead>
            <tr>
              <th>Fase</th>
              <th>Vezes</th>
              <th>Melhor</th>
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
                          liberadas: e.target.checked ? [...p.liberadas, f.id] : p.liberadas.filter((x) => x !== f.id),
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
        <h3>Como usar</h3>
        <ul className="nota">
          <li>Sessões curtas: uma fase por vez, cerca de 10 minutos, de preferência todo dia.</li>
          <li>No começo, sente junto e leia em voz alta a letra, a sílaba, o nome das figuras e as contas.</li>
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

// ---------------- Entrada com número ----------------

const MSG_ERRO: Record<ErroEntrada, string> = {
  nao_existe: '',
  nome_errado: 'Esse nome não confere com o deste número. Peça ajuda a um adulto.',
  bloqueado: 'Esse número está bloqueado agora. Tente de novo mais tarde ou peça ajuda a um adulto.',
  muitas_tentativas: 'Muitas tentativas agora. Espere alguns minutos e tente de novo.',
  dados_invalidos: 'Digite o primeiro nome da(do) responsável.',
  sem_internet: 'Não consegui conectar. Tente de novo.',
};

function Entrada({
  onEntrar,
}: {
  onEntrar: (num: string, mae: string, criar: boolean) => Promise<ResultadoEntrada>;
}) {
  const [num, setNum] = useState('');
  const [passo, setPasso] = useState<'numero' | 'mae' | 'cadastrar'>('numero');
  const [mae, setMae] = useState('');
  const [estado, setEstado] = useState<'' | 'buscando'>('');
  const [erro, setErro] = useState('');
  const tecla = (d: string) => setNum((n) => (n.length < 4 ? n + d : n));

  const tentar = async (criar: boolean) => {
    if (num.length !== 4 || mae.trim().length < 2) return;
    setEstado('buscando');
    setErro('');
    const r = await onEntrar(num, mae, criar);
    setEstado('');
    if (r.ok) return;
    if (r.erro === 'nao_existe') setPasso('cadastrar');
    else setErro(MSG_ERRO[r.erro]);
  };

  const titulo = (
    <h1 className="titulo">
      <span className="t1">JOGO DO</span>
      <span className="t2 menor">DAVI</span>
    </h1>
  );

  if (passo === 'numero') {
    return (
      <main className="tela entrada">
        {titulo}
        <Davi tamanho={90} />
        <p className="texto-claro">Qual é o seu número?</p>
        <div className="caixas-numero">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i === num.length ? 'ativa' : ''}>
              {num[i] ?? ''}
            </span>
          ))}
        </div>
        <div className="teclado">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="tecla" onClick={() => tecla(d)}>
              {d}
            </button>
          ))}
          <button className="tecla apagar" onClick={() => setNum((n) => n.slice(0, -1))} aria-label="Apagar">
            ⌫
          </button>
          <button className="tecla" onClick={() => tecla('0')}>
            0
          </button>
          <button className="tecla ok" onClick={() => setPasso('mae')} disabled={num.length !== 4} aria-label="Continuar">
            ✓
          </button>
        </div>
        <details className="como-entrar">
          <summary>Primeira vez? Veja como criar seu jogador</summary>
          <ol>
            <li>Escolha um número de 4 dígitos só seu (por exemplo, o dia e o mês do seu aniversário).</li>
            <li>Um adulto digita o primeiro nome da(do) responsável. Ele funciona como a senha do jogador.</li>
            <li>Confirme o cadastro. Nas próximas vezes, em qualquer aparelho, é só usar o mesmo número e o mesmo nome.</li>
          </ol>
        </details>
        <p className="rodape-site">
          <a href="https://javaijafoi.dev" target="_blank" rel="noopener noreferrer">portfólio do Peter</a>
          {' · '}
          <a href="https://github.com/javaijafoi/Jogo-davi" target="_blank" rel="noopener noreferrer">código</a>
        </p>
      </main>
    );
  }

  return (
    <main className="tela entrada">
      {titulo}
      <p className="texto-claro">Número {num}</p>
      {passo === 'mae' ? (
        <p className="texto-claro">Qual é o primeiro nome da(do) responsável?</p>
      ) : (
        <p className="texto-claro">
          O número {num} é novo. Cadastrar com o nome da(do) responsável <b>{mae.trim().toUpperCase()}</b>? Nas próximas vezes, é só
          digitar o mesmo número e o mesmo nome.
        </p>
      )}
      <form
        className="porta"
        onSubmit={(e) => {
          e.preventDefault();
          tentar(passo === 'cadastrar');
        }}
      >
        {passo === 'mae' && (
          <input
            value={mae}
            onChange={(e) => setMae(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={60}
            aria-label="Primeiro nome da(do) responsável"
          />
        )}
        <button className="botao-medio" disabled={estado === 'buscando' || mae.trim().length < 2}>
          {passo === 'mae' ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>
      <button
        className="botao-medio"
        onClick={() => {
          setPasso(passo === 'cadastrar' ? 'mae' : 'numero');
          setErro('');
        }}
      >
        Voltar
      </button>
      {estado === 'buscando' && <p className="nota">Entrando…</p>}
      {erro && <p className="nota">{erro}</p>}
    </main>
  );
}
