-- Entrada com número de 4 dígitos + primeiro nome da mãe.
-- O nome é guardado só como hash (bcrypt) e a comparação ignora maiúsculas/minúsculas.
-- Depois de entrar, o aparelho recebe um token aleatório; o nome da mãe nunca fica salvo no aparelho.

create table if not exists public.jogo_davi_contas (
  numero      text primary key check (numero ~ '^[0-9]{4}$'),
  mae_hash    text not null,
  falhas      int not null default 0,
  bloqueado_ate timestamptz,
  criado_em   timestamptz not null default now()
);

create table if not exists public.jogo_davi_tokens (
  token_hash  text primary key,
  numero      text not null references public.jogo_davi_contas(numero) on delete cascade,
  criado_em   timestamptz not null default now(),
  usado_em    timestamptz not null default now()
);

create table if not exists public.jogo_davi_tentativas (
  id bigserial primary key,
  em timestamptz not null default now()
);

alter table public.jogo_davi_contas enable row level security;
alter table public.jogo_davi_tokens enable row level security;
alter table public.jogo_davi_tentativas enable row level security;
revoke all on public.jogo_davi_contas, public.jogo_davi_tokens, public.jogo_davi_tentativas from anon, authenticated;

create or replace function public.jogo_davi_normalizar_mae(p text) returns text
language sql immutable set search_path = '' as $$
  select lower(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')))
$$;

-- Devolve o número dono do token (ou null) e marca o uso.
create or replace function public.jogo_davi_numero_do_token(p_token text) returns text
language sql security definer set search_path = public, extensions as $$
  update jogo_davi_tokens set usado_em = now()
   where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  returning numero
$$;

-- p_criar = false: só entra se o número já existe (resposta 'nao_existe' se não existir).
-- p_criar = true: cadastra o número com o nome da mãe se ele ainda não existe.
-- p_codigo_antigo: código aleatório da versão antiga do jogo, para trazer o histórico junto.
create or replace function public.jogo_davi_entrar(p_numero text, p_mae text, p_criar boolean default false, p_codigo_antigo text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  c jogo_davi_contas;
  mae text := jogo_davi_normalizar_mae(p_mae);
  tok text;
  cod text := 'JOGADOR-' || p_numero;
begin
  if p_numero !~ '^[0-9]{4}$' or char_length(mae) < 2 or char_length(mae) > 60 then
    return jsonb_build_object('erro', 'dados_invalidos');
  end if;
  -- freio geral contra quem tenta adivinhar vários números
  if (select count(*) from jogo_davi_tentativas where em > now() - interval '10 minutes') >= 60 then
    return jsonb_build_object('erro', 'muitas_tentativas');
  end if;

  select * into c from jogo_davi_contas where numero = p_numero for update;
  if c.numero is null then
    if not p_criar then
      return jsonb_build_object('erro', 'nao_existe');
    end if;
    insert into jogo_davi_contas (numero, mae_hash) values (p_numero, crypt(mae, gen_salt('bf', 8)))
    returning * into c;
  else
    if c.bloqueado_ate is not null and c.bloqueado_ate > now() then
      return jsonb_build_object('erro', 'bloqueado');
    end if;
    if crypt(mae, c.mae_hash) <> c.mae_hash then
      insert into jogo_davi_tentativas default values;
      delete from jogo_davi_tentativas where em < now() - interval '1 day';
      update jogo_davi_contas set
        falhas = case when falhas + 1 >= 5 then 0 else falhas + 1 end,
        bloqueado_ate = case when falhas + 1 >= 5 then now() + interval '15 minutes' else bloqueado_ate end
      where numero = p_numero;
      return jsonb_build_object('erro', 'nome_errado');
    end if;
    update jogo_davi_contas set falhas = 0, bloqueado_ate = null where numero = p_numero;
  end if;

  if p_codigo_antigo is not null and p_codigo_antigo !~ '^JOGADOR-' and char_length(p_codigo_antigo) >= 10 then
    update jogo_davi_sessoes set codigo = cod where codigo = p_codigo_antigo;
  end if;

  tok := encode(gen_random_bytes(32), 'hex');
  insert into jogo_davi_tokens (token_hash, numero) values (encode(digest(tok, 'sha256'), 'hex'), p_numero);
  return jsonb_build_object(
    'token', tok,
    'novo', p_criar and not exists (select 1 from jogo_davi_progresso where codigo = cod),
    'dados', (select dados from jogo_davi_progresso where codigo = cod)
  );
end $$;

create or replace function public.jogo_davi_sair(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from jogo_davi_tokens where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function public.jogo_davi_carregar3(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n text := jogo_davi_numero_do_token(p_token);
begin
  if n is null then raise exception 'token_invalido' using errcode = '28000'; end if;
  return (select dados from jogo_davi_progresso where codigo = 'JOGADOR-' || n);
end $$;

create or replace function public.jogo_davi_salvar3(p_token text, p_dados jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare n text := jogo_davi_numero_do_token(p_token); t timestamptz := now();
begin
  if n is null then raise exception 'token_invalido' using errcode = '28000'; end if;
  if pg_column_size(p_dados) > 100000 then raise exception 'dados invalidos'; end if;
  insert into jogo_davi_progresso (codigo, dados, atualizado_em) values ('JOGADOR-' || n, p_dados, t)
  on conflict (codigo) do update set dados = excluded.dados, atualizado_em = excluded.atualizado_em;
  return t;
end $$;

create or replace function public.jogo_davi_registrar_sessao3(p_token text, p_fase text, p_acertos int, p_total int, p_erros jsonb default '[]'::jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare n text := jogo_davi_numero_do_token(p_token);
begin
  if n is null then raise exception 'token_invalido' using errcode = '28000'; end if;
  insert into jogo_davi_sessoes (codigo, fase, acertos, total, erros)
  values ('JOGADOR-' || n, left(p_fase, 40), p_acertos, p_total,
          case when jsonb_typeof(p_erros) = 'array' and pg_column_size(p_erros) < 10000 then p_erros else '[]'::jsonb end);
end $$;

create or replace function public.jogo_davi_historico3(p_token text)
returns table(fase text, acertos int, total int, feita_em timestamptz, erros jsonb)
language plpgsql security definer set search_path = public as $$
declare n text := jogo_davi_numero_do_token(p_token);
begin
  if n is null then raise exception 'token_invalido' using errcode = '28000'; end if;
  return query select s.fase, s.acertos, s.total, s.feita_em, s.erros from jogo_davi_sessoes s
    where s.codigo = 'JOGADOR-' || n order by s.feita_em desc limit 300;
end $$;

-- Só as funções do jogo ficam abertas; as auxiliares não.
revoke execute on function public.jogo_davi_numero_do_token(text) from public, anon, authenticated;
revoke execute on function public.jogo_davi_normalizar_mae(text) from public, anon, authenticated;
grant execute on function
  public.jogo_davi_entrar(text, text, boolean, text),
  public.jogo_davi_sair(text),
  public.jogo_davi_carregar3(text),
  public.jogo_davi_salvar3(text, jsonb),
  public.jogo_davi_registrar_sessao3(text, text, int, int, jsonb),
  public.jogo_davi_historico3(text)
to anon;
