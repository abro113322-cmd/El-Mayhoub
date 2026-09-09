import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateIdempotencyKey } from "@/lib/idempotency";
import { hashRequest } from "@/lib/request-hash";
import {
  enforceFinancialRateLimit,
  MAX_FINANCIAL_AMOUNT,
  readFinancialJsonBody,
  requireFinancialJsonContentType,
  requireFinancialSameOrigin,
} from "@/lib/financial-security";

type SavingRow = {
  id: string;
  user_id: string;
  space_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function rpcErrorResponse(error: { code?: string; message?: string }) {
  const code = error.code ?? "";
  const message = error.message ?? "";

  if (code === "IDEMPOTENCY_CONFLICT" || message.includes("IDEMPOTENCY_CONFLICT")) {
    return NextResponse.json(
      { error: "This idempotency key was already used for a different request.", code: "IDEMPOTENCY_CONFLICT" },
      { status: 409 }
    );
  }

  if (code === "AUTH_REQUIRED" || message.includes("AUTH_REQUIRED")) {
    return NextResponse.json({ error: "Authentication is required.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  if (code === "FORBIDDEN" || message.includes("FORBIDDEN")) {
    return NextResponse.json({ error: "You are not authorized for this resource.", code: "FORBIDDEN" }, { status: 403 });
  }

  if (code === "NOT_FOUND" || message.includes("NOT_FOUND")) {
    return NextResponse.json({ error: "Saving goal was not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  if (code === "VALIDATION_ERROR" || message.includes("VALIDATION_ERROR")) {
    return NextResponse.json({ error: "The saving goal data is invalid.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  return NextResponse.json({ error: "Saving goal mutation failed.", code: "MUTATION_FAILED" }, { status: 500 });
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
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
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

  const body = parsed.body;
  const targetAmount = body?.target_amount;
  const currentAmount = body?.current_amount;
  const name = body?.name;
  const spaceId = body?.space_id;
  const deadline = body?.deadline;

  if (
    !isValidUuid(spaceId) ||
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 200 ||
    typeof targetAmount !== "number" ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0 ||
    targetAmount > MAX_FINANCIAL_AMOUNT ||
    typeof currentAmount !== "number" ||
    !Number.isFinite(currentAmount) ||
    currentAmount < 0 ||
    currentAmount > MAX_FINANCIAL_AMOUNT ||
    currentAmount > targetAmount ||
    !isValidDate(deadline) ||
    !hasOnlyFields(body, [
      "space_id",
      "name",
      "target_amount",
      "current_amount",
      "deadline",
    ])
  ) {
    return NextResponse.json({ error: "The saving goal data is invalid.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const requestData = {
    space_id: spaceId,
    name: name.trim(),
    target_amount: targetAmount,
    current_amount: currentAmount,
    deadline,
  };
  const { data, error } = await auth.supabase.rpc("api_create_saving", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: hashRequest(requestData),
    p_space_id: spaceId,
    p_name: name.trim(),
    p_target_amount: targetAmount,
    p_current_amount: currentAmount,
    p_deadline: deadline,
  });

  if (error) return rpcErrorResponse(error);

  return NextResponse.json({ success: true, saving: unwrap(data as SavingRow | SavingRow[] | null) }, { status: 201 });
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

  const body = parsed.body;
  const id = body?.id;
  const name = body?.name;
  const targetAmount = body?.target_amount;
  const deadline = body?.deadline;

  if (
    !isValidUuid(id) ||
    (name !== undefined && (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 200)) ||
    (targetAmount !== undefined &&
      (typeof targetAmount !== "number" ||
        !Number.isFinite(targetAmount) ||
        targetAmount <= 0 ||
        targetAmount > MAX_FINANCIAL_AMOUNT)) ||
    (deadline !== undefined && !isValidDate(deadline)) ||
    Object.prototype.hasOwnProperty.call(body ?? {}, "current_amount") ||
    !hasOnlyFields(body, ["id", "name", "target_amount", "deadline"])
  ) {
    return NextResponse.json({ error: "The saving goal data is invalid.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const requestData = {
    id,
    name: typeof name === "string" ? name.trim() : undefined,
    target_amount: targetAmount,
    deadline,
  };
  const { data, error } = await auth.supabase.rpc("api_update_saving", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: hashRequest(requestData),
    p_saving_id: id,
    p_name: requestData.name,
    p_target_amount: targetAmount,
    p_deadline: deadline,
  });

  if (error) return rpcErrorResponse(error);

  return NextResponse.json({ success: true, saving: unwrap(data as SavingRow | SavingRow[] | null) });
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
    return NextResponse.json({ error: "A valid saving goal ID is required.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const requestData = { id };
  const { data, error } = await auth.supabase.rpc("api_delete_saving", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: hashRequest(requestData),
    p_saving_id: id,
  });

  if (error) return rpcErrorResponse(error);

  return NextResponse.json({ success: true, saving: unwrap(data as SavingRow | SavingRow[] | null) });
}
