# Checklist app mobile (Expo)

Escopo: gestor, professor, aluno/responsável. Sem backoffice `/admin`.

## Fase 0 — Fundação

- [x] App Expo no monorepo (`mobile/`)
- [x] Workspaces + packages `tokens` / `api` / `types`
- [x] Env `EXPO_PUBLIC_*`
- [x] Auth gate + stacks de navegação
- [x] Este checklist

## Fase 1 — Auth e onboarding

- [x] Login
- [x] Signup
- [x] Verify email
- [x] Forgot / reset password
- [x] 2FA challenge
- [x] Claim `POST /me/session`
- [x] `GET /me` → persona → home
- [x] Onboarding dono (criar escola)
- [x] Onboarding membro (aguardando convite)
- [x] Sign out

## Fase 2 — Dia a dia

- [x] Agenda staff (14 dias)
- [x] Detalhe aula + cancelar/restaurar
- [x] Portal aluno home
- [x] Portal aulas (cancelar/restaurar)
- [x] Portal reposição
- [x] Conta básica (perfil + sair)

## Fase 3 — Operação

- [x] Turmas lista/detalhe
- [x] Matrícula / venda com pacote
- [x] Alunos (+ responsáveis)
- [x] Professores (school)
- [x] Pacotes
- [x] Billing (assinar, pagar, renovar)

## Fase 4 — Configuração

- [x] Settings (unidades, esportes, níveis, regras)
- [x] Equipe (papéis, convites)
- [x] Seletor / rede de escolas
- [x] Conta completa (2FA enroll, avatar)

## Fase 5 — Polimento

- [x] Tema claro/escuro + brand
- [x] Deep links Auth
- [x] i18n PT/EN
- [x] Build preview Expo
