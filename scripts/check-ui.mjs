const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
import assert from "node:assert/strict";
import {
  assertDialogFrame,
  assertResponsiveDialog,
} from "./assert-responsive-dialog.mjs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const viewports = [
    { width: 320, height: 568, phone: true },
    { width: 390, height: 844, phone: true },
    { width: 844, height: 390, phone: true },
    { width: 768, height: 1000, phone: false },
    { width: 1440, height: 1000, phone: false },
  ];
  for (const { width, height, phone } of viewports) {
    const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: phone,
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8787");
    await page.getByRole("heading", { name: "Today." }).waitFor();
    const panel = (name) => page.getByRole("dialog", { name, exact: true });
    const close = async (name) => {
      const active = name ? panel(name) : page.getByRole("dialog");
      await assertDialogFrame(active, phone);
      await active
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
    };
    async function openClasses() {
      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) await menu.click();
      await page
        .getByRole("button", { name: "Your classes", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Manage tutes", exact: true })
      .click();
    const tutes = panel("Manage tutes");
    await assertDialogFrame(tutes, phone);
    await assertResponsiveDialog(tutes);
    await tutes.locator(".tute-catalog summary").click();
    await assertDialogFrame(tutes, phone);
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
    await assertDialogFrame(panel("Edit class session"), phone);
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
    const free = panel("Find free slot");
    await assertDialogFrame(free, phone);
    const date = free.getByLabel("Date", { exact: true });
    const tomorrow = await date.evaluate((input) =>
      new Date(input.valueAsNumber + 86400000).toISOString().slice(0, 10),
    );
    await date.fill(tomorrow);
    await assertDialogFrame(free, phone);
    const duration = free.getByLabel("Lesson duration", { exact: true });
    await duration.selectOption("60");
    const slots = free.getByRole("combobox", {
      name: "Available times",
      exact: true,
    });
    const book = free.getByRole("button", {
      name: "Use time for extra class",
      exact: true,
    });
    assert.equal(await book.isEnabled(), false);
    if (phone) {
      await slots.selectOption({ index: 1 });
      assert.equal(await free.locator(".slot-list").isVisible(), false);
    } else {
      assert.equal(await slots.isVisible(), false);
      await free.locator(".slot-list button").first().click();
    }
    assert.equal(await book.isEnabled(), true);
    await assertDialogFrame(free, phone);
    await duration.selectOption("180");
    assert.equal(await book.isEnabled(), false);
    await assertResponsiveDialog(free);
    if (phone) {
      // A user can scroll to the booking action and still reach Close in place.
      const headingStayed = await free.evaluate((dialog) => {
        const body = dialog.querySelector(".modal-body");
        const close = dialog.querySelector('button[aria-label="Close dialog"]');
        const initialTop = close.getBoundingClientRect().top;
        body.scrollTop = body.scrollHeight;
        const { top, bottom } = close.getBoundingClientRect();
        return (
          top >= 0 && bottom <= innerHeight && Math.abs(initialTop - top) <= 1
        );
      });
      assert.equal(headingStayed, true);
    }
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
      `PASS ${width}×${height}: four tabs, dialog sizing and control overlap, date/duration and free slot selection, registration, profile, QR and sync.`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
