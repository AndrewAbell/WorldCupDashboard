import { NextResponse } from "next/server";
import { getMatches } from "@/lib/football";
import { cached } from "@/lib/serverCache";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await cached("matches", 60_000, getMatches);
  return NextResponse.json(payload);
}
