import {
  createIdempotencyKey,
  validateIdempotencyKey,
} from "./idempotency";

type FinancialApiErrorBody = {
  error?: string;
  code?: string;
};

export class FinancialApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "FinancialApiError";
    this.code = code;
  }
}

export async function requestFinancialMutation<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
  idempotencyKey = createIdempotencyKey()
) {
  if (!validateIdempotencyKey(idempotencyKey)) {
    throw new FinancialApiError("Invalid idempotency key.", "VALIDATION_ERROR");
  }

  const request = () =>
    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });

  let response: Response;
  try {
    response = await request();
  } catch (firstError) {
    try {
      response = await request();
    } catch {
      throw firstError;
    }
  }

  let responseBody: T | FinancialApiErrorBody | null = null;

  try {
    responseBody = (await response.json()) as T | FinancialApiErrorBody;
  } catch {
    if (!response.ok) {
      throw new FinancialApiError("Financial mutation failed.");
    }
  }

  if (!response.ok) {
    const errorBody = responseBody as FinancialApiErrorBody | null;
    throw new FinancialApiError(
      errorBody?.error ?? "Financial mutation failed.",
      errorBody?.code
    );
  }

  return responseBody as T;
}
