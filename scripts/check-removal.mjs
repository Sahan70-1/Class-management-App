// Run against the local production preview, using fictional data only.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import QRCode from "qrcode";
await mkdir("work", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
let pages = [];
try {
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
  pages = [a, b];
  const errors = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
  const read = (p, store, key) =>
    p.evaluate(
      ({ store, key }) =>
        new Promise((resolve) => {
          const r = indexedDB.open("classroom-v1");
          r.onsuccess = () => {
            const db = r.result,
              q =
                key === undefined
                  ? db.transaction(store).objectStore(store).getAll()
                  : db.transaction(store).objectStore(store).get(key);
            q.onsuccess = () => {
              db.close();
              resolve(q.result);
            };
          };
        }),
      { store, key },
    );
  const waitStudent = (p, removed) =>
    p.waitForFunction(
      ({ id, removed }) =>
        new Promise((resolve) => {
          const r = indexedDB.open("classroom-v1");
          r.onsuccess = () => {
            const db = r.result,
              q = db
                .transaction("records")
                .objectStore("records")
                .get("students:" + id);
            q.onsuccess = () => {
              db.close();
              resolve(!!q.result?.value.removedAt === removed);
            };
          };
        }),
      { id: "S-00002", removed },
    );
  const waitMerged = (p) =>
    p.waitForFunction(
      () =>
        new Promise((resolve) => {
          const r = indexedDB.open("classroom-v1");
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction(["outbox", "meta"]),
              q = tx.objectStore("outbox").count(),
              last = tx.objectStore("meta").get("lastSync");
            tx.oncomplete = () => {
              db.close();
              resolve(q.result === 0 && !!last.result);
            };
          };
        }),
    );
  const pull = async (p) => {
    const response = p.waitForResponse((r) => r.url().endsWith("/api/sync"));
    await p.evaluate(() => window.dispatchEvent(new Event("online")));
    const result = await (await response).json();
    await p.waitForFunction(
      (expected) =>
        new Promise((resolve) => {
          const r = indexedDB.open("classroom-v1");
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction(["records", "meta"]),
              records = tx.objectStore("records").getAll(),
              seq = tx.objectStore("meta").get("lastSeq");
            tx.oncomplete = () => {
              db.close();
              resolve(
                seq.result === expected.lastSeq &&
                  expected.records.every((r) =>
                    records.result.some(
                      (c) =>
                        c.entity === r.entity &&
                        c.key === r.key &&
                        c.revision >= r.revision,
                    ),
                  ),
              );
            };
          };
        }),
      result,
    );
    await waitMerged(p);
    return result;
  };
  await Promise.all([a, b].map((p) => p.goto("http://127.0.0.1:8787")));
  await Promise.all([a, b].map(waitMerged));
  await Promise.all([a, b].map(pull));
  const id = "S-00002";
  let initial = await read(a, "records", "students:" + id);
  await a.locator(".main-nav button").nth(2).click();
  if (initial.value.removedAt) {
    await a.getByLabel("Show removed students").check();
    await a
      .locator("tr")
      .filter({ hasText: id })
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await waitStudent(a, false);
    await waitMerged(a);
    await pull(b);
    initial = await read(a, "records", "students:" + id);
  }
  // Ensure a positive event cursor on a fresh local database without changing any domain behavior.
  if ((await read(b, "meta", "lastSeq")) === 0) {
    const warm = { ...initial.value, name: initial.value.name };
    await a.evaluate(async (value) => {
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSeq: 0,
          operations: [
            {
              id: crypto.randomUUID(),
              entity: "students",
              key: value.id,
              value,
              baseRevision: 1,
              revision: 2,
              at: new Date().toISOString(),
            },
          ],
        }),
      });
      if (!r.ok) throw Error("Warm-up sync failed");
    }, warm);
    await pull(a);
    await pull(b);
    initial = await read(a, "records", "students:" + id);
  }
  await a.getByLabel("Show removed students").uncheck();
  const previousHistory = (await read(b, "records")).filter((r) =>
    ["attendance", "fees", "issues"].includes(r.entity),
  );
  await a
    .locator(".student-cell")
    .filter({ hasText: initial.value.name })
    .click();
  await a.getByRole("button", { name: "Remove student", exact: true }).click();
  await a
    .getByRole("heading", {
      name: "Remove " + initial.value.name + "?",
      exact: true,
    })
    .waitFor();
  await a.getByRole("button", { name: "Keep student", exact: true }).click();
  await a.getByRole("button", { name: "Remove student", exact: true }).click();
  await contexts[0].setOffline(true);
  await a.getByRole("button", { name: "Confirm removal", exact: true }).click();
  const queued = await read(a, "outbox");
  assert.equal(queued.length, 1);
  assert.ok((await read(a, "records", "students:" + id)).value.removedAt);
  assert.equal(
    await a
      .locator(".student-cell")
      .filter({ hasText: initial.value.name })
      .count(),
    0,
  );
  assert.equal(
    (await read(b, "records", "students:" + id)).value.removedAt,
    undefined,
  );
  await a.reload();
  await a.getByRole("heading", { name: "Today’s overview." }).waitFor();
  assert.ok((await read(a, "records", "students:" + id)).value.removedAt);
  await a.locator(".main-nav button").nth(1).click();
  const png = await QRCode.toBuffer(
    JSON.stringify({ app: "classroom", v: 1, id }),
  );
  await a
    .locator("input[type=file]")
    .setInputFiles({ name: "removed.png", mimeType: "image/png", buffer: png });
  await a
    .getByText("This student has been removed.", { exact: true })
    .waitFor();
  assert.equal(
    await a
      .getByRole("button", { name: "Mark attendance", exact: true })
      .count(),
    0,
  );
  await contexts[0].setOffline(false);
  await pull(a);
  const delta = await pull(b);
  assert.equal(delta.full, false);
  assert.equal(delta.records.length, 1);
  assert.equal(delta.records[0].key, id);
  assert.ok((await read(b, "records", "students:" + id)).value.removedAt);
  assert.deepEqual(
    (await read(b, "records")).filter((r) =>
      ["attendance", "fees", "issues"].includes(r.entity),
    ),
    previousHistory,
  );
  await b.locator(".bottom-nav button").nth(2).click();
  assert.equal(
    await b
      .locator(".student-cell")
      .filter({ hasText: initial.value.name })
      .count(),
    0,
  );
  await b.getByLabel("Show removed students").check();
  const row = b.locator("tr").filter({ hasText: id });
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await waitStudent(b, false);
  await waitMerged(b);
  await pull(a);
  assert.equal(
    (await read(a, "records", "students:" + id)).value.removedAt,
    undefined,
  );
  const previewRole = async (role) => {
    await a.getByLabel("Workspace settings", { exact: true }).click();
    await a.getByLabel("Preview a role").selectOption(role);
    await a.getByRole("button", { name: "Close dialog", exact: true }).click();
  };
  await previewRole("staff");
  await a.locator(".main-nav button").nth(2).click();
  await a.getByRole("button", { name: "New student", exact: true }).waitFor();
  assert.equal(await a.getByLabel("Show removed students").count(), 0);
  await a
    .locator(".student-cell")
    .filter({ hasText: initial.value.name })
    .click();
  assert.equal(
    await a
      .getByRole("button", { name: "Remove student", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await a.getByRole("button", { name: "Edit student", exact: true }).count(),
    0,
  );
  await a.getByRole("button", { name: "Close dialog", exact: true }).click();
  await a.locator(".main-nav button").nth(0).click();
  await a.getByRole("button", { name: "Manage classes", exact: true }).click();
  await a.getByRole("button", { name: "Add class", exact: true }).click();
  await a.getByRole("dialog").getByRole("combobox").waitFor();
  await a.getByLabel("Class name", { exact: true }).waitFor();
  await a.getByLabel("Monthly fee (LKR)", { exact: true }).waitFor();
  await a.getByRole("button", { name: "Close dialog", exact: true }).click();
  await a.getByRole("button", { name: "Close dialog", exact: true }).click();
  await a.getByRole("button", { name: "Manage tutes", exact: true }).click();
  assert.equal(await a.getByLabel("Lesson title").isEnabled(), true);
  await a.getByRole("button", { name: "Close dialog", exact: true }).click();
  await previewRole("viewer");
  await a.locator(".main-nav button").nth(2).click();
  assert.equal(
    await a.getByRole("button", { name: "New student", exact: true }).count(),
    0,
  );
  assert.equal(await a.getByLabel("Show removed students").count(), 0);
  await previewRole("admin");
  await a.screenshot({ path: "work/removal-check.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: named confirmation/cancel, offline removal survives reload, removed QR blocked, one-record incremental propagation, history retained, admin restoration propagates back, staff setup controls and viewer restrictions.",
  );
} catch (error) {
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({
      path: `work/removal-failure-${i}.png`,
      fullPage: true,
    });
  }
  throw error;
} finally {
  await browser.close();
}
