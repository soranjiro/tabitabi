import { describe, expect, it, vi } from "vitest";
import { readBoundedText } from "./read-bounded-text";

function streamChunks(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("readBoundedText", () => {
  it("accepts a request exactly at the byte limit", async () => {
    const bytes = new TextEncoder().encode('{"ok":true}');
    expect(await readBoundedText(streamChunks(bytes), bytes.byteLength))
      .toBe('{"ok":true}');
  });

  it("decodes UTF-8 correctly across stream chunks", async () => {
    const bytes = new TextEncoder().encode("旅🌸");
    expect(await readBoundedText(
      streamChunks(bytes.slice(0, 2), bytes.slice(2, 4), bytes.slice(4)),
      bytes.byteLength,
    )).toBe("旅🌸");
  });

  it("rejects oversized input even when its character count is small", async () => {
    const bytes = new TextEncoder().encode("ああ");
    expect(bytes.byteLength).toBe(6);
    expect(await readBoundedText(streamChunks(bytes), 5)).toBeNull();
  });

  it("cancels the stream immediately when the byte limit is exceeded", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(16_001));
      },
      cancel,
    });
    expect(await readBoundedText(stream, 16_000)).toBeNull();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("handles a missing body without buffering", async () => {
    expect(await readBoundedText(null, 16_000)).toBe("");
  });
});
