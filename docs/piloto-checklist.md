# Checklist do piloto (1 escola)

## 0. Pré-voo

- [x] Rodar migration `014` no Supabase
- [x] Testar: login no aparelho A → login no B → A cai com `SESSION_REPLACED` / mensagem de outro aparelho
- [x] Confirmar SMTP do Supabase Auth
  - Confirmado (06/11/2026): **sem SMTP custom** — Auth → Emails mostra “Set up custom SMTP…”. Usa o remetente padrão do Supabase (ok no piloto; limite de envio no free). Configurar SMTP próprio entra no item 1 (e-mail real), junto com o provedor das notificações do app.

## 1. E-mail real _(adiado — domínio na semana que vem)_

- [x] Escolher provedor: **Resend**
- [ ] Comprar/verificar domínio (Registro.br `.com.br`) — com o primo, semana que vem
- [ ] Verificar domínio no Resend + SMTP no Supabase Auth
- [ ] Trocar o mock de e-mail em `channels.ts` por envio real
- [ ] Validar: lead da landing chega no e-mail da equipe
- [ ] Validar: cancelamento de aula notifica aluno/responsável
- [ ] Validar: lembrete de fatura atrasada (mesmo que ainda seja disparo manual)

## 2. Agenda automática

- [x] Janela rolante de **14 dias** em `America/Sao_Paulo` (API no create/update + SQL `maintain_schedule_horizon`)
- [x] Cron diário no **Supabase pg_cron** à meia-noite BRT (`migrations/015_schedule_horizon_cron.sql`, job `0 3 * * *` UTC)
- [x] Remover geração manual (UI + `POST .../schedule/generate`) e o timer Node
- [x] Reposição do portal limitada à janela de 14 dias (crédito continua com validade própria ~30 dias)
- [x] Rodar migration `015` no Supabase (pg_cron + job `maintain-schedule-horizon` ativo `0 3 * * *`)
- [x] Validar automatizado (06/11): RPC horizonte ok, 0 sessões ativas além da janela, 61 dentro, rota generate ausente no front, typecheck ok
- [x] Validar na UI: criar turma nova → só 14 dias; sem botão “Gerar aulas”
- [x] Conferir fuso na UI (aula das 19h aparece como 19h BRT)

## 3. Billing manual (piloto)

- [ ] Fluxo documentado para a escola: vender pacote → fatura → marcar pago
- [ ] Validar renovação manual
- [ ] **Não** implementar gateway ainda

## 4. Bug do admin

- [x] Corrigir rota `/api/v1/admin/organizations/:id/pricing`
- [x] Validar endpoint (200 + `total_cents`; gaveta do `/admin` passa a carregar)

## 5. Escopo consciente (fora do piloto)

- [x] Presença: **fora**
- [x] Fundir turmas: **fora**
- [x] Waitlist: **manual**
- [x] WhatsApp / push: **fora**
- [x] Pagamento automático: **fora**

## 6. Aceite do piloto

- [ ] Criar 1 escola real (ou seed + conta real)
- [ ] Convidar 1 professor + 1 aluno/responsável
- [ ] Rodar 1 semana: matrícula, aula, cancelamento, reposição, fatura
- [ ] Anotar o que doeu na operação

---

**Definição de pronto:** escola opera sozinha por 1 semana sem vocês gerarem sessão na mão nem perderem lead/aviso por e-mail mock.

**Próximo passo de implementação:** (3) billing manual documentado / aceite do piloto → (depois do domínio) e-mail real com Resend.
