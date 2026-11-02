export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthenticated: () =>
    new AppError("Sign in to continue.", 401, "UNAUTHENTICATED"),
  forbidden: () =>
    new AppError("You do not have permission for this action.", 403, "FORBIDDEN"),
  notFound: (entity: string) =>
    new AppError(`${entity} not found.`, 404, "NOT_FOUND", { entity }),
  conflict: (message: string, code = "CONFLICT") => new AppError(message, 409, code),
  planLimit: (resource: string, limit: number) =>
    new AppError("Your plan limit was reached.", 409, "PLAN_LIMIT", { resource, limit }),
  validation: (details: unknown) =>
    new AppError("Invalid data.", 400, "VALIDATION_ERROR", details),
  supabaseMissing: () =>
    new AppError(
      "Supabase is not configured. Fill in .env and run the migrations.",
      503,
      "SUPABASE_NOT_CONFIGURED",
    ),
  database: (message: string) =>
    new AppError(message, 502, "DATABASE_ERROR"),
};
