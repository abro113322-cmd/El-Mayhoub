import { NextResponse } from "next/server";
import {
  apiError, authenticateMutation, finiteNumber, isRecord, isUuid, privateHeaders,
  readJson, unknownFields,
} from "@/lib/api-security";

const accountTypes = ["checking", "savings", "cash", "credit_card", "investment", "other"] as const;
const currencies = /^[A-Z]{3}$/;
const fields = ["space_id", "name", "type", "currency", "opening_balance"] as const;

function accountInput(body: unknown, partial: boolean) {
  if (!isRecord(body)) return "Invalid request body";
  const invalid = unknownFields(body, fields);
  if (invalid) return `Unknown field: ${invalid}`;
  if (!partial || "space_id" in body) {
    if (!isUuid(body.space_id)) return "Invalid space_id";
  }
  if (!partial || "name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 100) return "Invalid account name";
  }
  if (!partial || "type" in body) {
    if (typeof body.type !== "string" || !accountTypes.includes(body.type as typeof accountTypes[number])) return "Invalid account type";
  }
  if (!partial || "currency" in body) {
    if (typeof body.currency !== "string" || !currencies.test(body.currency)) return "Invalid currency";
  }
  if (!partial || "opening_balance" in body) {
    if (!finiteNumber(body.opening_balance)) return "Invalid opening balance";
  }
  return null;
}

export async function POST(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const body = await readJson(request);
    const validation = accountInput(body, false);
    if (validation) return apiError(400, validation);
    const { data, error } = await auth.supabase.from("accounts").insert({
      ...(body as Record<string, unknown>),
      user_id: auth.user.id,
    }).select().single();
    if (error) return apiError(400, "Unable to create account");
    return NextResponse.json(data, { status: 201, headers: privateHeaders });
  } catch (error) {
    return apiError(error instanceof Error && error.message === "Request body is too large" ? 413 : 400, "Invalid request body");
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const body = await readJson(request);
    if (!isRecord(body) || !isUuid(body.id)) return apiError(400, "Invalid account id");
    const { id, ...changes } = body;
    const validation = accountInput(changes, true);
    if (validation) return apiError(400, validation);
    const { data, error } = await auth.supabase.from("accounts").update(changes).eq("id", id).select().single();
    if (error) return apiError(400, "Unable to update account");
    return NextResponse.json(data, { headers: privateHeaders });
  } catch (error) {
    return apiError(error instanceof Error && error.message === "Request body is too large" ? 413 : 400, "Invalid request body");
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const body = await readJson(request);
    if (!isRecord(body) || !isUuid(body.id)) return apiError(400, "Invalid account id");
    const { error } = await auth.supabase.from("accounts").delete().eq("id", body.id);
    if (error) return apiError(400, "Unable to delete account");
    return new NextResponse(null, { status: 204, headers: privateHeaders });
  } catch (error) {
    return apiError(error instanceof Error && error.message === "Request body is too large" ? 413 : 400, "Invalid request body");
  }
}
