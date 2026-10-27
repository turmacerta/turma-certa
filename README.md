# Turma Certa

SaaS de gestão de aulas de esporte para professores autônomos e escolas (tênis, vôlei, futebol, personal e afins).

Promessa: **mostrar turma vazia, encaixar o aluno no nível e no horário certos, e cobrar a renovação antes dela morrer no WhatsApp.**

O cliente pagante é a escola ou o autônomo. O aluno usa o produto, mas não é quem assina a Turma Certa.

## Por que isso existe

Hoje a operação vive em planilha, grupo de WhatsApp e cabeça do professor. Isso gera três furos de caixa:

1. **Turma vazia invisível** — vaga ociosa é receita que não entra.
2. **Renovação esquecida** — aluno some no fim do ciclo e ninguém cobra a tempo.
3. **Tempo gasto em remarcação** — falta, reposição e troca de horário viram mensagem infinita.

A Turma Certa ataca esses três. Marketplace para atrair aluno novo fica fora do MVP: primeiro a escola precisa operar e reter o aluno que já tem.

## Personas e dores

| Persona | Dor agora | Trabalho que o produto faz |
| --- | --- | --- |
| Dono da escola / autônomo | Turmas, faltas, reposições, agenda dos professores, pagamentos e renovação | Ver ocupação, gerar agenda, faturar e renovar |
| Aluno | Remarcar, achar horário, mudar/renovar plano, cair no nível certo | Ficha, créditos, matrícula por nível, alerta de vaga |
| Professor | Distribuir alunos em nível/horário/turma e ver a agenda escola <> aluno | Turmas com capacidade, nível e sessão |

## Proposta de valor

Não vendemos “sistema de academia”. Vendemos **ocupação + tempo + renovação**.

- **Ocupação:** número de integrantes por turma, vaga visível, aviso para quem tem crédito.
- **Tempo:** agenda única (turma, professor, aluno), créditos e reposição no lugar do vai-e-vem de mensagem.
- **Renovação:** plano do aluno, fatura e fila de quem vence na semana.

O software se paga se recuperar **um aluno no mês** ou encher **uma vaga** que estava invisível.

O que o MVP **não** otimiza ainda: aquisição de aluno final, marketplace de profissionais, marca branca, app nativo.

## Precificação SaaS (quem nos paga)

Dois planos, alinhados ao tamanho da operação. Valores de entrada, em real, para validar com as primeiras escolas.

| | Autônomo | Escola |
| --- | --- | --- |
| Preço | **R$ 79/mês** | **R$ 189/mês** |
| Quem é | Personal, professor de tênis/vôlei/futebol sozinho | Escola com vários professores |
| Limite | 1 professor, 1 unidade, 40 alunos | Vários professores, unidades e quadras, 250 alunos |
| Produto | Agenda, créditos, ficha, vagas, cobrança | Multi-esporte, níveis, faturamento e renovação |

Anual: 2 meses off (Autônomo R$ 790/ano, Escola R$ 1.890/ano).

**Escola Pro** (depois do MVP): redes/academias, alunos ilimitados, WhatsApp e relatórios — na casa de R$ 349/mês.

Por que não cobrar o aluno: o ciclo de venda fica longo e o dono deixa de ser o campeão interno. Por que não só “por aluno”: no começo complica a conta; depois dá para evoluir para R$ 79 + R$ 2/aluno ativo.

## Planos que a escola vende ao aluno

Isso é catálogo da escola, não da Turma Certa:

- **Plano turmas** — aula em grupo, capacidade, nível, crédito do ciclo.
- **Plano autônomo / particular** — 1:1, capacidade 1, mesmo fluxo de crédito e renovação.

## MVP

Escopo fechado. Se não está aqui, não entra agora.

1. **Ocupação da turma** — capacidade, matrículas ativas, vagas, destaque de turma vazia.
2. **Agenda** — entidades turma, professor e aluno; sessões geradas do horário recorrente; presença e reposição.
3. **Créditos de aula** — saldo por aluno, entrada na adesão/renovação, consumo na aula.
4. **Faturamento e renovação** — planos da escola, assinatura, fatura, fila dos próximos 7 dias.
5. **Unidade e quadra** — espaços por unidade.
6. **Multi-esporte** — esporte por turma e por professor.
7. **Nível** — classe da turma e da ficha do aluno.
8. **Alerta de vaga** — notifica quem pediu vaga **e tem crédito**. No MVP o disparo fica registrado; e-mail/WhatsApp entram depois.
9. **Ficha cadastral** — dados do aluno, contato de emergência, nível.
10. **Plano autônomo e plano turmas** — formato `private` ou `group` na turma e no plano cobrado.

Fora do MVP: pagamento online (Stripe/Asaas/Mercado Pago), WhatsApp, app iOS/Android, portal rico do aluno, relatórios avançados, multi-empresa para redes.

## Arquitetura

```text
turma-certa/
  frontend/     Next.js (App Router) + TypeScript + Tailwind
  backend/      API Node.js + Express + TypeScript
  migrations/   SQL para colar no SQL Editor do Supabase
```

Na raiz, `npm run dev` sobe os dois: web em `http://localhost:3000` e API em `http://localhost:3001`.

O frontend autentica no Supabase. A API valida o JWT e grava no Postgres com a service role, sempre filtrando pela organização do usuário. As policies de RLS existem para ninguém furar o banco pela anon key.

## O que configurar fora do código

### 1. Projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Project Settings → API**: copie `Project URL`, `anon public` e `service_role`.
3. `service_role` só vai no backend. Nunca no frontend e nunca no git.

### 2. Arquivo de ambiente

```bash
cp .env.example .env
```

Preencha URL e as duas chaves. `SUPABASE_URL` pode ser a mesma de `NEXT_PUBLIC_SUPABASE_URL`.

### 3. Auth

Em **Authentication → URL configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

Em **Authentication → Providers → Email**, para desenvolver mais rápido, desligue *Confirm email*. Em produção, deixe ligado.

O cadastro cria um `profile` via trigger em `auth.users`. A primeira vez no app, a pessoa cria a escola (organização) e vira `owner`.

### 4. Migrations

No **SQL Editor**, rode os arquivos de `migrations/` **nessa ordem**:

1. `001_extensions_enums_helpers.sql`
2. `002_organizations_people.sql`
3. `003_units_sports_classes.sql`
4. `004_credits_attendance.sql`
5. `005_billing_vacancies.sql`
6. `006_views_and_rpc.sql`
7. `007_row_level_security.sql`
8. `008_grants.sql`
9. `009_platform_admins.sql`

Rode de novo se precisar: os scripts usam `if not exists` / `create or replace`.

O backoffice `/admin` é para vocês (donos da Turma Certa), não para o dono da academia. Coloque os e-mails em `PLATFORM_ADMIN_EMAILS` no `.env`. No primeiro login, a conta entra na tabela `platform_admins`.

### 5. Ainda não configurar (depois do MVP)

- **Asaas, Mercado Pago ou Stripe** — boleto/Pix da renovação.
- **Resend ou e-mail do Supabase** — aviso de vaga de verdade.
- **WhatsApp Cloud API** — o canal que a escola já usa.
- **Domínio e HTTPS** — Vercel (front) + Render/Fly (API), ou os dois atrás de um único domínio.

## Como rodar

Node 20+.

```bash
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:3001/health](http://localhost:3001/health)

Sem Supabase no `.env`, o site abre e a API sobe. Login, cadastro e o painel `/app` só funcionam depois dos passos acima.

## Mapa do código

Backend por módulo de domínio (`service` = regra, `routes` = HTTP, `schema` = validação Zod):

- `organizations` — escola / autônomo pagante
- `catalog` — unidades, quadras, esportes, níveis
- `students` — ficha e créditos
- `teachers` — professores
- `classes` — turmas, matrícula, vagas, alerta
- `schedule` — sessões e presença
- `billing` — planos, assinatura, fatura, renovação
- `admin` — backoffice da Turma Certa (todas as escolas cliente)

Frontend:

- `/` institucional
- `/login` e `/cadastro`
- `/app` operação da escola (painel, turmas, agenda, alunos, professores, faturamento, espaços)
- `/admin` backoffice da Turma Certa (clientes, plano SaaS, uso)

## Ordem boa para validar o produto

1. Cadastrar 3 escolas conhecidas (um autônomo e duas com mais de um professor).
2. Medir se elas abrem o painel toda semana: turmas com vaga e renovações da semana.
3. Só então falar de pagamento online e WhatsApp.
