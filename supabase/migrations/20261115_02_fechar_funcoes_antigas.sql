-- Rodar DEPOIS que a versão nova do jogo estiver publicada na Vercel.
-- Fecha as funções antigas, que aceitavam só o número (sem o nome da mãe).
revoke execute on function
  public.jogo_davi_carregar(text),
  public.jogo_davi_historico(text),
  public.jogo_davi_historico2(text),
  public.jogo_davi_migrar(text, text),
  public.jogo_davi_registrar_sessao(text, text, int, int),
  public.jogo_davi_registrar_sessao2(text, text, int, int, jsonb),
  public.jogo_davi_salvar(text, jsonb)
from public, anon, authenticated;
