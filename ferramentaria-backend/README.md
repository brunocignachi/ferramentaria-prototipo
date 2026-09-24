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


## Estrutura de pastas

```
ferramentaria-backend/
├── db/
│   ├── schema.sql      # DDL — espelha o DER do artigo 
│   ├── migrate.js       # aplica o schema.sql
│   └── seed.js           # dados iniciais (admin + tipos de processo)
└── src/
    ├── config/db.js          # pool de conexão PostgreSQL
    ├── middleware/            # autenticação JWT, autorização por perfil, erros
    ├── controllers/           # regras de negócio de cada recurso
    ├── routes/                # definição das rotas REST
    ├── utils/priority.js      # lógica de ordenação da fila
    ├── app.js                 # configuração do Express
    └── server.js              # ponto de entrada
```
