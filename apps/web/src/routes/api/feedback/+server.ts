import { env } from "$env/dynamic/private";
import { dev } from "$app/env";
import { env as cloudflareEnv } from "cloudflare:workers";
import type { D1Database } from "@cloudflare/workers-types";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  FeedbackValidationError,
  buildGitHubIssue,
  parseFeedbackInput,
} from "$lib/feedback/feedback";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  if (!isSameOrigin(request)) {
    return json({ message: "このページから送信してください" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_000) {
    return json({ message: "入力内容が長すぎます" }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > 16_000) {
    return json({ message: "入力内容が長すぎます" }, { status: 413 });
  }
  let feedback;
  try {
    feedback = parseFeedbackInput(JSON.parse(raw));
  } catch (error) {
    const message =
      error instanceof FeedbackValidationError
        ? error.message
        : "入力内容を確認してください";
    return json({ message }, { status: 400 });
  }

  if (feedback.website) {
    return json({ issueUrl: null });
  }

  // In-memory counters are per-instance and can be evaded by Workers/Pages
  // instance changes. Store counters atomically in the shared Cloudflare D1 DB.
  const db = (cloudflareEnv as { DB?: D1Database }).DB;
  if (!db && !dev) {
    return json({ message: "現在、要望を送信できません。時間をおいてお試しください" }, { status: 503 });
  }
  if (db) {
    // Only the Cloudflare-managed client IP header is trusted in production.
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    const ipHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const now = Date.now();
    for (const { key, max, windowMs } of [
      { key: `feedback:ip:${ipHash}`, max: 5, windowMs: 15 * 60_000 },
      { key: "feedback:global", max: 100, windowMs: 24 * 60 * 60_000 },
    ]) {
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const row = await db.prepare(`
        INSERT INTO api_rate_limit_counters (bucket_key, window_start, hit_count)
        VALUES (?, ?, 1)
        ON CONFLICT(bucket_key) DO UPDATE SET
          hit_count = CASE WHEN window_start = excluded.window_start THEN hit_count + 1 ELSE 1 END,
          window_start = excluded.window_start
        RETURNING hit_count
      `).bind(key, windowStart).first<{ hit_count: number }>();
      if (!row || row.hit_count > max) {
        const seconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
        return json(
          { message: "送信回数が多いため、しばらく待ってからお試しください" },
          { status: 429, headers: { "Retry-After": String(seconds) } },
        );
      }
    }
  }

  const token = env.APP_GITHUB_ISSUES_TOKEN;
  const repository = env.APP_GITHUB_ISSUES_REPOSITORY ?? "soranjiro/tabitabi";
  if (!token) {
    console.error("APP_GITHUB_ISSUES_TOKEN is not configured");
    return json(
      { message: "現在、要望を送信できません。時間をおいてお試しください" },
      { status: 503 },
    );
  }

  const issue = buildGitHubIssue(feedback);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "tabitabi-feedback",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(issue),
      },
    );

    if (!response.ok) {
      console.error(`GitHub issue creation failed with status ${response.status}`);
      return json(
        { message: "要望を送信できませんでした。もう一度お試しください" },
        { status: 502 },
      );
    }

    const createdIssue = (await response.json()) as {
      html_url?: unknown;
      number?: unknown;
    };
    if (
      typeof createdIssue.html_url !== "string" ||
      typeof createdIssue.number !== "number"
    ) {
      throw new Error("GitHub returned an invalid issue response");
    }

    return json(
      { issueUrl: createdIssue.html_url, issueNumber: createdIssue.number },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "GitHub issue request failed",
    );
    return json(
      { message: "要望を送信できませんでした。もう一度お試しください" },
      { status: 502 },
    );
  }
};
