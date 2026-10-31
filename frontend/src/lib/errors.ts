import { RequestError } from "./api";
import type { Messages } from "./messages/pt-br";

export function errorMessage(error: unknown, t: Messages) {
  if (!(error instanceof RequestError)) {
    return t.errors.generic;
  }
  switch (error.code) {
    case "NETWORK_ERROR":
      return t.errors.network;
    case "UNAUTHENTICATED":
      return t.errors.unauthenticated;
    case "FORBIDDEN":
      return t.errors.forbidden;
    case "NOT_FOUND": {
      const entity = (error.details as { entity?: string } | undefined)?.entity ?? "";
      return t.errors.notFound(t.errors.entities[entity] ?? entity);
    }
    case "VALIDATION_ERROR": {
      const details = error.details as { schedules?: string } | undefined;
      return details?.schedules === "NO_SCHEDULE" ? t.errors.noSchedule : t.errors.validation;
    }
    case "SUPABASE_NOT_CONFIGURED":
      return t.errors.supabaseMissing;
    case "DATABASE_ERROR":
      return t.errors.database;
    case "CLASS_FULL":
      return t.errors.classFull;
    default:
      return t.errors.generic;
  }
}
