<div align="center">

# 🛹 Jogo do Davi

**Um jogo para crianças aprenderem a ler e a contar, brincando e no próprio ritmo.**
Sessões curtas, uma tarefa por tela, erro sem punição e uma dica quando a criança empaca.

[![Jogar agora](https://img.shields.io/badge/%E2%96%B6%20jogar%20agora-jogo--davi.vercel.app-3b82f6?style=for-the-badge)](https://jogo-davi.vercel.app)

![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-progresso-3ecf8e?style=flat-square&logo=supabase&logoColor=white)
![Offline](https://img.shields.io/badge/funciona-sem%20internet-f59e0b?style=flat-square)

</div>

## 🎯 O que tem

- **Leitura** pelo método fônico/silábico: vogais → consoantes → sílabas → palavras.
- **Números** de 5 a 20, com somas e subtrações simples.
- Sessões curtas (10 a 15 rodadas), uma tarefa por tela, erro sem punição e dica depois de 2 erros.
- **Repetição espaçada**: o que a criança erra volta com mais frequência nas próximas sessões.
- Recompensas leves (cores de skate e teias) para manter a motivação.
- **Área do adulto** com o que a criança já domina e onde precisa de ajuda.

## 🔒 Progresso e privacidade

- Para entrar, a criança digita um número de 4 dígitos e um adulto digita o primeiro nome da(do) responsável (cadastrado na primeira vez; não diferencia maiúsculas, minúsculas nem acentos).
- O nome da(do) responsável fica no servidor só como hash (bcrypt) e nunca é guardado no aparelho. O aparelho guarda apenas o número e um token aleatório de sessão.
- Depois de 5 tentativas erradas, o número fica bloqueado por 15 minutos.
- O progresso também fica no próprio aparelho (`localStorage`), então o jogo funciona sem internet.
- As migrações do banco (Supabase) estão em `supabase/migrations/`.

## 🛠️ Rodar

```bash
npm install
npm run dev           # desenvolvimento
npm run build         # build web em dist/
npm run build:single  # um único index.html em dist-single/
```

## 🧱 Tecnologias

React, TypeScript, Vite e Supabase (só para sincronizar o progresso).

---

Feito por [@javaijafoi](https://github.com/javaijafoi) · parte do [portfólio](https://fantasy-portfolio-zeta.vercel.app).
