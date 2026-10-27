import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import type { z } from "zod";
import type { billingPlanSchema, subscriptionSchema } from "./billing.schema";

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

export class BillingService {
  async summary(orgId: string) {
    const invoices = unwrap(
      await getAdminClient()
        .from("invoices")
        .select("id, amount_cents, status, due_date, student:students(id, full_name)")
        .eq("organization_id", orgId)
        .order("due_date", { ascending: false })
        .limit(50),
    );

    const subscriptions = unwrap(
      await getAdminClient()
        .from("student_subscriptions")
        .select(
          "*, billing_plan:billing_plans!inner(id, name, price_cents, organization_id), student:students(id, full_name)",
        )
        .eq("billing_plan.organization_id", orgId)
        .order("current_period_end"),
    );

    const today = new Date().toISOString().slice(0, 10);
    const inSevenDays = addDays(new Date(), 7);

    const renewals = (subscriptions ?? []).filter(
      (item) =>
        item.status === "active" &&
        item.current_period_end >= today &&
        item.current_period_end <= inSevenDays,
    );

    const openInvoices = (invoices ?? []).filter((item) =>
      ["pending", "overdue"].includes(item.status as string),
    );

    return {
      invoices: invoices ?? [],
      subscriptions: subscriptions ?? [],
      renewalsDue: renewals,
      openAmountCents: openInvoices.reduce(
        (sum, item) => sum + (item.amount_cents as number),
        0,
      ),
    };
  }

  async listPlans(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("billing_plans")
        .select("*")
        .eq("organization_id", orgId)
        .order("name"),
    );
  }

  async createPlan(orgId: string, input: z.infer<typeof billingPlanSchema>) {
    return unwrap(
      await getAdminClient()
        .from("billing_plans")
        .insert({
          organization_id: orgId,
          name: input.name,
          format: input.format,
          lessons_per_cycle: input.lessonsPerCycle ?? null,
          cycle_days: input.cycleDays,
          price_cents: input.priceCents,
        })
        .select("*")
        .single(),
    );
  }

  async subscribe(orgId: string, input: z.infer<typeof subscriptionSchema>) {
    const plan = unwrap(
      await getAdminClient()
        .from("billing_plans")
        .select("*")
        .eq("id", input.billingPlanId)
        .eq("organization_id", orgId)
        .maybeSingle(),
    );

    if (!plan) {
      throw Errors.notFound("Plano");
    }

    const student = unwrap(
      await getAdminClient()
        .from("students")
        .select("id")
        .eq("id", input.studentId)
        .eq("organization_id", orgId)
        .maybeSingle(),
    );

    if (!student) {
      throw Errors.notFound("Aluno");
    }

    const start = new Date().toISOString().slice(0, 10);
    const end = addDays(new Date(), plan.cycle_days as number);

    const subscription = unwrap(
      await getAdminClient()
        .from("student_subscriptions")
        .insert({
          student_id: input.studentId,
          billing_plan_id: input.billingPlanId,
          status: "active",
          current_period_start: start,
          current_period_end: end,
          auto_renew: input.autoRenew,
        })
        .select("*")
        .single(),
    );

    unwrap(
      await getAdminClient().from("invoices").insert({
        organization_id: orgId,
        student_id: input.studentId,
        student_subscription_id: subscription.id,
        amount_cents: plan.price_cents,
        status: "pending",
        due_date: start,
      }),
    );

    if (plan.lessons_per_cycle) {
      unwrap(
        await getAdminClient().from("lesson_credits").insert({
          organization_id: orgId,
          student_id: input.studentId,
          kind: "regular",
          quantity: plan.lessons_per_cycle,
          reason: "Adesão de plano",
          expires_at: end,
        }),
      );
    }

    return subscription;
  }

  async renew(orgId: string, subscriptionId: string) {
    const subscription = unwrap(
      await getAdminClient()
        .from("student_subscriptions")
        .select("id, billing_plan:billing_plans!inner(organization_id)")
        .eq("id", subscriptionId)
        .eq("billing_plan.organization_id", orgId)
        .maybeSingle(),
    );

    if (!subscription) {
      throw Errors.notFound("Assinatura");
    }

    return unwrap(
      await getAdminClient().rpc("renew_subscription", {
        p_subscription_id: subscriptionId,
      }),
    );
  }
}

export const billingService = new BillingService();
