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
      const details = error.details as { schedules?: string; guardian?: string; contact?: string } | undefined;
      if (details?.contact === "CONTACT_REQUIRED") return t.errors.contactRequired;
      return details?.schedules === "NO_SCHEDULE" ? t.errors.noSchedule : t.errors.validation;
    }
    case "SUPABASE_NOT_CONFIGURED":
      return t.errors.supabaseMissing;
    case "DATABASE_ERROR":
      return t.errors.database;
    case "CLASS_FULL":
      return t.errors.classFull;
    case "PLAN_LIMIT": {
      const details = error.details as { resource?: string; limit?: number } | undefined;
      return t.errors.planLimit(t.errors.planResources[details?.resource ?? ""] ?? "", details?.limit ?? 0);
    }
    case "PERMISSION_ESCALATION":
      return t.errors.permissionEscalation;
    case "ROLE_IN_USE":
      return t.errors.roleInUse;
    case "UNIT_IN_USE":
    case "SPACE_IN_USE":
    case "LEVEL_IN_USE":
      return t.errors.catalogInUse;
    case "SPORT_IN_USE":
      return t.errors.sportInUse;
    case "RATE_LIMITED":
      return t.errors.rateLimited;
    case "NO_PACKAGE":
      return t.errors.noPackage;
    case "PACKAGE_FULL":
      return t.errors.packageFull;
    case "PACKAGE_CLASSES":
      return t.errors.packageClasses;
    case "PLAN_ARCHIVED":
      return t.errors.planArchived;
    case "ROLE_TEMPLATE":
      return t.errors.roleTemplate;
    case "OWNS_SCHOOL":
      return t.errors.ownsSchool;
    case "NO_CREDITS":
      return t.errors.noCredits;
    case "ALREADY_MEMBER":
      return t.errors.alreadyMember;
    case "INVITE_FAILED":
      return t.errors.inviteFailed;
    case "SESSION_PAST":
      return t.errors.sessionPast;
    default:
      return t.errors.generic;
  }
}
