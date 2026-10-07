# Decisões de segurança e deploy

## Regras centrais
- RLS está ativo em todas as tabelas públicas.
- anon não recebe acesso a dados sensíveis.
- O browser nunca escolhe teacher_id, student_id, role, estado de publicação ou nota final.
- SUPABASE_SERVICE_ROLE_KEY só é lida em módulos server-side.
- Códigos de estudante são gerados com CSPRNG, têm 12 caracteres de alfabeto sem ambiguidades e são armazenados como hash bcrypt via pgcrypto.
- O código em claro só retorna da função de emissão e deve ser mostrado uma única vez pela interface administrativa.
- Falhas de login são auditadas sem guardar o código.
- Após 5 falhas consecutivas, a conta fica bloqueada por 15 minutos.
- audit_logs tem trigger que impede UPDATE/DELETE.
- Notas tornam identidade estrutural imutável e teacher_id é recalculado por trigger.
- Uploads devem usar bucket privado, validação de magic bytes, limites de tamanho e URLs assinadas.
- Conteúdo CMS deve ser sanitizado no servidor com DOMPurify e vídeos limitados à whitelist.

## Supabase
1. Criar/selecionar o projeto Supabase oficial da escola.
2. Aplicar supabase/migrations/0001_initial.sql e depois supabase/seed.sql num ambiente de teste.
3. Configurar Custom Access Token Hook para claims mínimos.
4. Configurar MFA/TOTP para docentes e administradores.
5. Configurar Storage privado para materials.
6. Não publicar .env nem qualquer secret/service role key.
7. Configurar backups cifrados e testar restauro antes do go-live.

## Deploy
- Definir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SITE_URL.
- Executar npm ci, npm run typecheck, npm test, npm run build e npm run security:deps.
- Verificar o bundle para garantir que a secret não aparece em artefactos client-side.
- Ativar HSTS, CSP, CORS com origem exata do domínio oficial e monitorização.
- Definir retenção/eliminação e plano de resposta a incidentes.
- Confirmar com assessoria jurídica a política de privacidade e consentimento de menores antes de publicação.

## Estado
O projeto Supabase concreto ainda não foi identificado/conectado nesta conversa, portanto a migration foi versionada no GitHub, mas não aplicada a uma instância real. Endereço oficial, contactos, mapas, consentimentos da equipa e matriz curricular final precisam de validação institucional.
