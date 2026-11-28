import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

test("admin membership controls, device observations, and retained activity on removal and re-add", async () => {
  const admin = "tutor@example.com",
    staff = "staff@example.com",
    viewer = "viewer@example.com";
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: "dist/server/index.js",
      compatibilityDate: "2026-10-01",
      d1Databases: ["DB"],
      bindings: { INITIAL_ADMIN_EMAIL: admin, SEED_DEMO: "true" },
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    );
    for (const entry of journal.entries) {
      const sql = await readFile("drizzle/" + entry.tag + ".sql", "utf8");
      await db.batch(
        sql
          .split("--> statement-breakpoint")
          .map((s: string) => db.prepare(s.trim())),
      );
      if (entry.idx === 0) {
        await db
          .prepare("INSERT INTO members(email,role,created_at) VALUES(?,?,?)")
          .bind(admin, "admin", "2026-11-01T00:00:00.000Z")
          .run();
      }
    }
    async function request(
      path: string,
      method: string,
      email?: string,
      body?: unknown,
      extraHeaders = {},
    ) {
      const response = await mf.dispatchFetch("https://school.example" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(email ? { "oai-authenticated-user-email": email } : {}),
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: (await response.json()) as any };
    }
    const manage = (method: string, actor: string, body?: unknown) =>
      request("/api/members", method, actor, body);
    const roster = async () =>
      (await manage("GET", admin)).data as {
        email: string;
        role: string;
        devices: { label: string; lastSeen: string }[];
      }[];
    const sync = (email: string, headers = {}, operations: unknown[] = []) =>
      request("/api/sync", "POST", email, { operations }, headers);
    assert.deepEqual(await roster(), [
      { email: admin, role: "admin", devices: [] },
    ]);
    assert.equal((await request("/api/members", "GET")).status, 401);
    assert.equal(
      (await manage("DELETE", admin, { email: admin.toUpperCase() })).status,
      400,
    );
    assert.equal(
      (await manage("POST", admin, { email: admin, role: "viewer" })).status,
      400,
    );
    assert.equal(
      (await manage("POST", admin, { email: staff, role: "staff" })).status,
      200,
    );
    assert.equal(
      (await manage("POST", admin, { email: viewer, role: "viewer" })).status,
      200,
    );
    for (const member of [staff, viewer]) {
      assert.equal((await manage("GET", member)).status, 403);
      assert.equal(
        (await manage("DELETE", member, { email: staff })).status,
        403,
      );
    }
    assert.equal(
      (await manage("POST", admin, { email: staff, role: "viewer" })).status,
      200,
    );
    assert.equal(
      (await roster()).find((m) => m.email === staff)?.role,
      "viewer",
    );
    await manage("POST", admin, { email: staff, role: "staff" });
    await sync(admin);
    const device = crypto.randomUUID();
    const headers = {
      "X-Classroom-Device": device,
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/130.0.0.0 Mobile Safari/537.36",
    };
    const op = {
      id: crypto.randomUUID(),
      entity: "tutes",
      key: "grade-9@2028-04",
      baseRevision: 0,
      value: {
        id: "grade-9@2028-04",
        classId: "grade-9",
        month: "2028-04",
        title: "Vectors",
      },
    };
    const changedAccount = await sync(
      staff,
      { ...headers, "X-Classroom-Account": viewer },
      [op],
    );
    assert.equal(changedAccount.status, 409);
    assert.equal(changedAccount.data.code, "WORKSPACE_ACCOUNT_CHANGED");
    assert.deepEqual(
      (await roster()).find((m) => m.email === staff)?.devices,
      [],
    );
    assert.deepEqual(
      (await sync(staff, { ...headers, "X-Classroom-Account": staff }, [op]))
        .data.accepted,
      [op.id],
    );
    const first = (await roster()).find((m) => m.email === staff)!.devices;
    assert.equal(first.length, 1);
    assert.equal(first[0].label, "Chrome · Android");
    assert.equal(new Date(first[0].lastSeen).toISOString(), first[0].lastSeen);
    await sync(staff, headers);
    await sync(staff, { "X-Classroom-Device": "bad id" });
    assert.deepEqual(
      (await roster()).find((m) => m.email === staff)!.devices,
      first,
    );
    await db
      .prepare("UPDATE member_devices SET last_seen='2026-01-01T00:00:00.000Z'")
      .run();
    await sync(staff, headers);
    const refreshed = (await roster()).find((m) => m.email === staff)!.devices;
    assert.ok(refreshed[0].lastSeen >= first[0].lastSeen);
    const otherBrowser = {
      "X-Classroom-Device": crypto.randomUUID(),
      "User-Agent":
        "Mozilla/5.0 (iPhone) AppleWebKit Version/18.2 Mobile Safari/604.1",
    };
    await sync(staff, otherBrowser);
    const devices = (await roster()).find((m) => m.email === staff)!.devices;
    assert.equal(devices.length, 2);
    assert.deepEqual(devices.map((d) => d.label).sort(), [
      "Chrome · Android",
      "Safari · iOS",
    ]);
    assert.deepEqual(Object.keys(devices[0]).sort(), ["label", "lastSeen"]);
    assert.equal(
      (
        await manage("DELETE", admin, {
          email: " " + staff.toUpperCase() + " ",
        })
      ).status,
      200,
    );
    assert.equal(
      (await roster()).some((m) => m.email === staff),
      false,
    );
    assert.equal(
      (await sync(staff, headers)).data.code,
      "NOT_A_WORKSPACE_MEMBER",
    );
    const remaining = (await sync(admin)).data;
    assert.ok(remaining.records.some((r: any) => r.key === op.key));
    assert.ok(
      remaining.history.some((r: any) => r.id === op.id && r.actor === staff),
    );
    assert.equal(
      (await manage("POST", admin, { email: staff, role: "admin" })).status,
      200,
    );
    assert.deepEqual(
      (await roster()).find((m) => m.email === staff)!.devices,
      [],
    );
    // Two administrators removing each other concurrently must leave one administrator.
    const concurrent = await Promise.all([
      manage("DELETE", staff, { email: admin }),
      manage("DELETE", admin, { email: staff }),
    ]);
    assert.equal(concurrent.filter((r) => r.status === 200).length, 1);
    assert.equal(
      (
        await db
          .prepare("SELECT COUNT(*) AS n FROM members WHERE role='admin'")
          .first()
      )?.n,
      1,
    );
  } finally {
    await mf.dispose();
  }
});
