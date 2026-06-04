import { NextResponse } from "next/server";
import { getScores } from "@/lib/football";
import { cached } from "@/lib/serverCache";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await cached("scores", 30_000, getScores);
  return NextResponse.json(payload);
}
