const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8787");
    await page.getByRole("heading", { name: "Today’s overview." }).waitFor();
    const close = () =>
      page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page
      .getByRole("button", { name: "Manage classes", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Manage classes", exact: true })
      .waitFor();
    await close();
    await page
      .getByRole("button", { name: "Find free times", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await close();
    const navigation = page.locator(
      width < 600 ? ".bottom-nav button" : ".main-nav button",
    );
    await navigation.nth(1).click();
    await page.getByRole("heading", { name: "Scan a student." }).waitFor();
    assert.equal(
      (await page.locator(".scanner-view").count()) > 0 ||
        (await page
          .getByRole("button", { name: "Open camera", exact: true })
          .count()) > 0,
      true,
    );
    await navigation.nth(2).click();
    await page.getByRole("heading", { name: "Your students." }).waitFor();
    await page
      .getByRole("button", { name: "New student", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await close();
    await page.locator(".student-cell").first().click();
    await page
      .getByRole("heading", { name: "Student profile", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "View student QR", exact: true })
      .click();
    await page.locator(".qr-canvas canvas").waitFor();
    await close();
    await navigation.nth(3).click();
    await page.getByRole("heading", { name: "Reports & insights." }).waitFor();
    await page.locator(".sync-button").click();
    await page.getByRole("button", { name: "Sync now", exact: true }).waitFor();
    await close();
    await page.screenshot({
      path: `work/refactor-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    console.log(
      `PASS ${width}px: four tabs, class management, free times, registration, profile, QR, sync dialog; no page errors or horizontal overflow.`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
