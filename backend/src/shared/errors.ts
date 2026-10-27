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
    new AppError("Faça login para continuar.", 401, "UNAUTHENTICATED"),
  forbidden: () =>
    new AppError("Você não tem permissão para esta ação.", 403, "FORBIDDEN"),
  notFound: (entity: string) =>
    new AppError(`${entity} não encontrado.`, 404, "NOT_FOUND"),
  conflict: (message: string) => new AppError(message, 409, "CONFLICT"),
  validation: (details: unknown) =>
    new AppError("Dados inválidos.", 400, "VALIDATION_ERROR", details),
  supabaseMissing: () =>
    new AppError(
      "Supabase ainda não está configurado. Preencha o .env e rode as migrations.",
      503,
      "SUPABASE_NOT_CONFIGURED",
    ),
  database: (message: string) =>
    new AppError(message, 502, "DATABASE_ERROR"),
};
