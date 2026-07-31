import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  FeedbackValidationError,
  buildGitHubIssue,
  parseFeedbackInput,
} from "$lib/feedback/feedback";

const requestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isRateLimited(request: Request): boolean {
  const clientId =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const now = Date.now();
  if (requestHistory.size > 1_000) {
    for (const [key, timestamps] of requestHistory) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW)) {
        requestHistory.delete(key);
      }
    }
  }
  const recent = (requestHistory.get(clientId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    requestHistory.set(clientId, recent);
    return true;
  }

  requestHistory.set(clientId, [...recent, now]);
  return false;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  if (!isSameOrigin(request)) {
    return json({ message: "このページから送信してください" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_000) {
    return json({ message: "入力内容が長すぎます" }, { status: 413 });
  }

  let feedback;
  try {
    feedback = parseFeedbackInput(await request.json());
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

  if (isRateLimited(request)) {
    return json(
      { message: "送信回数が多いため、しばらく待ってからお試しください" },
      { status: 429 },
    );
  }

  const token = env.GITHUB_ISSUES_TOKEN;
  const repository = env.GITHUB_ISSUES_REPOSITORY ?? "soranjiro/tabitabi";
  if (!token) {
    console.error("GITHUB_ISSUES_TOKEN is not configured");
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
