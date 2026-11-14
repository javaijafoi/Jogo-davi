# Jogo do Davi

Jogo web de alfabetização (método fônico/silábico) para uma criança de 7 anos com TDAH.
Vogais → consoantes → sílabas simples → palavras de 2 sílabas, e uma trilha de números (até 5, 10, 20).

- Sessões curtas (10 a 15 rodadas), uma tarefa por tela, erro sem punição e dica depois de 2 erros.
- Itens errados voltam com mais frequência nas próximas sessões.
- Progresso salvo no próprio aparelho (localStorage).
- Esta versão não tem som. O áudio entra numa próxima entrega, e o APK vem depois (Capacitor).

## Rodar

```
npm install
npm run dev          # desenvolvimento
npm run build        # build web em dist/
npm run build:single # um único index.html em dist-single/
```
