# Sistema de Gerenciamento de Solicitações — Ferramentaria Metalmecânica

Protótipo do TCC de Bruno Cignachi (IFRS Campus Farroupilha, orientação: Prof.
Rogério Xavier de Azambuja).

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
