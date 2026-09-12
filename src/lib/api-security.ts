import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  enforceFinancialRateLimit,
  requireFinancialJsonContentType,
  requireFinancialSameOrigin,
} from "@/lib/financial-security";

const MAX_BODY_BYTES = 8 * 1024;

export const privateHeaders = {
  "Cache-Control": "no-store",
};

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: privateHeaders });
}

export async function authenticateMutation(request: Request) {
  const originError = requireFinancialSameOrigin(request);
  if (originError) return { response: originError };

  const contentTypeError = requireFinancialJsonContentType(request);
  if (contentTypeError) return { response: contentTypeError };

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return { response: apiError(413, "Request body is too large") };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: apiError(401, "Authentication required") };

  const rateLimitError = await enforceFinancialRateLimit(request, data.user.id);
  if (rateLimitError) return { response: rateLimitError };

  return { supabase, user: data.user };
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("Request body is too large");
  }
  return JSON.parse(text) as unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function unknownFields(body: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(body).find((key) => !allowed.includes(key));
}
