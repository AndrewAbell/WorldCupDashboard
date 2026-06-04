import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import type { PredictRequest, PredictionResult } from "@/types";

const PRIMARY_MODEL = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct:fastest";
const FALLBACK_MODEL = "openai/gpt-oss-20b:cheapest";
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";

type HuggingFaceChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function buildMessages(input: PredictRequest) {
  return [
    {
      role: "system",
      content:
        'You are a football analyst. Respond only with JSON: {"homeWin":number,"draw":number,"awayWin":number,"reasoning":"short sentence"}. The three numbers must sum to 100.'
    },
    {
      role: "user",
      content: `Predict: ${input.homeTeam} vs ${input.awayTeam}.
Home form: [${input.homeForm.join("/")}]. Away form: [${input.awayForm.join("/")}].
Group: [${input.group}]. Stage: [${input.stage}].`
    }
  ];
}

function normalizePrediction(prediction: PredictionResult): PredictionResult {
  const raw = [
    Math.max(0, Math.min(100, Math.round(Number(prediction.homeWin) || 0))),
    Math.max(0, Math.min(100, Math.round(Number(prediction.draw) || 0))),
    Math.max(0, Math.min(100, Math.round(Number(prediction.awayWin) || 0)))
  ];

  const total = raw.reduce((sum, item) => sum + item, 0);
  if (total === 0) {
    throw new Error("Model returned empty probabilities");
  }

  const scaled = raw.map((item) => Math.round((item / total) * 100));
  const diff = 100 - scaled.reduce((sum, item) => sum + item, 0);
  scaled[0] += diff;

  return {
    homeWin: scaled[0],
    draw: scaled[1],
    awayWin: scaled[2],
    reasoning: String(prediction.reasoning || "No reasoning returned.").split(/\s+/).slice(0, 20).join(" "),
    source: prediction.source
  };
}

function parsePrediction(text: string): PredictionResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Model did not return JSON");
  }

  const parsed = JSON.parse(match[0]) as PredictionResult;
  return normalizePrediction({ ...parsed, source: "huggingface" });
}

async function callHuggingFace(model: string, messages: ReturnType<typeof buildMessages>): Promise<PredictionResult> {
  const key = process.env.HF_API_KEY;
  if (!key) {
    throw new Error("HF_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(HF_ROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 160,
        temperature: 0.2,
        stream: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HuggingFace returned ${response.status}`);
    }

    const payload = (await response.json()) as HuggingFaceChatResponse;
    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("HuggingFace response was empty");
    }
    return parsePrediction(text);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limited",
        retryAfter: limit.retryAfter,
        remaining: 0
      },
      { status: 429 }
    );
  }

  let input: PredictRequest;
  try {
    input = (await request.json()) as PredictRequest;
  } catch {
    return NextResponse.json(
      {
        prediction: null,
        remaining: limit.remaining,
        error: "Invalid JSON request body"
      },
      { status: 400 }
    );
  }

  if (!input.matchId || !input.homeTeam || !input.awayTeam) {
    return NextResponse.json(
      {
        prediction: null,
        remaining: limit.remaining,
        error: "matchId, homeTeam, and awayTeam are required"
      },
      { status: 400 }
    );
  }

  const messages = buildMessages(input);

  try {
    const prediction = await callHuggingFace(PRIMARY_MODEL, messages).catch(() => callHuggingFace(FALLBACK_MODEL, messages));
    return NextResponse.json({ prediction, remaining: limit.remaining });
  } catch (error) {
    return NextResponse.json(
      {
        prediction: null,
        remaining: limit.remaining,
        error: error instanceof Error ? error.message : "HuggingFace unavailable"
      },
      { status: 503 }
    );
  }
}
