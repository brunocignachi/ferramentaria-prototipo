# API — Sistema de Gerenciamento de Solicitações (Ferramentaria Metalmecânica)

Back-end do TCC de Bruno Cignachi (orientação: Prof. Rogério Xavier de Azambuja),
implementando o MVP descrito no artigo: cadastro e priorização de solicitações,
controle de processos produtivos (torno, fresa, retífica...) e rastreabilidade
de status.

## Stack

- Node.js + Express (API REST)
- PostgreSQL (`pg`, sem ORM — SQL explícito para maior transparência acadêmica)
- Autenticação com JWT + bcrypt 


## Perfis de usuário 

- **administrador**: gerencia usuários, tipos de processo, edita/cancela qualquer solicitação, atribui operadores.
- **solicitante**: cadastra, edita e cancela suas próprias solicitações.
- **operador**: consulta a fila de tarefas do seu processo, inicia e conclui etapas.


## Rodando localmente

Configure o `.env` a partir do `.env.example` e rode `npm install`. Na primeira
vez, crie o banco com `npm run db:migrate` e `npm run db:seed`. Depois, use
`npm run dev`.

## Anexos

Os desenhos técnicos ficam na pasta `uploads/` (ou em `UPLOAD_DIR`), com limite de
20 MB por arquivo, e no banco fica só a referência a eles.

## Backup

Enquanto a API está rodando, ela gera um backup diário do banco em `backups/` (ou
em `BACKUP_DIR`) e mantém os 14 mais recentes. Os arquivos contêm hashes de senha e
não incluem os arquivos de `uploads/`, que precisam ser copiados à parte.

- Backup manual: `npm run db:backup`
- Restauração, que **apaga os dados atuais**:
  `npm run db:restore -- backups/arquivo.json --confirmar`

## Estrutura de pastas

```
ferramentaria-backend/
├── db/
│   ├── schema.sql      # DDL — espelha o DER do artigo 
│   ├── migrate.js       # aplica o schema.sql
│   ├── seed.js           # dados iniciais (admin + tipos de processo)
│   ├── backup.js         # backup manual do banco
│   └── restore.js        # restauração a partir de um backup
└── src/
    ├── config/db.js          # pool de conexão PostgreSQL
    ├── middleware/            # autenticação JWT, autorização por perfil, upload, erros
    ├── controllers/           # regras de negócio de cada recurso
    ├── routes/                # definição das rotas REST
    ├── utils/priority.js      # lógica de ordenação da fila
    ├── utils/backup.js        # geração, restauração e agendamento de backups
    ├── app.js                 # configuração do Express
    └── server.js              # ponto de entrada
```
