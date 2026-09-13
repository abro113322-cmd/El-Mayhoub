import { NextResponse } from "next/server";

const version = process.env.VERCEL_GIT_COMMIT_SHA ?? "development";

export function GET() {
  return NextResponse.json(
    { version },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
