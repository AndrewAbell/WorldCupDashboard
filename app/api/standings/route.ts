import { NextResponse } from "next/server";
import { getStandings } from "@/lib/football";
import { cached } from "@/lib/serverCache";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await cached("standings", 60_000, getStandings);
  return NextResponse.json(payload);
}
