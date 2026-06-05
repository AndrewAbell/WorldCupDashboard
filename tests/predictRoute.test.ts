import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/predict/route";
import { resetRateLimitForTests } from "@/lib/rateLimit";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function request(ip: string) {
  return new NextRequest("http://localhost/api/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip
    },
    body: JSON.stringify({
      matchId: "match-1",
      homeTeam: "USA",
      awayTeam: "Mexico",
      homeForm: ["W", "D", "W"],
      awayForm: ["L", "W", "D"],
      group: "Group A",
      stage: "Group Stage"
    })
  });
}

beforeEach(() => {
  resetRateLimitForTests();
  process.env = { ...originalEnv };
  delete process.env.HF_API_KEY;
});

afterEach(() => {
  resetRateLimitForTests();
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

test("returns no prediction data when HuggingFace is not configured", async () => {
  const response = await POST(request("198.51.100.1"));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.prediction, null);
  assert.match(body.error, /HF_API_KEY/);
  assert.equal(body.remaining, 4);
});

test("rate limits before calling HuggingFace", async () => {
  process.env.HF_API_KEY = "hf";
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "{\"homeWin\":60,\"draw\":20,\"awayWin\":20,\"reasoning\":\"Home form is stronger.\"}"
          }
        }
      ]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  for (let index = 0; index < 5; index += 1) {
    await POST(request("198.51.100.2"));
  }

  const limited = await POST(request("198.51.100.2"));
  const body = await limited.json();

  assert.equal(limited.status, 429);
  assert.equal(body.remaining, 0);
  assert.equal(fetchCalls, 5);
});

test("returns 400 for invalid prediction JSON", async () => {
  const response = await POST(
    new NextRequest("http://localhost/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.3"
      },
      body: "{bad json"
    })
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.prediction, null);
  assert.equal(body.error, "Invalid JSON request body");
});

test("sends constrained predictor rules and omits absent form", async () => {
  process.env.HF_API_KEY = "hf";
  let requestBody = "";
  globalThis.fetch = async (_url, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "{\"homeWin\":72,\"draw\":18,\"awayWin\":10,\"reasoning\":\"Brazil's general team strength is clearly higher than Haiti's.\"}"
          }
        }
      ]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const response = await POST(
    new NextRequest("http://localhost/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.4"
      },
      body: JSON.stringify({
        matchId: "match-2",
        homeTeam: "Brazil",
        awayTeam: "Haiti",
        homeForm: [],
        awayForm: [],
        group: "Group C",
        stage: "Group Stage"
      })
    })
  );
  const payload = JSON.parse(requestBody) as { messages: Array<{ role: string; content: string }> };
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.prediction.homeWin + body.prediction.draw + body.prediction.awayWin, 100);
  assert.match(payload.messages[0].content, /Do NOT invent or reference recent form/);
  assert.match(payload.messages[0].content, /Home\/away labels in this tournament are mostly nominal/);
  assert.match(payload.messages[0].content, /Do NOT default to near-even splits/);
  assert.doesNotMatch(payload.messages[1].content, /form/i);
});
