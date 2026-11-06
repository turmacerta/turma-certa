# Turma Certa

Class management SaaS for sports schools and independent coaches. Product requirements, technical spec, personas and the prototype live in the `turma-certa-docs` repo.

## Stack

```text
turma-certa/
  frontend/     Next.js (App Router), TypeScript, Tailwind
  backend/      Node.js, Express, TypeScript, Zod
  migrations/   SQL for the Supabase SQL Editor
```

The frontend authenticates with Supabase. The API validates the JWT, resolves the user's role and permissions in the organization, and writes to Postgres with the service role, always scoped to the organization.

## Setup

Node 20+.

1. Create a Supabase project. Copy `Project URL`, `anon` and `service_role` from Project Settings, API. The service role key is backend only.
2. `cp .env.example .env` and fill in the keys. Put platform staff emails in `PLATFORM_ADMIN_EMAILS`.
3. Authentication, URL configuration: site URL `http://localhost:3000`, redirect URL `http://localhost:3000/auth/callback`.
4. Run every file in `migrations/` in order in the SQL Editor. Scripts are idempotent.

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- API health: http://localhost:3001/health

Demo data for the organization named in `backend/src/scripts/seed-demo.ts`:

```bash
npm run seed:demo -w @turma-certa/backend -- --reset
```

## Access model

- A person has one account and can be a member of many organizations.
- Each membership has a role. Roles belong to the organization and carry a tag (`manager`, `teacher`, `student`).
- Effective permissions are the role permissions limited by the tag ceiling (`backend/src/shared/permissions.ts`). The owner has every permission.
- Every route checks permissions with `requireOrgMember` and `requirePermission`. Scoped lists (own schedule, own classes, own students) use `scopedTeacher`.
- Platform staff can open any organization and send `x-act-as` to test with real customer permissions.

## Pricing

Monthly fee = base + price per member with a paid tag during the month. Students are free. Values live in `backend/src/shared/pricing.ts` and `frontend/src/lib/plans.ts`.

## Backend modules

| Module | Responsibility |
| --- | --- |
| `organizations` | School data, lesson rules, monthly estimate, notifications feed |
| `catalog` | Units, spaces, sports, levels |
| `students` | Profiles, guardians, credits, photos, app access |
| `teachers` | Teachers, sports, photos |
| `classes` | Classes, edit and archive, package-checked enrollment, vacancies |
| `schedule` | Sessions, lesson roster, cancel and restore |
| `billing` | Plans, subscriptions, invoices, reminders |
| `team` | Roles, members, invites |
| `portal` | Student and guardian area |
| `notifications` | Message composition and delivery |
| `me` | Current user, cross-school schedule, network |
| `admin` | Platform backoffice |
| `leads` | Landing contact form: stores the lead and emails `LEADS_EMAIL` |

## Integration points

- Notification delivery: `backend/src/infrastructure/notifications/channels.ts`. Email, WhatsApp and push are mocked and only log.
- Invites: Supabase `auth.admin.inviteUserByEmail`. Configure custom SMTP for production.
- Photos: Supabase Storage bucket `photos`, created by migration 011.
- Landing leads: table `leads` (migration 012) and an email to `LEADS_EMAIL` through the email channel.
