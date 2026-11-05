# Front-end — Sistema de Gerenciamento de Solicitações (Ferramentaria Metalmecânica)

Front-end do TCC de Bruno Cignachi (orientação: Prof. Rogério Xavier de Azambuja).
Reproduz as 3 telas do protótipo (Figma — seção 7.1.6 do artigo) já conectadas
à API real do `ferramentaria-backend`.

## Stack

- React 19 + Vite
- React Router (rotas protegidas por autenticação/perfil)
- CSS puro (sem framework de UI), para reproduzir fielmente o visual do protótipo
- Sem TypeScript, para manter o mesmo estilo simples do back-end em JS puro

## Telas implementadas

| Tela | Rota | Acesso | Protótipo |
|---|---|---|---|
| Login | `/login` | Público | Figura 2 |
| Dashboard | `/` | Qualquer usuário autenticado | Figura 3 |
| Cadastrar usuário | `/usuarios/novo` | Apenas perfil `administrador` | Figura 1 (repaginada) |

**Nota sobre a tela de cadastro:** no protótipo original, a Figura 1 é um
auto-cadastro público ("Registrar"). O backend, porém, só permite criação de
usuários por um administrador autenticado (`POST /usuarios` exige
`perfil = administrador` — ver `usuarioRoutes.js`). Por decisão de produto,
essa tela foi mantida com o mesmo layout, mas reaproveitada como "Cadastrar
usuário", acessível apenas a admins logados, sem expor auto-registro.

## Rodando localmente

1. Suba o back-end primeiro (`ferramentaria-backend`, porta `3000` por padrão).
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure a URL da API (já vem com um `.env` padrão apontando para
   `http://localhost:3000/api`):
   ```
   cp .env.example .env
   ```
4. Rode o servidor de desenvolvimento:
   ```
   npm run dev
   ```

## Estrutura de pastas

```
ferramentaria-frontend/
└── src/
    ├── api/client.js            # wrapper de fetch + injeção do token JWT
    ├── context/AuthContext.jsx  # sessão (login/logout), localStorage/sessionStorage
    ├── components/
    │   ├── ProtectedRoute.jsx   # bloqueia rota por autenticação/perfil
    │   ├── Sidebar.jsx          # navegação lateral (Figura 3)
    │   ├── ProgressRing.jsx     # anéis de progresso do card "Situação Atual"
    │   ├── NovaSolicitacaoForm.jsx
    │   └── Illustrations.jsx    # ilustrações SVG originais (telas de auth)
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── DashboardPage.jsx
    │   └── CadastrarUsuarioPage.jsx
    └── styles/AuthLayout.css    # layout compartilhado por Login e Cadastro
```

## O que falta para fechar o escopo do artigo

Funcionalidades previstas no artigo (RF03 anexos, RF09 relatórios, RF08/UC14
consulta de histórico, UC09/UC12 fila por processo) ainda não têm endpoint no
back-end, então não foram implementadas no front — ficaram como itens
desativados ("Em breve") na barra lateral até existir API correspondente.
