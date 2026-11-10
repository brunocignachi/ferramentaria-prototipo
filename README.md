# Sistema de Gerenciamento de Solicitações — Ferramentaria Metalmecânica

Protótipo do TCC de Bruno Cignachi (IFRS Campus Farroupilha).

| Pasta | Conteúdo | Tecnologias |
|---|---|---|
| [`ferramentaria-backend/`](ferramentaria-backend/README.md) | API REST | Node.js, Express, PostgreSQL |
| [`ferramentaria-frontend/`](ferramentaria-frontend/README.md) | Interface web | React, Vite |

## Como rodar

Em dois terminais, com o `.env` de cada pasta configurado a partir do `.env.example`:

```
cd ferramentaria-backend
npm install
npm run dev
```

```
cd ferramentaria-frontend
npm install
npm run dev
```

Na primeira vez, crie o banco com `npm run db:migrate` e `npm run db:seed` na pasta
do back-end. O seed cria o administrador `admin@ferramentaria.local` com a senha
`admin123`, que serve apenas para desenvolvimento e deve ser trocada em qualquer
outro ambiente.

## Abrir pelo celular

O celular precisa estar na mesma rede Wi-Fi do computador.

1. Rode o back-end normalmente (`npm run dev`).
2. No front-end, rode `npm run dev:celular` em vez de `npm run dev`.
3. O terminal mostra um endereço `Network`, como `http://192.168.0.10:5173`.
   Abra esse endereço no navegador do celular.

Na primeira vez, o Windows pode perguntar se o Node.js pode usar a rede: permita
em redes privadas. O site procura a API no mesmo computador que o serviu, então
não é preciso mudar o `.env`.
