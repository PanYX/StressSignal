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

    await expect(page.getByRole("heading", { name: "Is risk starting to spread?", exact: true })).toBeVisible();
    await expect(page.getByText("Today's risk read")).toBeVisible();
    await expect(page.getByText("Data series: ", { exact: true })).toBeVisible();
    await expect(page.locator("meta[name='description']")).toHaveCount(1);
    await expect(page.getByText("Risk note:")).toBeVisible();
    await assertCanonicalPath(page, "/");

    await captureScreenshot("home", page, "smoke", testInfo);
  });

  test("indicator detail renders and range tabs switch", async ({ page }, testInfo) => {
    await page.goto("/indicators/vix");

    await expect(
      page.getByRole("heading", { name: /VIX detail/i }),
    ).toBeVisible();
    await expect(page.getByText("Range: 1Y")).toBeVisible();
    await expect(page.getByText("Data series: ", { exact: true })).toBeVisible();

    const rangeTab3m = page.locator("a[href*='range=3M']").first();
    await rangeTab3m.click();
    await expect(page).toHaveURL(/range=3M/);
    await expect(page.getByText("Range: 3M")).toBeVisible();
    await expect(page.getByText("Risk note:")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^VIX$/ })).toBeVisible();

    await captureScreenshot("indicator-vix", page, "smoke", testInfo);
  });

  test("articles list and detail include disclaimer marker", async ({ page }, testInfo) => {
    await page.goto("/articles");

    await expect(page.getByRole("heading", { name: "Risk notes" })).toBeVisible();
    await expect(page.getByRole("link", { name: /What VIX really measures/ })).toBeVisible();

    await page
      .getByRole("link", { name: /What VIX really measures/ })
      .click();
    await expect(page).toHaveURL(/\/articles\/what-is-vix(?:\?.*)?$/);

    await expect(page.getByRole("heading", { name: "What VIX really measures" })).toBeVisible();
    await expect(page.locator("article")).toContainText("Data note");
    await expect(page.locator('[data-testid="article-disclaimer-marker"]')).toBeVisible();
    await assertCanonicalPath(page, "/articles/what-is-vix");
    await expect(page.locator("meta[name='description']")).toHaveCount(1);

    await captureScreenshot("article-what-is-vix", page, "smoke", testInfo);
  });

  test("data source page opens and shows data series", async ({ page }, testInfo) => {
    await page.goto("/data-sources");

    await expect(page.getByRole("heading", { name: "Data sources" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Data series" })).toBeVisible();
    await expect(page.getByText("How data becomes indicators")).toBeVisible();
    await expect(page.getByText("Disclaimer:")).toBeVisible();

    await assertCanonicalPath(page, "/data-sources");
    await captureScreenshot("data-sources", page, "smoke", testInfo);
  });

  test("SEO tool pages render their live interpretation surfaces", async ({ page }, testInfo) => {
    await page.goto("/vix-term-structure");

    await expect(page.getByRole("heading", { name: "VIX Term Structure Today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "VIX/VIX3M proxy history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contango, backwardation and the volatility term structure" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Source trail" })).toBeVisible();
    await assertCanonicalPath(page, "/vix-term-structure");

    await captureScreenshot("vix-term-structure", page, "smoke", testInfo);

    await page.goto("/financial-conditions-index");

    await expect(page.getByRole("heading", { name: "Financial Conditions Index" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Financial conditions and stress history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Financial conditions are not the same as one-day market fear" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Source trail" })).toBeVisible();
    await assertCanonicalPath(page, "/financial-conditions-index");

    await captureScreenshot("financial-conditions-index", page, "smoke", testInfo);
  });
});

test("internal sync endpoint rejects requests without secret", async ({ request }) => {
  const response = await request.post("/api/internal/sync/fred");

  expect(response.status()).toBe(401);
  const payload = await response.json();
  expect(payload.error).toBe("unauthorized");
});
