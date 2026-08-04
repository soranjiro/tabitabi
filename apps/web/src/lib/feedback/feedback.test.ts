import { describe, expect, it } from "vitest";
import {
  FeedbackValidationError,
  buildGitHubIssue,
  parseFeedbackInput,
} from "./feedback";

describe("parseFeedbackInput", () => {
  it("trims and validates feedback", () => {
    expect(
      parseFeedbackInput({
        category: "feature",
        title: "  地図を共有したい  ",
        description: "  旅行メンバーと地図を共有できるようにしてほしいです。  ",
        pageUrl: "https://tabitabi.pages.dev/demo",
      }),
    ).toEqual({
      category: "feature",
      title: "地図を共有したい",
      description: "旅行メンバーと地図を共有できるようにしてほしいです。",
      pageUrl: "https://tabitabi.pages.dev/demo",
      website: undefined,
    });
  });

  it.each([
    [{ category: "invalid", title: "有効な要約", description: "十分に長い詳しい内容です" }],
    [{ category: "feature", title: "短", description: "十分に長い詳しい内容です" }],
    [{ category: "feature", title: "有効な要約", description: "短い" }],
    [
      {
        category: "feature",
        title: "有効な要約",
        description: "十分に長い詳しい内容です",
        pageUrl: "javascript:alert(1)",
      },
    ],
  ])("rejects invalid feedback", (input) => {
    expect(() => parseFeedbackInput(input)).toThrow(FeedbackValidationError);
  });
});

describe("buildGitHubIssue", () => {
  it("builds a readable issue", () => {
    const issue = buildGitHubIssue({
      category: "improvement",
      title: "入力を簡単にしたい",
      description: "日付の入力候補を選べるようにしてほしいです。",
      pageUrl: "https://tabitabi.pages.dev/",
    });

    expect(issue.title).toBe("[要望] 入力を簡単にしたい");
    expect(issue.body).toContain("### 種類\n使いやすさの改善");
    expect(issue.body).toContain("日付の入力候補");
    expect(issue.body).toContain("https://tabitabi.pages.dev/");
  });

  it("prevents user-entered GitHub mentions", () => {
    const issue = buildGitHubIssue({
      category: "other",
      title: "@everyone への相談",
      description: "@octocat さんにも確認してほしい内容です。",
    });

    expect(issue.title).not.toContain("@everyone");
    expect(issue.body).not.toContain("@octocat");
  });
});
