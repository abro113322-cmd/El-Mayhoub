import { NextResponse } from "next/server";
import {
  apiError, authenticateMutation, isRecord, isUuid, privateHeaders, readJson, unknownFields,
} from "@/lib/api-security";

const fields = ["space_id", "name", "kind", "icon"] as const;
const kinds = ["income", "expense"] as const;

function categoryInput(body: unknown, partial: boolean) {
  if (!isRecord(body)) return "Invalid request body";
  const invalid = unknownFields(body, fields);
  if (invalid) return `Unknown field: ${invalid}`;
  if (!partial || "space_id" in body) {
    if (!isUuid(body.space_id)) return "Invalid space_id";
  }
  if (!partial || "name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 100) return "Invalid category name";
  }
  if (!partial || "kind" in body) {
    if (typeof body.kind !== "string" || !kinds.includes(body.kind as typeof kinds[number])) return "Invalid category kind";
  }
  if ("icon" in body && body.icon !== null && (typeof body.icon !== "string" || body.icon.length > 100)) return "Invalid icon";
  return null;
}

async function bodyOf(request: Request) {
  try {
    return await readJson(request);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  const body = await bodyOf(request);
  const validation = categoryInput(body, false);
  if (validation) return apiError(400, validation);
  const { data, error } = await auth.supabase.from("categories").insert(body as Record<string, unknown>).select().single();
  if (error) return apiError(400, "Unable to create category");
  return NextResponse.json(data, { status: 201, headers: privateHeaders });
}

export async function PATCH(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  const body = await bodyOf(request);
  if (!isRecord(body) || !isUuid(body.id)) return apiError(400, "Invalid category id");
  const { id, ...changes } = body;
  const validation = categoryInput(changes, true);
  if (validation) return apiError(400, validation);
  const { data, error } = await auth.supabase.from("categories").update(changes).eq("id", id).select().single();
  if (error) return apiError(400, "Unable to update category");
  return NextResponse.json(data, { headers: privateHeaders });
}

export async function DELETE(request: Request) {
  const auth = await authenticateMutation(request);
  if ("response" in auth) return auth.response;
  const body = await bodyOf(request);
  if (!isRecord(body) || !isUuid(body.id)) return apiError(400, "Invalid category id");
  const { error } = await auth.supabase.from("categories").delete().eq("id", body.id);
  if (error) return apiError(400, "Unable to delete category");
  return new NextResponse(null, { status: 204, headers: privateHeaders });
}
