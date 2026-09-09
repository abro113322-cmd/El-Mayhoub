import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateIdempotencyKey } from "@/lib/idempotency";
import { hashRequest } from "@/lib/request-hash";
import { isValidCurrencyCode, normalizeCurrencyCode } from "@/lib/currency";
import {
  enforceFinancialRateLimit,
  MAX_FINANCIAL_AMOUNT,
  readFinancialJsonBody,
  requireFinancialJsonContentType,
  requireFinancialSameOrigin,
} from "@/lib/financial-security";

type TransactionRow = Record<string, unknown>;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function nullableBoundedString(value: unknown, maxLength: number) {
  return value === null || value === undefined || (typeof value === "string" && value.length <= maxLength)
    ? value
    : undefined;
}

function rpcErrorResponse(error: { code?: string; message?: string }) {
  const code = error.code ?? "";
  const message = error.message ?? "";

  if (code === "IDEMPOTENCY_CONFLICT" || message.includes("IDEMPOTENCY_CONFLICT")) {
    return NextResponse.json({ error: "This idempotency key was already used for a different request.", code: "IDEMPOTENCY_CONFLICT" }, { status: 409 });
  }
  if (code === "AUTH_REQUIRED" || message.includes("AUTH_REQUIRED")) {
    return NextResponse.json({ error: "Authentication is required.", code: "AUTH_REQUIRED" }, { status: 401 });
  }
  if (code === "FORBIDDEN" || message.includes("FORBIDDEN")) {
    return NextResponse.json({ error: "You are not authorized for this resource.", code: "FORBIDDEN" }, { status: 403 });
  }
  if (code === "NOT_FOUND" || message.includes("NOT_FOUND")) {
    return NextResponse.json({ error: "Transaction was not found.", code: "NOT_FOUND" }, { status: 404 });
  }
  if (code === "VALIDATION_ERROR" || message.includes("VALIDATION_ERROR")) {
    return NextResponse.json({ error: "The transaction data is invalid.", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  return NextResponse.json({ error: "Transaction mutation failed.", code: "MUTATION_FAILED" }, { status: 500 });
}

async function authenticate() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, response: NextResponse.json({ error: "Authentication is required.", code: "AUTH_REQUIRED" }, { status: 401 }) };
  }
  return { supabase, user, response: null };
}

function getIdempotencyKey(request: Request) {
  const key = request.headers.get("Idempotency-Key");
  if (typeof key !== "string" || !validateIdempotencyKey(key)) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required.", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  return key.trim();
}

function hasOnlyFields(
  body: Record<string, unknown> | null,
  fields: readonly string[]
) {
  return body !== null &&
    Object.keys(body).every((field) => fields.includes(field));
}

function unwrap<T>(data: T | T[] | null) {
  return Array.isArray(data) ? data[0] : data;
}

function validateCreateBody(body: Record<string, unknown> | null) {
  const type = body?.type;
  const currency = typeof body?.currency === "string" ? normalizeCurrencyCode(body.currency) : "";
  const description = nullableBoundedString(body?.description, 1000);
  const paymentMethod = nullableBoundedString(body?.payment_method, 200);
  const notes = nullableBoundedString(body?.notes, 2000);

  if (
    !isValidUuid(body?.space_id) ||
    !isValidUuid(body?.account_id) ||
    (body?.category_id !== null && !isValidUuid(body?.category_id)) ||
    (type !== "income" && type !== "expense") ||
    typeof body?.amount !== "number" ||
    !Number.isFinite(body.amount) ||
    body.amount <= 0 ||
    body.amount > MAX_FINANCIAL_AMOUNT ||
    !isValidCurrencyCode(currency) ||
    !isValidDate(body?.occurred_at) ||
    (body?.description !== undefined && description === undefined) ||
    (body?.payment_method !== undefined && paymentMethod === undefined) ||
    (body?.notes !== undefined && notes === undefined)
  ) {
    return null;
  }

  return {
    space_id: body.space_id,
    account_id: body.account_id,
    category_id: body.category_id,
    type,
    amount: body.amount,
    currency,
    occurred_at: body.occurred_at,
    description,
    payment_method: paymentMethod,
    notes,
  };
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (auth.response) return auth.response;

  const originError = requireFinancialSameOrigin(request);
  if (originError) return originError;

  const contentTypeError = requireFinancialJsonContentType(request);
  if (contentTypeError) return contentTypeError;

  const rateLimitError = await enforceFinancialRateLimit(request, auth.user.id);
  if (rateLimitError) return rateLimitError;

  const idempotencyKey = getIdempotencyKey(request);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  const parsed = await readFinancialJsonBody(request);
  if (parsed.tooLarge) {
    return NextResponse.json(
      { error: "Request body is too large.", code: "REQUEST_TOO_LARGE" },
      { status: 413 }
    );
  }

  const rawBody = parsed.body;
  const body = hasOnlyFields(rawBody, [
    "space_id",
    "account_id",
    "category_id",
    "type",
    "amount",
    "currency",
    "occurred_at",
    "description",
    "payment_method",
    "notes",
  ])
    ? validateCreateBody(rawBody)
    : null;
  if (!body) {
    return NextResponse.json({ error: "The transaction data is invalid.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("api_create_transaction", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: hashRequest(body),
    p_space_id: body.space_id,
    p_account_id: body.account_id,
    p_category_id: body.category_id,
    p_type: body.type,
    p_amount: body.amount,
    p_currency: body.currency,
    p_occurred_at: body.occurred_at,
    p_description: body.description,
    p_payment_method: body.payment_method,
    p_notes: body.notes,
  });

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ success: true, transaction: unwrap(data as TransactionRow | TransactionRow[] | null) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await authenticate();
  if (auth.response) return auth.response;

  const originError = requireFinancialSameOrigin(request);
  if (originError) return originError;

  const contentTypeError = requireFinancialJsonContentType(request);
  if (contentTypeError) return contentTypeError;

  const rateLimitError = await enforceFinancialRateLimit(request, auth.user.id);
  if (rateLimitError) return rateLimitError;

  const idempotencyKey = getIdempotencyKey(request);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  const parsed = await readFinancialJsonBody(request);
  if (parsed.tooLarge) {
    return NextResponse.json(
      { error: "Request body is too large.", code: "REQUEST_TOO_LARGE" },
      { status: 413 }
    );
  }

  const rawBody = parsed.body;
  const id = rawBody?.id;
  const description = nullableBoundedString(rawBody?.description, 1000);
  const paymentMethod = nullableBoundedString(rawBody?.payment_method, 200);
  const notes = nullableBoundedString(rawBody?.notes, 2000);
  const currency =
    rawBody?.currency === undefined
      ? undefined
      : typeof rawBody.currency === "string"
        ? normalizeCurrencyCode(rawBody.currency)
        : "";

  if (
    !isValidUuid(id) ||
    (rawBody?.type !== undefined && rawBody.type !== "income" && rawBody.type !== "expense") ||
    (rawBody?.amount !== undefined &&
      (typeof rawBody.amount !== "number" || !Number.isFinite(rawBody.amount) || rawBody.amount <= 0)) ||
    (typeof rawBody?.amount === "number" &&
      rawBody.amount > MAX_FINANCIAL_AMOUNT) ||
    (currency !== undefined && !isValidCurrencyCode(currency)) ||
    (rawBody?.occurred_at !== undefined && !isValidDate(rawBody.occurred_at)) ||
    (rawBody?.description !== undefined && description === undefined) ||
    (rawBody?.payment_method !== undefined && paymentMethod === undefined) ||
    (rawBody?.notes !== undefined && notes === undefined) ||
    Object.prototype.hasOwnProperty.call(rawBody ?? {}, "user_id") ||
    Object.prototype.hasOwnProperty.call(rawBody ?? {}, "space_id") ||
    Object.prototype.hasOwnProperty.call(rawBody ?? {}, "account_id") ||
    Object.prototype.hasOwnProperty.call(rawBody ?? {}, "category_id") ||
    !hasOnlyFields(rawBody, [
      "id",
      "type",
      "amount",
      "currency",
      "occurred_at",
      "description",
      "payment_method",
      "notes",
    ])
  ) {
    return NextResponse.json({ error: "The transaction data is invalid.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const body = {
    id,
    type: rawBody?.type,
    amount: rawBody?.amount,
    currency,
    occurred_at: rawBody?.occurred_at,
    description,
    payment_method: paymentMethod,
    notes,
  };
  const { data, error } = await auth.supabase.rpc("api_update_transaction", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: hashRequest(body),
    p_transaction_id: id,
    p_type: body.type,
    p_amount: body.amount,
    p_currency: body.currency,
    p_occurred_at: body.occurred_at,
    p_description: body.description,
    p_payment_method: body.payment_method,
    p_notes: body.notes,
  });

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ success: true, transaction: unwrap(data as TransactionRow | TransactionRow[] | null) });
}

export async function DELETE(request: Request) {
  const auth = await authenticate();
  if (auth.response) return auth.response;

  const originError = requireFinancialSameOrigin(request);
  if (originError) return originError;

  const contentTypeError = requireFinancialJsonContentType(request);
  if (contentTypeError) return contentTypeError;

  const rateLimitError = await enforceFinancialRateLimit(request, auth.user.id);
  if (rateLimitError) return rateLimitError;

  const idempotencyKey = getIdempotencyKey(request);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  const parsed = await readFinancialJsonBody(request);
  if (parsed.tooLarge) {
    return NextResponse.json(
      { error: "Request body is too large.", code: "REQUEST_TOO_LARGE" },
      { status: 413 }
    );
  }

  const body = parsed.body;
  const id = body?.id;
  if (!isValidUuid(id) || !hasOnlyFields(body, ["id"])) {
    return NextResponse.json({ error: "A valid transaction ID is required.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("api_delete_transaction", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: hashRequest({ id }),
    p_transaction_id: id,
  });

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ success: true, transaction: unwrap(data as TransactionRow | TransactionRow[] | null) });
}
