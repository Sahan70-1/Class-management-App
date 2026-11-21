const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
import assert from "node:assert/strict";
import { assertResponsiveDialog } from "./assert-responsive-dialog.mjs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8787");
    await page.getByRole("heading", { name: "Today." }).waitFor();
    const panel = (name) => page.getByRole("dialog", { name, exact: true });
    const close = (name) =>
      (name ? panel(name) : page.getByRole("dialog"))
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
    async function openClasses() {
      if (width <= 760)
        await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("button", { name: "Your classes", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Manage tutes", exact: true })
      .click();
    const tutes = panel("Manage tutes");
    await assertResponsiveDialog(tutes);
    await tutes.locator(".tute-catalog summary").click();
    await assertResponsiveDialog(tutes);
    await tutes.locator(".tute-catalog button").first().click();
    await tutes.locator(".tute-distribution summary").click();
    await assertResponsiveDialog(tutes);
    await close("Manage tutes");
    await openClasses();
    const classes = panel("Your classes");
    const manage = panel("Manage classes");
    await classes
      .getByRole("button", { name: "Manage classes", exact: true })
      .click();
    await assertResponsiveDialog(manage);
    await manage
      .getByRole("button", { name: "Edit", exact: true })
      .first()
      .click();
    await assertResponsiveDialog(panel("Edit class session"));
    await page.keyboard.press("Escape");
    await manage
      .getByRole("button", { name: "Edit class", exact: true })
      .first()
      .click();
    await close("Edit class");
    await close("Manage classes");
    await classes
      .getByRole("button", { name: "Find free slot", exact: true })
      .click();
    await assertResponsiveDialog(panel("Find free slot"));
    await close("Find free slot");
    const firstSession = classes
      .getByRole("button", { name: "Open", exact: true })
      .first();
    if (await firstSession.count()) {
      await firstSession.click();
      await close("Session overview");
    }
    await close("Your classes");
    const navigation = page.locator(".bottom-nav button");
    await navigation.nth(1).click();
    await page.getByRole("heading", { name: "Scan a student." }).waitFor();
    assert.equal(
      (await page.locator(".scanner-view").count()) > 0 ||
        (await page
          .getByRole("button", { name: "Start scanning", exact: true })
          .count()) > 0,
      true,
    );
    await navigation.nth(2).click();
    await page.getByRole("heading", { name: "Students." }).waitFor();
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
    await close("One student. One permanent QR.");
    await close("Student profile");
    await navigation.nth(3).click();
    await page.getByRole("heading", { name: "Reports." }).waitFor();
    for (const name of ["Attendance", "Monthly fees", "Tute distribution"]) {
      await page.getByRole("button", { name, exact: true }).click();
      const fits = await page
        .locator(".report-panel .table-scroll")
        .evaluate((el) => el.scrollWidth <= el.clientWidth);
      assert.ok(fits, name + " report should fit the viewport");
    }
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
