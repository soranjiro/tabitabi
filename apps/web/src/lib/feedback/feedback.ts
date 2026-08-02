export const FEEDBACK_CATEGORIES = {
  feature: "新しい機能",
  improvement: "使いやすさの改善",
  other: "その他",
} as const;

export type FeedbackCategory = keyof typeof FEEDBACK_CATEGORIES;

export interface FeedbackInput {
  category: FeedbackCategory;
  title: string;
  description: string;
  pageUrl?: string;
  website?: string;
}

export class FeedbackValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new FeedbackValidationError(`${fieldName}を入力してください`);
  }

  const text = value.trim();
  if (text.length < minLength) {
    throw new FeedbackValidationError(
      `${fieldName}は${minLength}文字以上で入力してください`,
    );
  }
  if (text.length > maxLength) {
    throw new FeedbackValidationError(
      `${fieldName}は${maxLength}文字以内で入力してください`,
    );
  }
  return text;
}

function readPageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const pageUrl = value.trim();
  if (pageUrl.length > 500) {
    throw new FeedbackValidationError("ページURLが長すぎます");
  }

  try {
    const url = new URL(pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new FeedbackValidationError("ページURLが正しくありません");
  }
}

export function parseFeedbackInput(value: unknown): FeedbackInput {
  if (!isRecord(value)) {
    throw new FeedbackValidationError("入力内容を確認してください");
  }

  if (
    typeof value.category !== "string" ||
    !(value.category in FEEDBACK_CATEGORIES)
  ) {
    throw new FeedbackValidationError("要望の種類を選択してください");
  }

  return {
    category: value.category as FeedbackCategory,
    title: readText(value.title, "ひとこと要約", 3, 120),
    description: readText(value.description, "詳しい内容", 10, 4000),
    pageUrl: readPageUrl(value.pageUrl),
    website: typeof value.website === "string" ? value.website : undefined,
  };
}

export function buildGitHubIssue(feedback: FeedbackInput): {
  title: string;
  body: string;
} {
  const category = FEEDBACK_CATEGORIES[feedback.category];
  const title = feedback.title.replaceAll("@", "@\u200b");
  const description = feedback.description.replaceAll("@", "@\u200b");
  const source = feedback.pageUrl
    ? `\n\n### 送信元ページ\n${feedback.pageUrl}`
    : "";

  return {
    title: `[要望] ${title}`,
    body: `### 種類\n${category}\n\n### 詳しい内容\n${description}${source}\n\n---\n_たびたびの要望フォームから送信されました_`,
  };
}
