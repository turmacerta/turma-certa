import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { classService } from "../classes/class.service";
import type { z } from "zod";
import type { billingPlanSchema, billingPlanUpdateSchema, subscriptionSchema } from "./billing.schema";

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
        .select("id, amount_cents, status, due_date, student:students(id, full_name, phone, email)")
        .eq("organization_id", orgId)
        .order("due_date", { ascending: false })
        .limit(1000),
    );

    const reminders = await getAdminClient()
      .from("notifications")
      .select("student_id, created_at")
      .eq("organization_id", orgId)
      .eq("kind", "payment_reminder")
      .order("created_at", { ascending: false })
      .limit(500);
    const lastReminders: Record<string, string> = {};
    for (const row of reminders.data ?? []) {
      const studentId = row.student_id as string;
      lastReminders[studentId] ??= row.created_at as string;
    }

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
    const withStatus = (invoices ?? []).map((item) =>
      item.status === "pending" && (item.due_date as string) < today ? { ...item, status: "overdue" } : item,
    );

    return {
      invoices: withStatus,
      lastReminders,
      subscriptions: subscriptions ?? [],
      renewalsDue: renewals,
      openAmountCents: openInvoices.reduce(
        (sum, item) => sum + (item.amount_cents as number),
        0,
      ),
    };
  }

  async markPaid(orgId: string, invoiceId: string) {
    const invoice = unwrap(
      await getAdminClient()
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .eq("id", invoiceId)
        .in("status", ["pending", "overdue"])
        .select("id, status, paid_at")
        .maybeSingle(),
    );
    if (!invoice) {
      throw Errors.notFound("Invoice");
    }
    return invoice;
  }

  async listPlans(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("billing_plans")
        .select("*")
        .eq("organization_id", orgId)
        .order("is_active", { ascending: false })
        .order("name"),
    );
  }

  async updatePlan(orgId: string, planId: string, input: z.infer<typeof billingPlanUpdateSchema>) {
    const changes = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.lessonsPerCycle !== undefined ? { lessons_per_cycle: input.lessonsPerCycle } : {}),
      ...(input.cycleDays !== undefined ? { cycle_days: input.cycleDays } : {}),
      ...(input.priceCents !== undefined ? { price_cents: input.priceCents } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      ...(input.sportId !== undefined ? { sport_id: input.sportId } : {}),
      ...(input.weeklyClasses !== undefined ? { weekly_classes: input.weeklyClasses } : {}),
    };
    const plan = unwrap(
      await getAdminClient().from("billing_plans").update(changes).eq("organization_id", orgId).eq("id", planId).select("*").maybeSingle(),
    );
    if (!plan) {
      throw Errors.notFound("Plan");
    }
    return plan;
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
          sport_id: input.sportId ?? null,
          weekly_classes: input.weeklyClasses ?? null,
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
      throw Errors.notFound("Plan");
    }

    if (!plan.is_active) {
      throw Errors.conflict("This package is archived.", "PLAN_ARCHIVED");
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
      throw Errors.notFound("Student");
    }

    const classIds = [...new Set(input.classIds)];
    if (plan.weekly_classes && classIds.length !== plan.weekly_classes) {
      throw Errors.conflict("Pick one class for each weekly lesson.", "PACKAGE_CLASSES");
    }
    if (classIds.length) {
      const classes = unwrap(
        await getAdminClient().from("class_groups").select("id, sport_id, format").eq("organization_id", orgId).eq("is_active", true).in("id", classIds),
      ) as Array<{ id: string; sport_id: string; format: string }>;
      const fits = classes.length === classIds.length && classes.every((item) => (!plan.sport_id || item.sport_id === plan.sport_id) && item.format === plan.format);
      if (!fits) {
        throw Errors.conflict("The classes do not match the package.", "PACKAGE_CLASSES");
      }
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
          reason: "plan_signup",
          expires_at: end,
        }),
      );
    }

    for (const classId of classIds) {
      const occupancy = unwrap(await getAdminClient().from("class_group_occupancy").select("vacancies").eq("class_group_id", classId).maybeSingle());
      await classService.enroll(orgId, classId, { studentId: input.studentId, status: occupancy && (occupancy.vacancies as number) <= 0 ? "waitlist" : "active" });
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
      throw Errors.notFound("Subscription");
    }

    return unwrap(
      await getAdminClient().rpc("renew_subscription", {
        p_subscription_id: subscriptionId,
      }),
    );
  }
}

export const billingService = new BillingService();
