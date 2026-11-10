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
do back-end. O seed cria o administrador `admin@ferramentaria.local` com a senha inicial
definida em `ferramentaria-backend/db/seed.js`. Troque essa senha no primeiro acesso,
em Configurações, antes de usar o sistema em qualquer outro ambiente.

## Abrir pelo celular

O celular precisa estar na mesma rede Wi-Fi do computador.

1. Rode o back-end normalmente (`npm run dev`).
2. No front-end, rode `npm run dev:celular` em vez de `npm run dev`.
3. O terminal mostra um endereço `Network`, como `http://182.158.0.10:5173`.
   Abra esse endereço no navegador do celular.

Na primeira vez, o Windows pode perguntar se o Node.js pode usar a rede: permita
em redes privadas. O site procura a API no mesmo computador que o serviu, então
não é preciso mudar o `.env`.

## Publicar no Render

O arquivo `render.yaml` descreve um único serviço: o servidor da API também entrega
o site compilado, então tudo fica no mesmo endereço.

1. No Render, escolha **New → Blueprint** e selecione este repositório.
2. Preencha `DATABASE_URL` com a connection string do banco (ex.: Neon).
   O `JWT_SECRET` é gerado pelo próprio Render.
3. Aguarde o deploy e abra o endereço `https://<nome-do-serviço>.onrender.com`.

No plano gratuito, o serviço dorme após 15 minutos sem uso (o primeiro acesso depois
disso leva cerca de um minuto), e os arquivos gravados no servidor, como anexos e
backups, são apagados a cada reinício ou novo deploy. Os dados do banco não são afetados.
