import { isSupabaseConfigured } from "../config/env";
import { scheduleService } from "../modules/schedule/schedule.service";

let running = false;

/** Manual/HTTP trigger. Daily schedule lives in Supabase pg_cron (migration 015). */
export async function runScheduleHorizonJob(reason: string) {
  if (!isSupabaseConfigured()) {
    console.info(`[schedule-horizon] skip (${reason}): supabase not configured`);
    return null;
  }
  if (running) {
    console.info(`[schedule-horizon] skip (${reason}): already running`);
    return null;
  }

  running = true;
  const started = Date.now();
  try {
    const result = await scheduleService.maintainHorizon();
    console.info(
      `[schedule-horizon] ${reason}: classes=${result.classes} created=${result.created} removed=${result.removed} cancelled=${result.cancelled} in ${Date.now() - started}ms`,
    );
    return result;
  } catch (error) {
    console.error(`[schedule-horizon] ${reason} failed`, error);
    throw error;
  } finally {
    running = false;
  }
}
