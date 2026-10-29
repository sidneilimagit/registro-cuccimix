# Registro Cuccimix

Protótipo de webapp interno para registrar demonstrações/testes de maquinários de cozinha.

**App:** <https://sidneilimagit.github.io/registro-cuccimix/>

Campos: **Data, Cliente, Modelo, Chef, Receita/Evento, Método de Cocção, Tempo**.

- Front-end estático (HTML/CSS/JS, sem build) hospedado no **GitHub Pages**
- Banco de dados e login: **Supabase** (Postgres + Auth, com Row Level Security)
- E-mails de convite e recuperação de senha: **Brevo** (SMTP configurado no Supabase)

## Funcionalidades

- Login por e-mail e senha (apenas usuários convidados)
- Convite e "Esqueci minha senha" com definição de nova senha
- Cadastro, edição e exclusão de registros (cada usuário edita/exclui só os seus)
- Busca em todos os campos, sugestões de preenchimento e exportação CSV (abre no Excel)

## Configuração

### 1. Supabase
1. Crie um projeto em <https://supabase.com/dashboard> (plano Free).
2. **SQL Editor → New query**: cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. **Authentication → Sign In / Providers → Email**: desative **Allow new users to sign up** (app interno, só por convite).
4. **Authentication → URL Configuration**: em **Site URL** coloque a URL do GitHub Pages
   (ex.: `https://sidneilimagit.github.io/registro-cuccimix/`) e adicione a mesma em **Redirect URLs**.
5. **Project Settings → API**: copie **Project URL** e a chave **anon / publishable** para o arquivo [`config.js`](config.js).

### 2. Brevo (e-mails)
1. Em <https://app.brevo.com> → **SMTP & API → SMTP**, gere uma **SMTP key**.
2. Valide um remetente em **Senders, Domains & Dedicated IPs**.
3. No Supabase → **Authentication → Emails → SMTP Settings**, ative **Custom SMTP**:
   - Host: `smtp-relay.brevo.com` · Porta: `587`
   - Usuário: o login SMTP mostrado no Brevo
   - Senha: a SMTP key
   - Sender email: o remetente validado · Sender name: `Registro Cuccimix`

### 3. Usuários
No Supabase → **Authentication → Users → Add user → Send invitation**. O convidado recebe o e-mail
(via Brevo), clica no link e define a senha no próprio app.

### 4. GitHub Pages
**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.

## Segurança
A chave *anon* do Supabase é pública por design. A proteção dos dados é feita pelas políticas RLS
em `supabase/schema.sql`: sem login nada pode ser lido ou gravado.
