import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

const assertCanonicalPath = async (page: Page, expectedPath: string) => {
  const canonical = page.locator("link[rel='canonical']");
  await expect(canonical).toHaveCount(1);

  const expectedOrigin = new URL(page.url()).origin;
  const normalizedExpectedPath = expectedPath === "/" ? "" : expectedPath;
  await expect(canonical).toHaveAttribute(
    "href",
    `${expectedOrigin}${normalizedExpectedPath}`,
  );
};

const captureScreenshot = async (testName: string, page: Page, pathPrefix: string, testInfo: TestInfo) => {
  await page.screenshot({
    path: testInfo.outputPath(
      `${pathPrefix}-${testName.replace(/[^a-zA-Z0-9-_]/g, "_")}.png`,
    ),
    fullPage: true,
  });
};

test.describe("market risk dashboard smoke", () => {
  test("home summary and metadata are visible", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "现在风险在不在扩散？", exact: true })).toBeVisible();
    await expect(page.getByText("今日风险读数")).toBeVisible();
    await expect(page.getByText("数据序列：", { exact: true })).toBeVisible();
    await expect(page.locator("meta[name='description']")).toHaveCount(1);
    await expect(page.getByText("风险提示：")).toBeVisible();
    await assertCanonicalPath(page, "/");

    await captureScreenshot("home", page, "smoke", testInfo);
  });

  test("indicator detail renders and range tabs switch", async ({ page }, testInfo) => {
    await page.goto("/indicators/vix");

    await expect(
      page.getByRole("heading", { name: /VIX 指标详情|Vix 指标详情/i }),
    ).toBeVisible();
    await expect(page.getByText("当前范围：1Y")).toBeVisible();
    await expect(page.getByText("数据序列：", { exact: true })).toBeVisible();

    const rangeTab3m = page.locator("a[href*='range=3M']").first();
    await rangeTab3m.click();
    await expect(page).toHaveURL(/range=3M/);
    await expect(page.getByText("当前范围：3M")).toBeVisible();
    await expect(page.getByText("风险提示：")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^VIX$/ })).toBeVisible();

    await captureScreenshot("indicator-vix", page, "smoke", testInfo);
  });

  test("articles list and detail include disclaimer marker", async ({ page }, testInfo) => {
    await page.goto("/articles");

    await expect(page.getByRole("heading", { name: "风险笔记" })).toBeVisible();
    await expect(page.getByRole("link", { name: /什么是 VIX/ })).toBeVisible();

    await page
      .getByRole("link", { name: /什么是 VIX/ })
      .click();
    await expect(page).toHaveURL(/\/articles\/what-is-vix(?:\?.*)?$/);

    await expect(page.getByRole("heading", { name: "什么是 VIX：它到底在衡量什么" })).toBeVisible();
    await expect(page.locator("article")).toContainText("数据来源说明");
    await expect(page.locator('[data-testid="article-disclaimer-marker"]')).toBeVisible();
    await assertCanonicalPath(page, "/articles/what-is-vix");
    await expect(page.locator("meta[name='description']")).toHaveCount(1);

    await captureScreenshot("article-what-is-vix", page, "smoke", testInfo);
  });

  test("data source page opens and shows data series", async ({ page }, testInfo) => {
    await page.goto("/data-sources");

    await expect(page.getByRole("heading", { name: "数据来源" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "数据序列" })).toBeVisible();
    await expect(page.getByText("怎么核对这页")).toBeVisible();
    await expect(page.getByText("免责声明：")).toBeVisible();

    await assertCanonicalPath(page, "/data-sources");
    await captureScreenshot("data-sources", page, "smoke", testInfo);
  });
});

test("internal sync endpoint rejects requests without secret", async ({ request }) => {
  const response = await request.post("/api/internal/sync/fred");

  expect(response.status()).toBe(401);
  const payload = await response.json();
  expect(payload.error).toBe("unauthorized");
});
