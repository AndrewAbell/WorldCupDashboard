import { NextResponse } from "next/server";
import { getStats } from "@/lib/football";
import { cached } from "@/lib/serverCache";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await cached("stats", 60_000, getStats);
  return NextResponse.json(payload);
}
