import { NextResponse } from "next/server";
import {
  apiError, authenticateMutation, finiteNumber, isRecord, isUuid, privateHeaders,
  readJson, unknownFields,
} from "@/lib/api-security";

const fields = ["space_id", "category_id", "name", "amount", "start_date", "end_date"] as const;

function budgetInput(body: unknown, partial: boolean) {
  if (!isRecord(body)) return "Invalid request body";
  const invalid = unknownFields(body, fields);
  if (invalid) return `Unknown field: ${invalid}`;
  if (!partial || "space_id" in body) {
    if (!isUuid(body.space_id)) return "Invalid space_id";
  }
  if (!partial || "category_id" in body) {
    if (!isUuid(body.category_id)) return "Invalid category_id";
  }
  if ("name" in body && (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 100)) return "Invalid budget name";
  if (!partial && !("name" in body)) return "Invalid budget name";
  if (!partial || "amount" in body) {
    if (!finiteNumber(body.amount) || body.amount <= 0) return "Invalid amount";
  }
  for (const key of ["start_date", "end_date"]) {
    if (key in body && (typeof body[key] !== "string" || Number.isNaN(Date.parse(body[key] as string)))) return `Invalid ${key}`;
  }
  if (typeof body.start_date === "string" && typeof body.end_date === "string" &&
      new Date(body.end_date).getTime() < new Date(body.start_date).getTime()) return "Invalid date range";
  return null;
}

async function handleBody(request: Request) {
  try {
    return await readJson(request);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  const body = await handleBody(request);
  const validation = budgetInput(body, false);
  if (validation) return apiError(400, validation);
  const { data, error } = await auth.supabase
    .from("budgets")
    .insert({ ...(body as Record<string, unknown>), user_id: auth.user.id })
    .select()
    .single();
  if (error) return apiError(400, "Unable to create budget");
  return NextResponse.json(data, { status: 201, headers: privateHeaders });
}

export async function PATCH(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  const body = await handleBody(request);
  if (!isRecord(body) || !isUuid(body.id)) return apiError(400, "Invalid budget id");
  const { id, ...changes } = body;
  const validation = budgetInput(changes, true);
  if (validation) return apiError(400, validation);
  const { data, error } = await auth.supabase.from("budgets").update(changes).eq("id", id).select().single();
  if (error) return apiError(400, "Unable to update budget");
  return NextResponse.json(data, { headers: privateHeaders });
}

export async function DELETE(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  const body = await handleBody(request);
  if (!isRecord(body) || !isUuid(body.id)) return apiError(400, "Invalid budget id");
  const { error } = await auth.supabase.from("budgets").delete().eq("id", body.id);
  if (error) return apiError(400, "Unable to delete budget");
  return new NextResponse(null, { status: 204, headers: privateHeaders });
}
