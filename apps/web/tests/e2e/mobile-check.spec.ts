import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["iPhone 13"],
  defaultBrowserType: undefined,
});

test.describe("Responsive home page", () => {
  test("keeps the mobile hero readable and non-sticky", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );

    await expect(page.locator("h1")).toContainText("旅の予定を");
    await expect(page.locator(".hero-stage")).toBeVisible();
    await expect(page.locator(".shiori-preview.active")).toBeVisible();
    await expect(page.locator(".preview-photo")).toHaveCount(0);
    await expect(page.locator(".journey-section")).toBeVisible();
    await expect(page.locator(".create-section")).toBeVisible();

    const heroPosition = await page
      .locator(".hero-scene")
      .evaluate((element) => window.getComputedStyle(element).position);
    expect(heroPosition).toBe("relative");

    const viewport = page.viewportSize();
    const heroBox = await page.locator(".hero-stage").boundingBox();
    const journeyBox = await page.locator(".journey-section").boundingBox();
    expect(viewport).not.toBeNull();
    expect(heroBox).not.toBeNull();
    expect(journeyBox).not.toBeNull();
    expect(Math.abs(heroBox!.height - viewport!.height)).toBeLessThanOrEqual(1);
    expect(journeyBox!.y).toBeGreaterThanOrEqual(viewport!.height - 1);

    const menuBox = await page.locator(".menu-button").boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.width).toBeGreaterThanOrEqual(44);
    expect(menuBox!.height).toBeGreaterThanOrEqual(44);
  });

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
    { width: 1024, height: 800 },
    { width: 1100, height: 800 },
  ]) {
    test(`does not overflow horizontally at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.locator(".preview-area")).toHaveAttribute(
        "data-ready",
        "true",
      );

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth + 1,
      );

      if (viewport.width <= 1180) {
        const heroPosition = await page
          .locator(".hero-scene")
          .evaluate((element) => window.getComputedStyle(element).position);
        expect(heroPosition).toBe("relative");
      }
    });
  }

  test("does not prefetch alternate hero photos on data-saving connections", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true, effectiveType: "2g" },
      });
    });

    const heroImages = new Set<string>();
    page.on("request", (request) => {
      const url = request.url();
      if (
        /\/hero\/background-(spring|summer|autumn|winter)\.avif(?:\?|$)/.test(
          url,
        ) ||
        /\/itinerary-backgrounds\/(coastal-drive|japanese)\.avif(?:\?|$)/.test(
          url,
        )
      ) {
        heroImages.add(url.split("?")[0]!);
      }
    });

    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page.waitForTimeout(1200);

    expect([...heroImages]).toHaveLength(1);
  });

  test("uses a looping centered theme carousel and simple password control", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page.locator(".create-section").scrollIntoViewIfNeeded();

    const carousel = page.locator(".theme-carousel");
    const themeCards = page.locator('.theme-card[data-theme-copy="1"]');
    const allThemeCards = page.locator(".theme-card");
    await expect(carousel).toBeVisible();
    await expect(themeCards).toHaveCount(6);
    await expect(allThemeCards).toHaveCount(18);

    const planningCard = page.locator(
      '.theme-card[data-theme-copy="1"][data-theme-id="planning-draft"]',
    );
    await expect(planningCard).toHaveAttribute("aria-pressed", "true");

    const visualHierarchy = await page.evaluate(() => {
      const titleLabel = document.querySelector<HTMLElement>(
        ".title-group .form-label",
      );
      const designLabel = document.querySelector<HTMLElement>(
        ".theme-fieldset .form-label",
      );
      const passwordLabel = document.querySelector<HTMLElement>(
        ".toggle-setting strong",
      );
      const titleInput = document.querySelector<HTMLElement>(
        ".title-group .form-input",
      );
      const selectedTheme = document.querySelector<HTMLElement>(
        ".theme-card.selected",
      );

      if (
        !titleLabel ||
        !designLabel ||
        !passwordLabel ||
        !titleInput ||
        !selectedTheme
      ) {
        throw new Error("Create form hierarchy controls were not found");
      }

      return {
        titleLabelSize: parseFloat(getComputedStyle(titleLabel).fontSize),
        designLabelSize: parseFloat(getComputedStyle(designLabel).fontSize),
        passwordLabelSize: parseFloat(getComputedStyle(passwordLabel).fontSize),
        titleInputHeight: titleInput.getBoundingClientRect().height,
        themeCardHeight: selectedTheme.getBoundingClientRect().height,
      };
    });

    expect(visualHierarchy.titleLabelSize).toBeGreaterThan(
      visualHierarchy.designLabelSize,
    );
    expect(visualHierarchy.designLabelSize).toBeGreaterThan(
      visualHierarchy.passwordLabelSize,
    );
    expect(visualHierarchy.titleInputHeight).toBeGreaterThanOrEqual(54);
    expect(visualHierarchy.themeCardHeight).toBeLessThanOrEqual(100);

    // The card immediately to the left of the initial planning theme is the
    // trailing month theme from the previous copy.
    await carousel.evaluate((element) => {
      const card = element.querySelector<HTMLElement>(
        '[data-theme-copy="0"][data-theme-id="month"]',
      );
      if (!card) return;
      element.scrollLeft =
        card.offsetLeft - (element.clientWidth - card.clientWidth) / 2;
      element.dispatchEvent(new Event("scroll"));
    });

    const monthCard = page.locator(
      '.theme-card[data-theme-copy="1"][data-theme-id="month"]',
    );
    await expect(monthCard).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () =>
        carousel.evaluate((element) => {
          const card = element.querySelector<HTMLElement>(
            '[data-theme-copy="1"][data-theme-id="month"]',
          );
          if (!card) return Number.POSITIVE_INFINITY;
          const expectedLeft =
            card.offsetLeft - (element.clientWidth - card.clientWidth) / 2;
          return Math.abs(element.scrollLeft - expectedLeft);
        }),
      )
      .toBeLessThan(4);

    const listCard = page.locator(
      '.theme-card[data-theme-copy="1"][data-theme-id="list"]',
    );
    await carousel.evaluate((element) => {
      const card = element.querySelector<HTMLElement>(
        '[data-theme-copy="1"][data-theme-id="list"]',
      );
      if (!card) return;
      element.scrollLeft =
        card.offsetLeft - (element.clientWidth - card.clientWidth) / 2;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect(listCard).toHaveAttribute("aria-pressed", "true");

    const passwordSwitch = page.getByRole("switch", {
      name: "パスワードで保護する",
    });
    await expect(passwordSwitch).toBeAttached();
    await expect(passwordSwitch).toHaveAttribute("aria-checked", "false");
    await expect(
      page.getByText("編集する人だけにパスワードを共有します。"),
    ).toHaveCount(0);
    await expect(page.getByLabel("編集用パスワード")).toHaveCount(0);

    await passwordSwitch.check();
    await expect(page.getByLabel("編集用パスワード")).toBeVisible();

    await expect(page.getByLabel("次のデザイン")).toBeVisible();
    await expect(page.getByLabel("前のデザイン")).toBeVisible();
    await expect(
      page.getByText("計画を立てる", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("詳細設定")).toHaveCount(0);
  });

  test("renders the journey as one lightweight line-art story", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".journey-section").scrollIntoViewIfNeeded();

    await expect(page.locator(".journey-art")).toBeVisible();
    await expect(page.locator(".story-line")).toHaveCount(4);
    await expect(page.locator(".journey-step")).toHaveCount(0);
    await expect(page.getByText("旅をつくる。")).toBeVisible();
    await expect(page.getByText("URLで送る。")).toBeVisible();
    await expect(page.getByText("みんなで見る。", { exact: true })).toBeVisible();
  });

  test("keeps the intermediate hero in two columns", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );

    const display = await page
      .locator(".hero-main")
      .evaluate((element) => window.getComputedStyle(element).display);
    expect(display).toBe("grid");

    const copyBox = await page.locator(".hero-copy").boundingBox();
    const previewBox = await page.locator(".preview-area").boundingBox();
    expect(copyBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    expect(previewBox!.x).toBeGreaterThan(copyBox!.x + copyBox!.width * 0.65);
  });

  test("shows explicit creation and shared URL choices", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );

    await page.locator(".create-section").scrollIntoViewIfNeeded();
    await expect(page.getByRole("tab", { name: "新しく作る" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "URLから開く" })).toBeVisible();

    await page.getByRole("tab", { name: "URLから開く" }).click();
    await expect(page.getByLabel("しおりのURL")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /しおりを開く/ }),
    ).toBeVisible();
  });

  test("keeps text-entry controls at 16px to prevent iOS focus zoom", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".preview-area")).toHaveAttribute(
      "data-ready",
      "true",
    );

    const fontSizes = await page.evaluate(() => {
      const fixture = document.createElement("div");
      fixture.innerHTML = `
        <input data-control="text" type="text" style="font-size: 12px" />
        <input data-control="email" type="email" style="font-size: 12px" />
        <input data-control="date" type="date" style="font-size: 12px" />
        <textarea data-control="textarea" style="font-size: 12px"></textarea>
        <select data-control="select" style="font-size: 12px"><option>Option</option></select>
        <input data-control="checkbox" type="checkbox" style="font-size: 12px" />
      `;
      document.body.appendChild(fixture);

      return Object.fromEntries(
        Array.from(fixture.querySelectorAll<HTMLElement>("[data-control]")).map(
          (control) => [
            control.dataset.control,
            window.getComputedStyle(control).fontSize,
          ],
        ),
      );
    });

    expect(fontSizes).toMatchObject({
      text: "16px",
      email: "16px",
      date: "16px",
      textarea: "16px",
      select: "16px",
      checkbox: "12px",
    });
  });
});
