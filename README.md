# CRM Progrid+

Sistema de CRM da Bravida, integrado ao mesmo Keycloak e PostgreSQL do WebApólice.

---

## Visão Geral

O CRM Progrid+ é um sistema externo ao WebApólice que compartilha:

- **Keycloak** — mesmo realm `webapolice`, autenticação via JWT Bearer
- **PostgreSQL** — mesmo servidor e banco de dados
  - `seguranca.*` — administrado exclusivamente pelo WebApólice (somente leitura pelo CRM)
  - `crm.*` — schema próprio do CRM, gerenciado por suas próprias migrations

---

## Stack

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Backend    | .NET 10 / ASP.NET Core            |
| Frontend   | React 19 + Vite 8 + TypeScript    |
| Banco      | PostgreSQL (Npgsql + EF Core 10)  |
| Identidade | Keycloak (JWT Bearer OIDC)        |
| ORM        | EF Core (schema `crm`) + Dapper (leitura `seguranca`) |

---

## Estrutura do Repositório

```
CRM/
├── backend/
│   ├── ProgridPlus.Api/          # API ASP.NET Core
│   │   ├── Auth/                 # JWT + Authorization handlers
│   │   ├── Controllers/          # Endpoints REST
│   │   ├── Data/                 # AppDbContext (seguranca) + CrmDbContext (crm)
│   │   └── Seguranca/            # DTOs e serviços de leitura do schema seguranca
│   ├── scripts/
│   │   ├── load-env.ps1          # Carrega e valida o .env.local
│   │   └── run-api-local.ps1     # Inicia a API com as configs carregadas
│   ├── .env.local                # ⛔ PRIVADO — nunca commitar (credenciais reais)
│   ├── .env.example              # ✅ Template público sem senhas
│   └── run-api-local.bat         # Atalho Windows para iniciar a API
├── frontend/
│   ├── .env                      # Variáveis públicas do Vite (sem senhas)
│   └── ...
├── .gitignore
└── README.md
```

---

## Configuração Local

### Backend

As credenciais do banco nunca ficam em arquivos versionados.
O mecanismo usa um arquivo pessoal `backend/.env.local` (já no `.gitignore`).

**1. Crie o arquivo `backend/.env.local`** copiando o template:

```env
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__DefaultConnection=Host=<host>;Port=5432;Database=<database>;Username=<user>;Password=<senha>
```

> Solicite os valores reais à equipe de infraestrutura.
> Exemplo de conexão com o banco de teste: `Host=painel.bravida.com.br;Port=5432;Database=webapolice_teste;Username=bravito;Password=...`

**2. Inicie a API:**

```cmd
# Opção A — clique duplo ou cmd
backend\run-api-local.bat

# Opção B — PowerShell direto
powershell -ExecutionPolicy Bypass -File backend\scripts\run-api-local.ps1
```

O script `load-env.ps1`:
- Lê o `.env.local` e injeta as variáveis no processo
- Se uma chave obrigatória estiver ausente, solicita interativamente (com senha oculta)
- Salva o `.env.local` para os próximos usos
- Bloqueia a inicialização se a connection string não for informada

A API sobe em: **http://localhost:5200**

**Sobre as chaves com `__`:** o .NET mapeia automaticamente `ConnectionStrings__DefaultConnection` para `ConnectionStrings:DefaultConnection` na Configuration API.

---

### Frontend

As variáveis do frontend ficam em `frontend/.env` (sem senhas):

```env
VITE_API_BASE_URL=http://localhost:5200
VITE_KEYCLOAK_URL=https://auth.bravida.com.br
VITE_KEYCLOAK_REALM=webapolice
VITE_KEYCLOAK_CLIENT_ID=webapolice-web
```

Para iniciar:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em: **http://localhost:5174**

O Vite faz proxy de `/api` → `http://localhost:5200`, então é possível chamar a API pelo frontend diretamente.

---

## Autenticação e Autorização

### Fluxo de Login

1. O usuário autentica no **Keycloak** (realm `webapolice`, client `webapolice-web`) via PKCE
2. O frontend recebe o **JWT Bearer** e o envia no header `Authorization: Bearer <token>`
3. A API valida o JWT contra o Keycloak (`/.well-known/openid-configuration`)
4. O `CrmAcessoHandler` consulta o schema `seguranca` para verificar o acesso

### Keycloak

| Configuração   | Valor                                         |
|----------------|-----------------------------------------------|
| URL            | `https://auth.bravida.com.br`                |
| Realm          | `webapolice`                                 |
| Client ID      | `webapolice-web`                             |
| Authority      | `https://auth.bravida.com.br/realms/webapolice` |
| Audiences      | `account`, `webapolice-web`                 |
| Claim de sub   | `sub` (identificador imutável do usuário)   |

### Módulo CRM no WebApólice

O CRM está cadastrado no WebApólice como módulo externo:

| Campo       | Valor         |
|-------------|---------------|
| Módulo      | `CRM`         |
| Recurso     | `CRM`         |
| Permissão   | `crm.acessar` |
| `habilitado`| `false` ¹     |
| `ativo`     | `true`        |

> ¹ `habilitado = false` significa que o módulo não exibe menu no WebApólice. Isso é intencional para módulos externos. A autorização do CRM **não verifica** `modulo.habilitado`.

A permissão `crm.acessar` pode ser atribuída normalmente a perfis pelo WebApólice em **Segurança → Perfis**.

### Regras de Acesso à API

| Situação                              | Resposta |
|---------------------------------------|----------|
| JWT ausente ou inválido               | `401`    |
| Sub não encontrado em `seguranca.usuario` | `403` |
| Usuário com `ativo = false`           | `403`    |
| Perfil ativo com `acesso_total = true`| `200` ✅ |
| Perfil ativo com `crm.acessar`        | `200` ✅ |
| Nenhuma das condições acima           | `403`    |

**Condições para `crm.acessar` ser válida:**
- `perfil.ativo = true`
- `permissao.ativo = true`
- `recurso.ativo = true`
- `modulo.ativo = true`
- `modulo.habilitado` **não** é verificado

### Perfil "Administrador"

O perfil **Administrador** (Sistema) criado pelo WebApólice possui `acesso_total = true`.
Usuários com esse perfil têm acesso ao CRM automaticamente, sem precisar da permissão `crm.acessar`.

Para verificar o perfil de um usuário: **WebApólice → Segurança → Usuários → [usuário] → Perfis Atribuídos**

---

## Implementação da Autorização

A autorização é implementada via **Authorization Policy nativa do ASP.NET** (`IAuthorizationRequirement` + `AuthorizationHandler<T>`), sem depender de roles do Keycloak.

```
JWT Bearer → [Authorize] → CrmAcessoHandler
                                ↓
                  Extrai "sub" do ClaimsPrincipal
                                ↓
               SegurancaConsulta.ConsultarAcessoAsync(sub)
                 (query Dapper → seguranca.usuario + JOINs)
                                ↓
         ┌─────────────────────────────────────────┐
         │ sub não encontrado      → Fail → 403    │
         │ ativo = false           → Fail → 403    │
         │ acesso_total = true     → Succeed → 200 │
         │ crm.acessar presente    → Succeed → 200 │
         │ qualquer outro caso     → Fail → 403    │
         └─────────────────────────────────────────┘
                                ↓
         HttpContext.Items["UsuarioId"]   = acesso.UsuarioId
         HttpContext.Items["UsuarioAcesso"] = acesso
```

Após autorizado, o `UsuarioId` interno (chave primária de `seguranca.usuario`) fica disponível via `HttpContext.Items` para todos os controllers/serviços do CRM sem nova consulta ao banco.

### Restrições de Dados

- O CRM **nunca insere, altera ou exclui** dados em `seguranca.*`
- O CRM não provisiona usuários — o usuário precisa existir em `seguranca.usuario` (criado pelo WebApólice no primeiro login)
- Migrations do CRM são restritas ao schema `crm`

---

## Endpoints

| Método | Rota                  | Auth         | Descrição                        |
|--------|-----------------------|--------------|----------------------------------|
| GET    | `/api/users/profile`  | Obrigatória  | Retorna dados do usuário logado  |

---

## Variáveis de Ambiente — Referência Completa

| Variável                              | Onde               | Descrição                              |
|---------------------------------------|--------------------|----------------------------------------|
| `ConnectionStrings__DefaultConnection`| `backend/.env.local` | Connection string PostgreSQL         |
| `ASPNETCORE_ENVIRONMENT`              | `backend/.env.local` | `Development` ou `Production`        |
| `VITE_API_BASE_URL`                   | `frontend/.env`    | URL base da API                        |
| `VITE_KEYCLOAK_URL`                   | `frontend/.env`    | URL do Keycloak                        |
| `VITE_KEYCLOAK_REALM`                 | `frontend/.env`    | Realm do Keycloak                      |
| `VITE_KEYCLOAK_CLIENT_ID`             | `frontend/.env`    | Client ID do Keycloak                  |

---

## Segurança dos Arquivos de Configuração

| Arquivo                           | Commitado? | Contém senhas? |
|-----------------------------------|------------|----------------|
| `backend/.env.local`              | ⛔ Não     | ✅ Sim          |
| `backend/.env.example`            | ✅ Sim     | ❌ Não (template) |
| `backend/ProgridPlus.Api/appsettings.json` | ✅ Sim | ❌ Não (placeholders) |
| `backend/ProgridPlus.Api/appsettings.Development.json` | ⛔ Não | — |
| `frontend/.env`                   | ⚠️ Revisar | ❌ Não tem senhas, mas tem URLs |