-- Ajustes da revisão:
-- 1) O limite de tentativas erradas passa a ser por IP (antes era um só para todo mundo,
--    então alguém errando de propósito travava o login de todos).
-- 2) Um número que já tem progresso salvo da versão antiga, mas ainda não tem nome da mãe,
--    não pode mais ser "cadastrado" por qualquer um.

alter table public.jogo_davi_tentativas add column if not exists ip text not null default '';
create index if not exists jogo_davi_tentativas_ip_em on public.jogo_davi_tentativas (ip, em);

create or replace function public.jogo_davi_ip() returns text
language sql stable set search_path = '' as $$
  select coalesce(
    split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1),
    ''
  )
$$;
revoke execute on function public.jogo_davi_ip() from public, anon, authenticated;

create or replace function public.jogo_davi_entrar(p_numero text, p_mae text, p_criar boolean default false, p_codigo_antigo text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  c jogo_davi_contas;
  mae text := jogo_davi_normalizar_mae(p_mae);
  tok text;
  cod text := 'JOGADOR-' || p_numero;
  ip text := jogo_davi_ip();
begin
  if p_numero !~ '^[0-9]{4}$' or char_length(mae) < 2 or char_length(mae) > 60 then
    return jsonb_build_object('erro', 'dados_invalidos');
  end if;
  if (select count(*) from jogo_davi_tentativas t where t.ip = jogo_davi_entrar.ip and t.em > now() - interval '10 minutes') >= 20 then
    return jsonb_build_object('erro', 'muitas_tentativas');
  end if;

  select * into c from jogo_davi_contas where numero = p_numero for update;
  if c.numero is null then
    if not p_criar then
      return jsonb_build_object('erro', 'nao_existe');
    end if;
    -- progresso antigo sem dono: não deixa qualquer um assumir
    if exists (select 1 from jogo_davi_progresso where codigo = cod) then
      return jsonb_build_object('erro', 'bloqueado');
    end if;
    insert into jogo_davi_contas (numero, mae_hash) values (p_numero, crypt(mae, gen_salt('bf', 8)))
    returning * into c;
  else
    if c.bloqueado_ate is not null and c.bloqueado_ate > now() then
      return jsonb_build_object('erro', 'bloqueado');
    end if;
    if crypt(mae, c.mae_hash) <> c.mae_hash then
      insert into jogo_davi_tentativas (ip) values (ip);
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
