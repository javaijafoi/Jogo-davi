# Jogo do Davi

Jogo web que ajuda crianças a aprender a ler e a contar brincando, no seu próprio ritmo.
A trilha de leitura segue o método fônico/silábico (vogais → consoantes → sílabas → palavras),
e a trilha de números vai de 5 a 20, com somas e subtrações simples.

- Sessões curtas (10 a 15 rodadas), uma tarefa por tela, erro sem punição e dica depois de 2 erros.
- Itens errados voltam com mais frequência nas próximas sessões (repetição espaçada).
- Recompensas leves (cores de skate e teias) para manter a motivação.
- Área do adulto com o que a criança já domina e onde precisa de ajuda.

## Progresso e privacidade

- Para entrar, a criança digita um número de 4 dígitos e um adulto digita o primeiro nome da(do) responsável
  (cadastrado na primeira vez; não diferencia maiúsculas, minúsculas nem acentos).
- O nome da(do) responsável fica no servidor só como hash (bcrypt) e nunca é guardado no aparelho. O aparelho guarda
  apenas o número e um token aleatório de sessão.
- Depois de 5 tentativas erradas, o número fica bloqueado por 15 minutos.
- O progresso também fica no próprio aparelho (localStorage), então o jogo funciona sem internet.
- As migrações do banco (Supabase) estão em `supabase/migrations/`.

## Rodar

```
npm install
npm run dev          # desenvolvimento
npm run build        # build web em dist/
npm run build:single # um único index.html em dist-single/
```
