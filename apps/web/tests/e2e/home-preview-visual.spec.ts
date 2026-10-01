import { expect, test, type Page } from "@playwright/test";

async function selectMiddlePreview(page: Page, index = 2) {
  await page.locator(".preview-dots button").nth(index).click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() =>
      page.locator(".shiori-preview.active").evaluate((element) => {
        const card = element.getBoundingClientRect();
        const track = element
          .closest(".preview-track")!
          .getBoundingClientRect();
        return Math.abs(
          card.left + card.width / 2 - track.left - track.width / 2,
        );
      }),
    )
    .toBeLessThan(2);
}

const viewports = [
  { width: 320, height: 700 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 767, height: 1024 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 844, height: 390 },
];

for (const viewport of viewports) {
  test(`home layout stays readable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/", { waitUntil: "networkidle" });

    const hero = (await page.locator(".hero-stage").boundingBox())!;
    const copy = (await page.locator(".hero-copy").boundingBox())!;
    const preview = (await page
      .locator(".shiori-preview.active")
      .boundingBox())!;
    const journey = (await page.locator(".journey-section").boundingBox())!;
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    expect(hero.height).toBeGreaterThanOrEqual(viewport.height);
    expect(preview.x).toBeGreaterThanOrEqual(0);
    expect(preview.x + preview.width).toBeLessThanOrEqual(viewport.width);
    expect(preview.y + preview.height).toBeLessThanOrEqual(hero.height);
    expect(journey.y).toBeGreaterThanOrEqual(hero.height);
    const labels = await page.locator(".scene-label").evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          lines: rect.height / parseFloat(getComputedStyle(node).lineHeight),
        };
      }),
    );
    for (const label of labels) {
      expect(label.left).toBeGreaterThanOrEqual(0);
      expect(label.right).toBeLessThanOrEqual(viewport.width);
      expect(label.lines).toBeLessThan(1.01);
    }
    if (viewport.width < 768) {
      expect(copy.y + copy.height).toBeLessThan(preview.y);
      // Common phone heights keep the entire composition in the first screen.
      if (viewport.height >= 700)
        expect(hero.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(preview.width).toBeGreaterThanOrEqual(218);
      expect(preview.width).toBeLessThanOrEqual(270);
    } else {
      expect(copy.x + copy.width).toBeLessThan(preview.x);
      expect(preview.width).toBe(300);
    }
    const rows = await page
      .locator(".shiori-preview.active .preview-timeline li")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
      );
    expect(rows).toHaveLength(4);
    rows
      .slice(1)
      .forEach((row, index) =>
        expect(row.top).toBeGreaterThanOrEqual(rows[index]!.bottom - 1),
      );
    await page.screenshot({ path: testInfo.outputPath("hero.png") });

    await page.locator("#create").scrollIntoViewIfNeeded();
    const form = (await page.locator(".form-card").boundingBox())!;
    expect(form.x).toBeGreaterThanOrEqual(14);
    expect(form.width).toBeLessThanOrEqual(620);
    expect(form.x + form.width).toBeLessThanOrEqual(viewport.width - 14);
    await expect(page.locator("#title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "次のデザイン" }),
    ).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "パスワードで保護する" }),
    ).toBeAttached();
    await page.screenshot({ path: testInfo.outputPath("create.png") });
    expect(errors).toEqual([]);
  });
}

test("preview buttons, dots, horizontal scroll and resize keep the selected sample centered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const active = page.locator(".shiori-preview.active");
  await selectMiddlePreview(page);
  const initialTitle = await active.locator("h2").textContent();
  const initialImage = await page
    .locator(".hero-picture img")
    .getAttribute("src");
  await page.getByRole("button", { name: "次のしおり", exact: true }).click();
  await expect(active.locator("h2")).not.toHaveText(initialTitle!);
  await expect(page.locator(".hero-picture img")).not.toHaveAttribute(
    "src",
    initialImage!,
  );
  await page.getByRole("button", { name: "前のしおり", exact: true }).click();
  await expect(active.locator("h2")).toHaveText(initialTitle!);

  await page.locator(".preview-dots button").first().click();
  await expect(
    page.getByRole("button", { name: "前のしおり", exact: true }),
  ).toBeEnabled();
  const track = page.locator(".preview-track");
  await track.evaluate((element) => {
    element.scrollLeft += 232;
  });
  await expect(page.locator(".preview-dots button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const selectedTitle = await active.locator("h2").textContent();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(active.locator("h2")).toHaveText(selectedTitle!);
  await expect
    .poll(async () => {
      const card = (await active.boundingBox())!;
      const viewport = (await track.boundingBox())!;
      return Math.abs(
        card.x + card.width / 2 - viewport.x - viewport.width / 2,
      );
    })
    .toBeLessThan(2);
  await page.locator(".preview-dots button").last().click();
  await expect(
    page.getByRole("button", { name: "次のしおり", exact: true }),
  ).toBeEnabled();
});

test("touch swiping changes the sample without blocking vertical page scrolling", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await selectMiddlePreview(page, 5);
  const previousTitle = await page
    .locator(".shiori-preview.active h2")
    .textContent();
  const track = (await page.locator(".preview-track").boundingBox())!;
  const session = await context.newCDPSession(page);
  const y = track.y + track.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 300, y }],
  });
  for (let x = 280; x >= 80; x -= 20) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y }],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".shiori-preview.active h2")).not.toHaveText(
    previousTitle!,
  );
  await expect(page.locator(".preview-dots button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 195, y: 700 }],
  });
  for (let nextY = 680; nextY >= 400; nextY -= 20) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: nextY }],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`the static journey artwork stays centered and joins the form at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".journey-section").scrollIntoViewIfNeeded();

    await expect(page.getByText("しおりを作る", { exact: true })).toBeVisible();
    await expect(page.getByText("SNSで共有", { exact: true })).toBeVisible();
    await expect(page.getByText("みんなで見る", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("journey.png") });

    const geometry = await page.evaluate(() => {
      const drawing = document
        .querySelector<HTMLElement>(".journey-inner")!
        .getBoundingClientRect();
      const art = document
        .querySelector(".journey-art")!
        .getBoundingClientRect();
      const thread = document
        .querySelector(".form-thread")!
        .getBoundingClientRect();
      const form = document
        .querySelector(".form-outline")!
        .getBoundingClientRect();
      const labels = Array.from(
        document.querySelectorAll<HTMLElement>(".scene-label"),
      ).map((label) => label.getBoundingClientRect());

      return {
        width: drawing.width,
        drawingProgress: document
          .querySelector<HTMLElement>(".journey-inner")!
          .getAttribute("data-drawing-progress"),
        firstJoin: Math.abs(art.bottom - thread.top),
        secondJoin: Math.abs(thread.bottom - form.top),
        centerJoin: Math.abs(
          art.left + art.width / 2 - thread.left - thread.width / 2,
        ),
        maxLabelCenterDelta: Math.max(
          ...labels.map((label) =>
            Math.abs(
              label.left +
                label.width / 2 -
                (drawing.left + drawing.width / 2),
            ),
          ),
        ),
        labelTops: labels.map((label) => label.top),
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });

    expect(geometry.drawingProgress).toBeNull();
    expect(geometry.firstJoin).toBeLessThan(1);
    expect(geometry.secondJoin).toBeLessThan(1);
    expect(geometry.centerJoin).toBeLessThan(1);
    expect(geometry.maxLabelCenterDelta).toBeLessThan(1);
    expect(geometry.labelTops[0]).toBeLessThan(geometry.labelTops[1]!);
    expect(geometry.labelTops[1]).toBeLessThan(geometry.labelTops[2]!);
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
    expect(geometry.width).toBeLessThanOrEqual(761);

    if (viewport.width === 390) {
      expect(geometry.width).toBeGreaterThan(370);
    } else {
      expect(geometry.width).toBeGreaterThan(700);
    }

    await expect(page.locator(".entry-line")).toHaveCSS(
      "transition-duration",
      "0s",
    );
    await expect(page.locator(".form-outline path")).toHaveCSS(
      "transition-duration",
      "0s",
    );
  });
}

test("form retains the selected style after switching tabs and resizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#create").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "次のデザイン" }).click();
  const selected = page.locator('.theme-card.selected[data-theme-copy="1"]');
  const theme = await selected.getAttribute("data-theme-id");
  await page.getByRole("tab", { name: "URLから開く" }).click();
  await page.getByRole("tab", { name: "新しく作る" }).click();
  await expect(selected).toHaveAttribute("data-theme-id", theme!);
  const centerDistance = () =>
    selected.evaluate((element) => {
      const card = element.getBoundingClientRect();
      const carousel = element
        .closest(".theme-carousel")!
        .getBoundingClientRect();
      return Math.abs(
        card.left + card.width / 2 - carousel.left - carousel.width / 2,
      );
    });
  await expect.poll(centerDistance).toBeLessThan(2);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(centerDistance).toBeLessThan(2);
  await page.getByRole("switch", { name: "パスワードで保護する" }).check();
  await expect(page.getByLabel("編集用パスワード")).toBeVisible();
  await page.getByRole("switch", { name: "パスワードで保護する" }).uncheck();
  await expect(page.getByLabel("編集用パスワード")).toHaveCount(0);
  await page.locator(".btn-submit").click();
  await expect(page.locator("#title")).toBeFocused();
  await expect(page.locator("#title-error")).toBeVisible();
});

test("rapid smooth carousel navigation finishes at the requested sample", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".preview-area")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await selectMiddlePreview(page);
  const title = await page.locator(".shiori-preview.active h2").textContent();
  for (let step = 0; step < 20; step++)
    await page.getByRole("button", { name: "次のしおり", exact: true }).click();
  for (let step = 0; step < 20; step++)
    await page.getByRole("button", { name: "前のしおり", exact: true }).click();
  await expect(page.locator(".shiori-preview.active h2")).toHaveText(title!);
  await expect
    .poll(() =>
      page.locator(".shiori-preview.active").evaluate((element) => {
        const card = element.getBoundingClientRect();
        const track = element
          .closest(".preview-track")!
          .getBoundingClientRect();
        return Math.abs(
          card.left + card.width / 2 - track.left - track.width / 2,
        );
      }),
    )
    .toBeLessThan(2);
});

test("mobile navigation and the password switch work with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".preview-area")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const menu = page.getByRole("button", { name: "メニューを開閉" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "みんなのしおり", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.locator("#create").scrollIntoViewIfNeeded();
  const password = page.getByRole("switch", { name: "パスワードで保護する" });
  await password.focus();
  await page.keyboard.press("Space");
  await expect(password).toBeChecked();
  await expect(page.getByLabel("編集用パスワード")).toBeVisible();
});

test("the create anchor works before JavaScript is available", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".shiori-preview.active")).toBeInViewport();
  await page
    .locator(".hero-actions")
    .getByRole("link", { name: "しおりを作る" })
    .click();
  await expect(page.locator("#create")).toBeInViewport();
  await context.close();
});

test("preview loops in both directions and keeps background, color and accessible card in sync", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await selectMiddlePreview(page, 0);
  const springColor = await page
    .locator(".primary")
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(springColor).toBe("rgb(188, 79, 116)");
  await page.getByRole("button", { name: "前のしおり", exact: true }).click();
  await expect(page.locator(".preview-dots button").last()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".shiori-preview.active h2")).toHaveText(
    "秋の金沢 王道まち歩き",
  );
  await expect(page.locator(".primary")).not.toHaveCSS(
    "background-color",
    springColor,
  );
  for (let step = 0; step < 13; step++) {
    await page.getByRole("button", { name: "次のしおり", exact: true }).click();
    await expect(
      page.locator(".preview-dots button").nth(step % 6),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.locator(".shiori-preview.active h2")).toHaveText(
    "春の京都・宇治",
  );
  await expect(page.locator(".hero-picture img")).toHaveAttribute(
    "src",
    "/hero/background-spring.avif",
  );
  await expect(page.locator(".primary")).toHaveCSS(
    "background-color",
    springColor,
  );
  await expect(page.locator(".shiori-preview[tabindex='0']")).toHaveCount(1);
  await expect(
    page.locator(".shiori-preview[aria-hidden='false']"),
  ).toHaveCount(1);
  await expect
    .poll(() =>
      page.locator(".shiori-preview.active").evaluate((node) => {
        const a = node.getBoundingClientRect(),
          b = node.parentElement!.getBoundingClientRect();
        return Math.abs(a.left + a.width / 2 - b.left - b.width / 2);
      }),
    )
    .toBeLessThan(2);
  for (let step = 0; step < 13; step++) {
    await page.getByRole("button", { name: "前のしおり", exact: true }).click();
    await expect(
      page.locator(".preview-dots button").nth((5 - (step % 6) + 6) % 6),
    ).toHaveAttribute("aria-pressed", "true");
  }
});

test("hamburger and close icon share the exact button center", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".preview-area")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const menu = page.locator(".menu-button");
  for (const open of [false, true, false]) {
    if ((await menu.getAttribute("aria-expanded")) !== String(open))
      await menu.click();
    const delta = await menu.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const paths = Array.from(button.querySelectorAll("path"))
        .filter((p) => getComputedStyle(p).opacity !== "0")
        .map((p) => p.getBoundingClientRect());
      return {
        x: Math.abs(
          (Math.min(...paths.map((p) => p.left)) +
            Math.max(...paths.map((p) => p.right))) /
            2 -
            box.left -
            box.width / 2,
        ),
        y: Math.abs(
          (Math.min(...paths.map((p) => p.top)) +
            Math.max(...paths.map((p) => p.bottom))) /
            2 -
            box.top -
            box.height / 2,
        ),
      };
    });
    expect(delta.x).toBeLessThan(0.5);
    expect(delta.y).toBeLessThan(0.5);
    await page.screenshot({
      path: testInfo.outputPath(open ? "menu-open.png" : "menu-closed.png"),
    });
  }
});
