# Escola Comunitária Jossyquina — Plataforma EdTech

Plataforma integrada para site institucional, portal do estudante, painel docente e administração.

Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Zod e Vitest.

## Estrutura
- src/app: páginas públicas, portais e APIs
- src/lib: Supabase, autenticação, validação e sanitização
- supabase/migrations: schema, RLS, triggers e funções
- tests: testes de aceitação de segurança
- docs/SECURITY.md: decisões e deploy

## Imagens principais
- /assets/logo.webp — logotipo oficial
- /assets/matriculas.webp — cartaz oficial de matrículas

## Arranque
1. Copiar .env.example para .env.local.
2. Configurar um projeto Supabase dedicado.
3. Aplicar a migration num ambiente de teste.
4. npm ci
5. npm run typecheck
6. npm test
7. npm run build

Não coloque chaves secretas no cliente. O projeto não deve ser considerado pronto para produção até a suite de segurança, revisão jurídica, MFA, backups e configuração Supabase terem sido validadas.
