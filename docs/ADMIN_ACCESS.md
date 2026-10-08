# Acesso administrativo

O painel administrativo está em /admin e usa Supabase Auth com e-mail + palavra-passe e TOTP MFA obrigatório.

## Criar o primeiro administrador

A aplicação não cria uma conta administrativa com credenciais fixas.

1. No Supabase Dashboard, abra Authentication → Users.
2. Crie o utilizador administrativo com o e-mail institucional e uma palavra-passe forte.
3. Copie o UUID do utilizador.
4. No SQL Editor do Supabase, execute:

    insert into public.user_profiles (id, role, is_active, display_name)
    values ('UUID_DO_UTILIZADOR', 'admin', true, 'Administrador');

5. Configure a política de palavras-passe do Supabase para pelo menos 12 caracteres, com maiúsculas, minúsculas, números e símbolos.
6. Configure a Redirect URL do Supabase Auth para o endereço HTTPS de /admin/redefinir.

Depois, abra /admin/login. O primeiro login cria o fluxo de configuração TOTP. O QR Code pode ser usado no Google Authenticator, Microsoft Authenticator ou outro autenticador compatível.

## Fluxo de segurança

- Sessão Supabase usa cookies SSR.
- Admin e professor precisam de AAL2/TOTP para páginas e APIs protegidas.
- A camada RLS também exige AAL2 para os papéis privilegiados.
- A service role key permanece apenas no servidor.
- Login usa resposta genérica para reduzir enumeração.
- Recuperação de palavra-passe também usa resposta genérica.
- O painel oferece saída explícita da sessão.

## Configuração Supabase necessária

- Email/password habilitado.
- MFA TOTP habilitado.
- MFA verification habilitada.
- Redirect URL HTTPS configurada para /admin/redefinir.
- Política de palavra-passe forte e proteção contra credenciais comprometidas, quando disponível.

A aplicação já contém o código de login, recuperação de palavra-passe, desafio TOTP e enforcement AAL2. A criação do primeiro utilizador administrativo continua deliberadamente fora do código-fonte para não introduzir credenciais hardcoded.
