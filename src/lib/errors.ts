export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RULE_VIOLATION";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public opts: { fieldErrors?: Record<string, string>; details?: unknown } = {},
  ) {
    super(message);
  }
}

export type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; details?: unknown };

const pgCode = (e: unknown): string | undefined => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code ?? x?.cause?.code;
};

/** Map known Postgres errors to AppError; returns null for anything else. */
export function mapPgError(e: unknown): AppError | null {
  switch (pgCode(e)) {
    case "23P01":
      return new AppError("CONFLICT", "This slot was just taken by someone else.");
    case "23505":
      return new AppError("CONFLICT", "That value already exists (asset code, slug or similar must be unique).");
    case "23503":
      return new AppError("CONFLICT", "This record is still in use by other records.");
    default:
      return null;
  }
}

/** Run a service call and turn every failure into a typed result. Actions never throw to the client. */
export async function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    // let Next.js control-flow errors (redirect / notFound) through
    if ((e as { digest?: string })?.digest?.startsWith?.("NEXT_")) throw e;
    const err = e instanceof AppError ? e : mapPgError(e);
    if (err) return { ok: false, error: err.message, fieldErrors: err.opts.fieldErrors, details: err.opts.details };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
